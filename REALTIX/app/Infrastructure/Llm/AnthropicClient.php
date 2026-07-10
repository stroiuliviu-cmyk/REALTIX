<?php

declare(strict_types=1);

namespace App\Infrastructure\Llm;

use App\Domain\Assistant\Contracts\LlmClient;
use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Psr\Http\Message\StreamInterface;

/**
 * Anthropic Messages API client (streaming + tool use) over Laravel's HTTP
 * client — raw HTTP by explicit design so the SSE stream can be faked with
 * Http::fake() in tests and the retry policy stays under our control.
 *
 *  - POST /v1/messages with stream:true; api key from services.anthropic,
 *    models/limits from config/assistant.php. The key is never hardcoded.
 *  - Parses the Anthropic SSE stream and yields the NORMALIZED events from
 *    the LlmClient contract. Tool input arrives as input_json_delta fragments
 *    and is accumulated per block index, then parsed at content_block_stop.
 *  - Retries 429/5xx/connection errors with exponential backoff; every
 *    failure surfaces as a {type:'error'} event, never a raw exception.
 */
final class AnthropicClient implements LlmClient
{
    private const ENDPOINT = 'https://api.anthropic.com/v1/messages';

    /** {@inheritDoc} */
    public function createStream(
        string $system,
        array $messages,
        array $tools,
        string $model,
        int $maxTokens,
    ): Generator {
        $payload = [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'messages' => $messages,
            'stream' => true,
        ];
        if ($system !== '') {
            $payload['system'] = $system;
        }
        if ($tools !== []) {
            $payload['tools'] = $tools;
        }

        $response = yield from $this->requestWithRetry($payload);
        if ($response === null) {
            return; // the error event was already yielded by requestWithRetry()
        }

        yield from $this->parseStream($response->toPsrResponse()->getBody());
    }

    /**
     * POST with exponential backoff on 429/5xx/connection errors.
     * Returns null after yielding a {type:'error'} event when giving up.
     *
     * @param array<string,mixed> $payload
     */
    private function requestWithRetry(array $payload): Generator
    {
        $maxAttempts = max(1, (int) config('assistant.retry.max_attempts', 3));
        $baseDelayMs = max(0, (int) config('assistant.retry.base_delay_ms', 500));

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $this->pendingRequest()->post(self::ENDPOINT, $payload);
            } catch (ConnectionException $e) {
                if ($attempt === $maxAttempts) {
                    yield ['type' => 'error', 'status' => null, 'message' => 'Conexiunea către Anthropic a eșuat: ' . $e->getMessage()];

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

        return null; // unreachable, keeps static analysis happy
    }

    private function pendingRequest(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'x-api-key' => (string) config('services.anthropic.api_key'),
            'anthropic-version' => (string) config('assistant.anthropic_version', '2023-06-01'),
            'accept' => 'text/event-stream',
        ])
            ->timeout((int) config('assistant.timeout', 120))
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
        $apiMessage = null;
        $body = json_decode((string) $response->body(), true);
        if (is_array($body)) {
            $apiMessage = $body['error']['message'] ?? null;
        }

        return "Anthropic API a răspuns cu status {$status}"
            . ($apiMessage ? ": {$apiMessage}" : '.');
    }

    /**
     * Parse the Anthropic SSE stream into normalized events.
     *
     * Event flow (per docs): message_start (usage.input_tokens) →
     * content_block_start (tool_use: id+name) → content_block_delta
     * (text_delta → text; input_json_delta → accumulate partial_json) →
     * content_block_stop (parse accumulated tool input) → message_delta
     * (stop_reason + usage.output_tokens) → message_stop.
     */
    private function parseStream(StreamInterface $body): Generator
    {
        $tokensIn = 0;
        $tokensOut = 0;
        $stopReason = null;
        /** @var array<int,array{id:string,name:string,json:string}> $toolBlocks */
        $toolBlocks = [];

        foreach ($this->sseData($body) as $data) {
            switch ($data['type'] ?? '') {
                case 'message_start':
                    $tokensIn = (int) ($data['message']['usage']['input_tokens'] ?? 0);
                    $tokensOut = (int) ($data['message']['usage']['output_tokens'] ?? 0);
                    break;

                case 'content_block_start':
                    $block = $data['content_block'] ?? [];
                    if (($block['type'] ?? '') === 'tool_use') {
                        $toolBlocks[(int) ($data['index'] ?? 0)] = [
                            'id' => (string) ($block['id'] ?? ''),
                            'name' => (string) ($block['name'] ?? ''),
                            'json' => '',
                        ];
                    }
                    break;

                case 'content_block_delta':
                    $delta = $data['delta'] ?? [];
                    $index = (int) ($data['index'] ?? 0);
                    if (($delta['type'] ?? '') === 'text_delta') {
                        $text = (string) ($delta['text'] ?? '');
                        if ($text !== '') {
                            yield ['type' => 'text', 'text' => $text];
                        }
                    } elseif (($delta['type'] ?? '') === 'input_json_delta' && isset($toolBlocks[$index])) {
                        // The tool input arrives as partial JSON fragments —
                        // ACCUMULATE here, parse only at content_block_stop.
                        $toolBlocks[$index]['json'] .= (string) ($delta['partial_json'] ?? '');
                    }
                    break;

                case 'content_block_stop':
                    $index = (int) ($data['index'] ?? 0);
                    if (isset($toolBlocks[$index])) {
                        $tool = $toolBlocks[$index];
                        unset($toolBlocks[$index]);

                        $input = $tool['json'] === '' ? [] : json_decode($tool['json'], true);
                        if (! is_array($input)) {
                            yield [
                                'type' => 'error',
                                'message' => "Input JSON invalid pentru unealta '{$tool['name']}'.",
                            ];
                            $input = [];
                        }

                        yield ['type' => 'tool_use', 'id' => $tool['id'], 'name' => $tool['name'], 'input' => $input];
                    }
                    break;

                case 'message_delta':
                    $stopReason = $data['delta']['stop_reason'] ?? $stopReason;
                    $tokensOut = (int) ($data['usage']['output_tokens'] ?? $tokensOut);
                    break;

                case 'message_stop':
                    yield ['type' => 'usage', 'tokensIn' => $tokensIn, 'tokensOut' => $tokensOut];
                    yield ['type' => 'stop', 'reason' => (string) ($stopReason ?? 'end_turn')];

                    return;

                case 'error':
                    // In-stream API error (e.g. overloaded_error mid-stream).
                    yield [
                        'type' => 'error',
                        'message' => (string) ($data['error']['message'] ?? 'Eroare în stream-ul Anthropic.'),
                    ];
                    break;

                    // 'ping' and unknown event types are intentionally ignored.
            }
        }

        // Stream ended without message_stop (connection cut) — surface what we know.
        yield ['type' => 'usage', 'tokensIn' => $tokensIn, 'tokensOut' => $tokensOut];
        yield ['type' => 'stop', 'reason' => (string) ($stopReason ?? 'incomplete')];
    }

    /**
     * Low-level SSE reader: buffers the PSR stream, splits it into lines and
     * yields the decoded JSON payload of every `data:` line. `event:` lines,
     * comments and blank lines carry no extra information (the payload's
     * `type` field duplicates the event name) and are skipped.
     *
     * @return Generator<int,array<string,mixed>>
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

        // Flush a trailing line without newline terminator.
        $decoded = $this->decodeDataLine(rtrim($buffer, "\r"));
        if ($decoded !== null) {
            yield $decoded;
        }
    }

    /** @return array<string,mixed>|null */
    private function decodeDataLine(string $line): ?array
    {
        if (! str_starts_with($line, 'data:')) {
            return null;
        }
        $decoded = json_decode(trim(substr($line, 5)), true);

        return is_array($decoded) ? $decoded : null;
    }
}
