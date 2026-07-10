<?php

declare(strict_types=1);

namespace App\Infrastructure\Llm;

use App\Domain\Assistant\Contracts\LlmClient;
use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Psr\Http\Message\StreamInterface;

/**
 * Groq LLM client (OpenAI-compatible Chat Completions) — the free alternative
 * to AnthropicClient. Implements the SAME LlmClient contract and emits the
 * SAME normalized events (text|tool_use|usage|stop|error), so ChatService and
 * the tool layer cannot tell the providers apart.
 *
 * Two translation layers:
 *  - REQUEST: our Anthropic-style inputs (system string, content-block
 *    messages, {name, description, input_schema} tools) are translated into
 *    OpenAI Chat Completions shape (role:system/user/assistant/tool messages,
 *    {type:'function'} tools, tool_calls with JSON-string arguments).
 *  - RESPONSE: the OpenAI SSE stream (`data: {json}` chunks + `data: [DONE]`)
 *    is parsed back into normalized events; fragmented tool_call arguments are
 *    accumulated per index and parsed only at finish.
 *
 * Note: Groq runs ONE configured model (assistant.groq.model) for both hops —
 * the $model argument carries an Anthropic id and is intentionally ignored.
 */
final class GroqClient implements LlmClient
{
    /** {@inheritDoc} */
    public function createStream(
        string $system,
        array $messages,
        array $tools,
        string $model,
        int $maxTokens,
    ): Generator {
        $translated = $this->translateMessages($system, $messages);

        $payload = [
            'model' => (string) config('assistant.groq.model', 'openai/gpt-oss-120b'),
            'max_tokens' => (int) (config('assistant.groq.max_tokens') ?: $maxTokens),
            'messages' => $translated,
            'stream' => true,
            'stream_options' => ['include_usage' => true],
        ];
        if ($tools !== []) {
            $payload['tools'] = $this->translateTools($tools);

            // Hop-ul de răspuns: ultimul mesaj e un tool_result proaspăt livrat.
            // gpt-oss alege uneori să mai ceară o unealtă aici (nedeterminist),
            // iar orchestratorul cu 2 hop-uri ignoră tool_use în hop 2 → răspuns
            // gol. tool_choice:'none' îl obligă să scrie textul final.
            if (($translated[array_key_last($translated)]['role'] ?? '') === 'tool') {
                $payload['tool_choice'] = 'none';
            }
        }

        $response = yield from $this->requestWithRetry($payload);
        if ($response === null) {
            return; // the error event was already yielded by requestWithRetry()
        }

        yield from $this->parseStream($response->toPsrResponse()->getBody());
    }

    // ---------------------------------------------------------------- request

    /**
     * Anthropic-style messages → OpenAI Chat Completions messages.
     *
     *  system string            → {role:'system', content}
     *  user text blocks         → {role:'user', content}
     *  assistant text blocks    → {role:'assistant', content}
     *  assistant tool_use       → {role:'assistant', content:null, tool_calls:[
     *                               {id, type:'function', function:{name, arguments:json}}]}
     *  user tool_result blocks  → one {role:'tool', tool_call_id, content} each
     *
     * @param list<array{role:string,content:mixed}> $messages
     * @return list<array<string,mixed>>
     */
    private function translateMessages(string $system, array $messages): array
    {
        $out = [];
        if ($system !== '') {
            $out[] = ['role' => 'system', 'content' => $system];
        }

        foreach ($messages as $message) {
            $role = (string) ($message['role'] ?? 'user');
            $blocks = is_array($message['content']) ? $message['content'] : [['type' => 'text', 'text' => (string) $message['content']]];

            $texts = [];
            $toolCalls = [];

            foreach ($blocks as $block) {
                if (! is_array($block)) {
                    continue;
                }
                switch ($block['type'] ?? 'text') {
                    case 'text':
                        $texts[] = (string) ($block['text'] ?? '');
                        break;

                    case 'tool_use':
                        $toolCalls[] = [
                            'id' => (string) ($block['id'] ?? ''),
                            'type' => 'function',
                            'function' => [
                                'name' => (string) ($block['name'] ?? ''),
                                'arguments' => (string) json_encode($block['input'] ?? [], JSON_UNESCAPED_UNICODE),
                            ],
                        ];
                        break;

                    case 'tool_result':
                        // fiecare tool_result devine propriul mesaj role:'tool'
                        $out[] = [
                            'role' => 'tool',
                            'tool_call_id' => (string) ($block['tool_use_id'] ?? ''),
                            'content' => is_string($block['content'] ?? null)
                                ? $block['content']
                                : (string) json_encode($block['content'] ?? '', JSON_UNESCAPED_UNICODE),
                        ];
                        break;
                }
            }

            if ($toolCalls !== []) {
                $out[] = [
                    'role' => 'assistant',
                    'content' => $texts === [] ? null : implode('', $texts),
                    'tool_calls' => $toolCalls,
                ];
            } elseif ($texts !== []) {
                $out[] = ['role' => $role, 'content' => implode('', $texts)];
            }
        }

        return $out;
    }

    /**
     * Anthropic tool defs → OpenAI function tools.
     * {name, description, input_schema} → {type:'function', function:{name, description, parameters}}
     *
     * @param list<array<string,mixed>> $tools
     * @return list<array<string,mixed>>
     */
    private function translateTools(array $tools): array
    {
        return array_map(static fn (array $tool): array => [
            'type' => 'function',
            'function' => [
                'name' => (string) ($tool['name'] ?? ''),
                'description' => (string) ($tool['description'] ?? ''),
                'parameters' => $tool['input_schema'] ?? ['type' => 'object', 'properties' => []],
            ],
        ], $tools);
    }

    /**
     * POST cu backoff exponențial pe 429/5xx/rețea (identic ca politică cu
     * AnthropicClient). Întoarce null după ce a emis un eveniment {type:'error'}.
     *
     * @param array<string,mixed> $payload
     */
    private function requestWithRetry(array $payload): Generator
    {
        $maxAttempts = max(1, (int) config('assistant.groq.retry.max_attempts', 3));
        $baseDelayMs = max(0, (int) config('assistant.groq.retry.base_delay_ms', 500));
        $url = rtrim((string) config('assistant.groq.base_url', 'https://api.groq.com/openai/v1'), '/') . '/chat/completions';

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $this->pendingRequest()->post($url, $payload);
            } catch (ConnectionException $e) {
                if ($attempt === $maxAttempts) {
                    yield ['type' => 'error', 'status' => null, 'message' => 'Conexiunea către Groq a eșuat: ' . $e->getMessage()];

                    return null;
                }
                $this->backoff($baseDelayMs, $attempt);
                continue;
            }

            if ($response->successful()) {
                return $response;
            }

            $status = $response->status();
            $retryable = $status === 429 || $status >= 500;

            if (! $retryable || $attempt === $maxAttempts) {
                yield ['type' => 'error', 'status' => $status, 'message' => $this->httpErrorMessage($response)];

                return null;
            }

            $this->backoff($baseDelayMs, $attempt);
        }

        return null; // unreachable
    }

    private function pendingRequest(): PendingRequest
    {
        return Http::withHeaders([
            'Authorization' => 'Bearer ' . (string) config('services.groq.api_key'),
            'accept' => 'text/event-stream',
        ])
            ->timeout((int) config('assistant.groq.timeout', 120))
            ->withOptions(['stream' => true]);
    }

    private function backoff(int $baseDelayMs, int $attempt): void
    {
        $delayMs = $baseDelayMs * (2 ** ($attempt - 1));
        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }
    }

    private function httpErrorMessage(Response $response): string
    {
        $status = $response->status();
        $body = json_decode((string) $response->body(), true);
        $apiMessage = is_array($body) ? ($body['error']['message'] ?? null) : null;

        return "Groq API a răspuns cu status {$status}" . ($apiMessage ? ": {$apiMessage}" : '.');
    }

    // --------------------------------------------------------------- response

    /**
     * OpenAI SSE stream → normalized events.
     *
     *  choices[0].delta.content          → {type:'text'}
     *  choices[0].delta.tool_calls[]     → ACUMULATE per index (id/name o dată,
     *                                      arguments concatenat), parsate și emise
     *                                      ca {type:'tool_use'} la finish_reason
     *  usage (ultimul chunk, include_usage) → reținut; emis înainte de stop
     *  finish_reason                     → 'tool_calls'→tool_use, 'stop'→end_turn,
     *                                      'length'→max_tokens
     *  data: [DONE]                      → {type:'usage'} + {type:'stop'}
     */
    private function parseStream(StreamInterface $body): Generator
    {
        $tokensIn = 0;
        $tokensOut = 0;
        $stopReason = null;
        /** @var array<int,array{id:string,name:string,arguments:string}> $toolCalls */
        $toolCalls = [];
        $finished = false;

        foreach ($this->sseData($body) as $data) {
            if ($data === '[DONE]') {
                $finished = true;
                break;
            }
            if (! is_array($data)) {
                continue;
            }

            // eroare in-stream (formatul OpenAI: {error:{message,...}})
            if (isset($data['error'])) {
                yield ['type' => 'error', 'status' => null, 'message' => (string) ($data['error']['message'] ?? 'Eroare în stream-ul Groq.')];
                continue;
            }

            // chunk-ul final de usage poate veni cu choices gol
            if (isset($data['usage']) && is_array($data['usage'])) {
                $tokensIn = (int) ($data['usage']['prompt_tokens'] ?? $tokensIn);
                $tokensOut = (int) ($data['usage']['completion_tokens'] ?? $tokensOut);
            }

            $choice = $data['choices'][0] ?? null;
            if (! is_array($choice)) {
                continue;
            }

            $delta = $choice['delta'] ?? [];

            $text = $delta['content'] ?? null;
            if (is_string($text) && $text !== '') {
                yield ['type' => 'text', 'text' => $text];
            }

            foreach ((array) ($delta['tool_calls'] ?? []) as $fragment) {
                if (! is_array($fragment)) {
                    continue;
                }
                $index = (int) ($fragment['index'] ?? 0);
                $toolCalls[$index] ??= ['id' => '', 'name' => '', 'arguments' => ''];
                if (! empty($fragment['id'])) {
                    $toolCalls[$index]['id'] = (string) $fragment['id'];
                }
                if (! empty($fragment['function']['name'])) {
                    $toolCalls[$index]['name'] = (string) $fragment['function']['name'];
                }
                // argumentele vin fragmentate — DOAR concatenăm; parsăm la finish
                $toolCalls[$index]['arguments'] .= (string) ($fragment['function']['arguments'] ?? '');
            }

            $finish = $choice['finish_reason'] ?? null;
            if (is_string($finish) && $finish !== '') {
                $stopReason = match ($finish) {
                    'tool_calls' => 'tool_use',
                    'length' => 'max_tokens',
                    default => 'end_turn', // 'stop' și restul
                };

                // la finish emitem tool_use-urile complet asamblate
                ksort($toolCalls);
                foreach ($toolCalls as $call) {
                    $input = $call['arguments'] === '' ? [] : json_decode($call['arguments'], true);
                    if (! is_array($input)) {
                        yield ['type' => 'error', 'status' => null, 'message' => "Argumente JSON invalide pentru unealta '{$call['name']}'."];
                        $input = [];
                    }
                    yield ['type' => 'tool_use', 'id' => $call['id'], 'name' => $call['name'], 'input' => $input];
                }
                $toolCalls = [];
            }
        }

        yield ['type' => 'usage', 'tokensIn' => $tokensIn, 'tokensOut' => $tokensOut];
        yield ['type' => 'stop', 'reason' => (string) ($stopReason ?? ($finished ? 'end_turn' : 'incomplete'))];
    }

    /**
     * Cititor SSE low-level: liniile `data:` decodate ca JSON; santinela
     * `[DONE]` este propagată ca string literal.
     *
     * @return Generator<int,array<string,mixed>|string>
     */
    private function sseData(StreamInterface $body): Generator
    {
        $buffer = '';

        while (! $body->eof()) {
            $chunk = $body->read(8192);
            if ($chunk === '') {
                break;
            }
            $buffer .= $chunk;

            while (($pos = strpos($buffer, "\n")) !== false) {
                $line = rtrim(substr($buffer, 0, $pos), "\r");
                $buffer = substr($buffer, $pos + 1);

                $decoded = $this->decodeDataLine($line);
                if ($decoded !== null) {
                    yield $decoded;
                }
            }
        }

        $decoded = $this->decodeDataLine(rtrim($buffer, "\r"));
        if ($decoded !== null) {
            yield $decoded;
        }
    }

    /** @return array<string,mixed>|string|null */
    private function decodeDataLine(string $line): array|string|null
    {
        if (! str_starts_with($line, 'data:')) {
            return null;
        }
        $payload = trim(substr($line, 5));
        if ($payload === '[DONE]') {
            return '[DONE]';
        }
        $decoded = json_decode($payload, true);

        return is_array($decoded) ? $decoded : null;
    }
}
