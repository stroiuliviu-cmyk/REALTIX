<?php

declare(strict_types=1);

use App\Infrastructure\Llm\GroqClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/** Build an OpenAI-style SSE body: `data: {json}` chunks + `data: [DONE]`. */
function openAiSse(array $chunks): string
{
    $body = implode('', array_map(
        fn (array $c): string => 'data: ' . json_encode($c) . "\n\n",
        $chunks,
    ));

    return $body . "data: [DONE]\n\n";
}

/** A complete text-only OpenAI stream (usage 25 in / 42 out, finish stop). */
function groqTextOnlySse(): string
{
    return openAiSse([
        ['id' => 'c1', 'choices' => [['index' => 0, 'delta' => ['role' => 'assistant', 'content' => ''], 'finish_reason' => null]]],
        ['id' => 'c1', 'choices' => [['index' => 0, 'delta' => ['content' => 'Salut, '], 'finish_reason' => null]]],
        ['id' => 'c1', 'choices' => [['index' => 0, 'delta' => ['content' => 'lume!'], 'finish_reason' => null]]],
        ['id' => 'c1', 'choices' => [['index' => 0, 'delta' => [], 'finish_reason' => 'stop']]],
        // chunk-ul final de usage (stream_options.include_usage) — choices gol
        ['id' => 'c1', 'choices' => [], 'usage' => ['prompt_tokens' => 25, 'completion_tokens' => 42]],
    ]);
}

/** @return list<array<string,mixed>> */
function groqStream(array $messages = [['role' => 'user', 'content' => [['type' => 'text', 'text' => 'Salut']]]], array $tools = []): array
{
    $client = new GroqClient();

    return iterator_to_array($client->createStream(
        system: 'Ești asistentul REALTIX.',
        messages: $messages,
        tools: $tools,
        model: 'claude-haiku-4-5', // id Anthropic — ignorat intenționat de GroqClient
        maxTokens: 1024,
    ), false);
}

beforeEach(function () {
    config([
        'services.groq.api_key' => 'gsk-test-key',
        'assistant.groq.base_url' => 'https://api.groq.com/openai/v1',
        'assistant.groq.model' => 'openai/gpt-oss-120b',
        'assistant.groq.max_tokens' => 512,
        'assistant.groq.retry.base_delay_ms' => 0,
        'assistant.groq.retry.max_attempts' => 3,
    ]);
});

it('streams a text-only response as text events + usage + stop end_turn', function () {
    Http::fake(['api.groq.com/*' => Http::response(groqTextOnlySse(), 200)]);

    $events = groqStream();
    $types = array_column($events, 'type');

    expect($types)->toBe(['text', 'text', 'usage', 'stop'])
        ->and($events[0]['text'] . $events[1]['text'])->toBe('Salut, lume!')
        ->and($events[2]['tokensIn'])->toBe(25)
        ->and($events[2]['tokensOut'])->toBe(42)
        ->and($events[3]['reason'])->toBe('end_turn');
});

it('assembles a tool_use input from fragmented tool_calls arguments', function () {
    Http::fake(['api.groq.com/*' => Http::response(openAiSse([
        // id + name în primul fragment; arguments gol
        ['choices' => [['index' => 0, 'delta' => ['tool_calls' => [
            ['index' => 0, 'id' => 'call_abc', 'type' => 'function', 'function' => ['name' => 'search_listings', 'arguments' => '']],
        ]], 'finish_reason' => null]]],
        // arguments fragmentate pe mai multe delta-uri
        ['choices' => [['index' => 0, 'delta' => ['tool_calls' => [
            ['index' => 0, 'function' => ['arguments' => '{"deal']],
        ]], 'finish_reason' => null]]],
        ['choices' => [['index' => 0, 'delta' => ['tool_calls' => [
            ['index' => 0, 'function' => ['arguments' => '_type": "rent", "rooms_min": 2}']],
        ]], 'finish_reason' => null]]],
        ['choices' => [['index' => 0, 'delta' => [], 'finish_reason' => 'tool_calls']]],
        ['choices' => [], 'usage' => ['prompt_tokens' => 300, 'completion_tokens' => 30]],
    ]), 200)]);

    $events = groqStream();
    $types = array_column($events, 'type');

    expect($types)->toBe(['tool_use', 'usage', 'stop']);

    expect($events[0]['id'])->toBe('call_abc')
        ->and($events[0]['name'])->toBe('search_listings')
        ->and($events[0]['input'])->toBe(['deal_type' => 'rent', 'rooms_min' => 2]);

    expect($events[2]['reason'])->toBe('tool_use');
});

it('retries once on 429 and succeeds on the second attempt', function () {
    Http::fakeSequence('api.groq.com/*')
        ->push('{"error":{"message":"Rate limit reached"}}', 429)
        ->push(groqTextOnlySse(), 200);

    $events = groqStream();

    expect(array_column($events, 'type'))->toBe(['text', 'text', 'usage', 'stop']);
    Http::assertSentCount(2);
});

it('yields an error event with status when retries are exhausted', function () {
    Http::fake(['api.groq.com/*' => Http::response('{"error":{"message":"Service unavailable"}}', 503)]);

    $events = groqStream();

    expect($events)->toHaveCount(1)
        ->and($events[0]['type'])->toBe('error')
        ->and($events[0]['status'])->toBe(503)
        ->and($events[0]['message'])->toContain('503')
        ->and($events[0]['message'])->toContain('Service unavailable');

    Http::assertSentCount(3);
});

it('translates Anthropic-style messages and tools to OpenAI shape correctly', function () {
    Http::fake(['api.groq.com/*' => Http::response(groqTextOnlySse(), 200)]);

    $messages = [
        ['role' => 'user', 'content' => [['type' => 'text', 'text' => 'caut chirie']]],
        ['role' => 'assistant', 'content' => [
            ['type' => 'tool_use', 'id' => 'call_9', 'name' => 'search_listings', 'input' => ['deal_type' => 'rent']],
        ]],
        ['role' => 'user', 'content' => [
            ['type' => 'tool_result', 'tool_use_id' => 'call_9', 'content' => '{"count":3}', 'is_error' => false],
        ]],
        ['role' => 'assistant', 'content' => [['type' => 'text', 'text' => 'Am găsit 3.']]],
    ];
    $tools = [[
        'name' => 'search_listings',
        'description' => 'Caută anunțuri.',
        'input_schema' => ['type' => 'object', 'properties' => ['deal_type' => ['type' => 'string']], 'required' => []],
    ]];

    groqStream($messages, $tools);

    Http::assertSent(function (Request $request) {
        $data = $request->data();
        $m = $data['messages'];

        return $request->url() === 'https://api.groq.com/openai/v1/chat/completions'
            && $request->hasHeader('Authorization', 'Bearer gsk-test-key')
            && $data['model'] === 'openai/gpt-oss-120b'
            && $data['stream'] === true
            && $data['stream_options'] === ['include_usage' => true]
            && $data['max_tokens'] === 512
            // system string → role:system, primul mesaj
            && $m[0] === ['role' => 'system', 'content' => 'Ești asistentul REALTIX.']
            && $m[1] === ['role' => 'user', 'content' => 'caut chirie']
            // tool_use → assistant cu tool_calls (arguments = JSON string)
            && $m[2]['role'] === 'assistant'
            && $m[2]['content'] === null
            && $m[2]['tool_calls'][0]['id'] === 'call_9'
            && $m[2]['tool_calls'][0]['type'] === 'function'
            && $m[2]['tool_calls'][0]['function']['name'] === 'search_listings'
            && json_decode($m[2]['tool_calls'][0]['function']['arguments'], true) === ['deal_type' => 'rent']
            // tool_result → role:tool cu tool_call_id
            && $m[3] === ['role' => 'tool', 'tool_call_id' => 'call_9', 'content' => '{"count":3}']
            && $m[4] === ['role' => 'assistant', 'content' => 'Am găsit 3.']
            // tools → type:function cu parameters = input_schema
            && $data['tools'][0]['type'] === 'function'
            && $data['tools'][0]['function']['name'] === 'search_listings'
            && $data['tools'][0]['function']['parameters']['type'] === 'object';
    });
});

it('forces tool_choice=none on the answer hop (last message is a tool_result)', function () {
    Http::fake(['api.groq.com/*' => Http::response(groqTextOnlySse(), 200)]);

    $tools = [[
        'name' => 'search_listings',
        'description' => 'Caută anunțuri.',
        'input_schema' => ['type' => 'object', 'properties' => [], 'required' => []],
    ]];

    // HOP 2: istoricul se termină cu tool_result → tool_choice: none (forțează text)
    groqStream([
        ['role' => 'user', 'content' => [['type' => 'text', 'text' => 'caut chirie']]],
        ['role' => 'assistant', 'content' => [['type' => 'tool_use', 'id' => 'call_1', 'name' => 'search_listings', 'input' => []]]],
        ['role' => 'user', 'content' => [['type' => 'tool_result', 'tool_use_id' => 'call_1', 'content' => '{"count":1}', 'is_error' => false]]],
    ], $tools);

    Http::assertSent(fn (Request $r) => ($r->data()['tool_choice'] ?? null) === 'none');

    // HOP 1: istoricul se termină cu text de user → tool_choice absent (unelte permise)
    Http::fake(['api.groq.com/*' => Http::response(groqTextOnlySse(), 200)]);
    groqStream([['role' => 'user', 'content' => [['type' => 'text', 'text' => 'caut chirie']]]], $tools);

    Http::assertSent(fn (Request $r) => ! array_key_exists('tool_choice', $r->data()));
});

it('is selected by the container when assistant.provider=groq', function () {
    config(['assistant.provider' => 'groq']);
    expect(app(\App\Domain\Assistant\Contracts\LlmClient::class))->toBeInstanceOf(GroqClient::class);

    config(['assistant.provider' => 'anthropic']);
    expect(app(\App\Domain\Assistant\Contracts\LlmClient::class))->toBeInstanceOf(\App\Infrastructure\Llm\AnthropicClient::class);
});
