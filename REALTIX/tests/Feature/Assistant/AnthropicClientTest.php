<?php

declare(strict_types=1);

use App\Infrastructure\Llm\AnthropicClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/** Build an Anthropic-style SSE body from decoded event payloads. */
function sseBody(array $events): string
{
    return implode('', array_map(
        fn (array $e): string => 'event: ' . $e['type'] . "\n" . 'data: ' . json_encode($e) . "\n\n",
        $events,
    ));
}

/** A complete, plain-text SSE stream (usage: 25 in / 42 out, end_turn). */
function textOnlySse(): string
{
    return sseBody([
        ['type' => 'message_start', 'message' => ['id' => 'msg_01', 'usage' => ['input_tokens' => 25, 'output_tokens' => 1]]],
        ['type' => 'content_block_start', 'index' => 0, 'content_block' => ['type' => 'text', 'text' => '']],
        ['type' => 'ping'],
        ['type' => 'content_block_delta', 'index' => 0, 'delta' => ['type' => 'text_delta', 'text' => 'Salut, ']],
        ['type' => 'content_block_delta', 'index' => 0, 'delta' => ['type' => 'text_delta', 'text' => 'lume!']],
        ['type' => 'content_block_stop', 'index' => 0],
        ['type' => 'message_delta', 'delta' => ['stop_reason' => 'end_turn'], 'usage' => ['output_tokens' => 42]],
        ['type' => 'message_stop'],
    ]);
}

/** @return list<array<string,mixed>> */
function streamEvents(array $tools = []): array
{
    $client = new AnthropicClient();

    return iterator_to_array($client->createStream(
        system: 'Ești asistentul imobiliar REALTIX.',
        messages: [['role' => 'user', 'content' => 'Salut']],
        tools: $tools,
        model: 'claude-haiku-4-5',
        maxTokens: 1024,
    ), false);
}

beforeEach(function () {
    config([
        'services.anthropic.api_key' => 'sk-test-key',
        'assistant.retry.base_delay_ms' => 0, // fără sleep în teste
        'assistant.retry.max_attempts' => 3,
    ]);
});

it('streams a text-only response as text events + usage + stop end_turn', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(textOnlySse(), 200)]);

    $events = streamEvents();
    $types = array_column($events, 'type');

    expect($types)->toBe(['text', 'text', 'usage', 'stop'])
        ->and(implode('', array_column(array_slice($events, 0, 2), 'text')))->toBe('Salut, lume!')
        ->and($events[3]['reason'])->toBe('end_turn');
});

it('assembles a tool_use input from multiple input_json_delta fragments', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(sseBody([
        ['type' => 'message_start', 'message' => ['id' => 'msg_02', 'usage' => ['input_tokens' => 310, 'output_tokens' => 2]]],
        ['type' => 'content_block_start', 'index' => 0, 'content_block' => ['type' => 'text', 'text' => '']],
        ['type' => 'content_block_delta', 'index' => 0, 'delta' => ['type' => 'text_delta', 'text' => 'Caut imediat.']],
        ['type' => 'content_block_stop', 'index' => 0],
        ['type' => 'content_block_start', 'index' => 1, 'content_block' => ['type' => 'tool_use', 'id' => 'toolu_abc', 'name' => 'search_listings', 'input' => []]],
        // input-ul vine fragmentat — clientul trebuie să ACUMULEZE și să parseze la stop
        ['type' => 'content_block_delta', 'index' => 1, 'delta' => ['type' => 'input_json_delta', 'partial_json' => '{"deal']],
        ['type' => 'content_block_delta', 'index' => 1, 'delta' => ['type' => 'input_json_delta', 'partial_json' => '_type": "rent", "rooms']],
        ['type' => 'content_block_delta', 'index' => 1, 'delta' => ['type' => 'input_json_delta', 'partial_json' => '_min": 2}']],
        ['type' => 'content_block_stop', 'index' => 1],
        ['type' => 'message_delta', 'delta' => ['stop_reason' => 'tool_use'], 'usage' => ['output_tokens' => 55]],
        ['type' => 'message_stop'],
    ]), 200)]);

    $events = streamEvents();
    $types = array_column($events, 'type');

    expect($types)->toBe(['text', 'tool_use', 'usage', 'stop']);

    $tool = $events[1];
    expect($tool['id'])->toBe('toolu_abc')
        ->and($tool['name'])->toBe('search_listings')
        ->and($tool['input'])->toBe(['deal_type' => 'rent', 'rooms_min' => 2]);

    expect($events[3]['reason'])->toBe('tool_use');
});

it('retries once on 429 and succeeds on the second attempt', function () {
    Http::fakeSequence('api.anthropic.com/*')
        ->push('{"type":"error","error":{"type":"rate_limit_error","message":"Too many requests"}}', 429)
        ->push(textOnlySse(), 200);

    $events = streamEvents();
    $types = array_column($events, 'type');

    expect($types)->toBe(['text', 'text', 'usage', 'stop'])
        ->and(array_column($events, 'type'))->not->toContain('error');

    Http::assertSentCount(2);
});

it('captures usage tokens (tokensIn from message_start, tokensOut from message_delta)', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(textOnlySse(), 200)]);

    $usage = collect(streamEvents())->firstWhere('type', 'usage');

    expect($usage)->not->toBeNull()
        ->and($usage['tokensIn'])->toBe(25)
        ->and($usage['tokensOut'])->toBe(42);
});

it('yields a clear error event (not an exception) when retries are exhausted', function () {
    Http::fake(['api.anthropic.com/*' => Http::response('{"type":"error","error":{"type":"api_error","message":"Internal server error"}}', 500)]);

    $events = streamEvents();

    expect($events)->toHaveCount(1)
        ->and($events[0]['type'])->toBe('error')
        ->and($events[0]['message'])->toContain('500')
        ->and($events[0]['message'])->toContain('Internal server error');

    Http::assertSentCount(3); // toate cele 3 încercări au fost făcute
});

it('does not retry non-retryable 4xx errors', function () {
    Http::fake(['api.anthropic.com/*' => Http::response('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}', 401)]);

    $events = streamEvents();

    expect($events[0]['type'])->toBe('error')
        ->and($events[0]['message'])->toContain('401');

    Http::assertSentCount(1);
});

it('sends the correct payload and headers (stream, model, tools, api key, version)', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(textOnlySse(), 200)]);

    $tools = [[
        'name' => 'search_listings',
        'description' => 'Caută anunțuri.',
        'input_schema' => ['type' => 'object', 'properties' => [], 'required' => []],
    ]];
    streamEvents($tools);

    Http::assertSent(function (Request $request) {
        $data = $request->data();

        return $request->url() === 'https://api.anthropic.com/v1/messages'
            && $request->hasHeader('x-api-key', 'sk-test-key')
            && $request->hasHeader('anthropic-version', '2023-06-01')
            && $data['stream'] === true
            && $data['model'] === 'claude-haiku-4-5'
            && $data['max_tokens'] === 1024
            && $data['system'] === 'Ești asistentul imobiliar REALTIX.'
            && $data['tools'][0]['name'] === 'search_listings'
            && $data['messages'][0]['role'] === 'user';
    });
});

it('surfaces an in-stream error event and still terminates cleanly', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(sseBody([
        ['type' => 'message_start', 'message' => ['id' => 'msg_03', 'usage' => ['input_tokens' => 10, 'output_tokens' => 1]]],
        ['type' => 'content_block_start', 'index' => 0, 'content_block' => ['type' => 'text', 'text' => '']],
        ['type' => 'content_block_delta', 'index' => 0, 'delta' => ['type' => 'text_delta', 'text' => 'Încep…']],
        ['type' => 'error', 'error' => ['type' => 'overloaded_error', 'message' => 'Overloaded']],
    ]), 200)]);

    $events = streamEvents();
    $types = array_column($events, 'type');

    // text → error (in-stream) → usage + stop (stream tăiat, fără message_stop)
    expect($types)->toBe(['text', 'error', 'usage', 'stop'])
        ->and($events[1]['message'])->toBe('Overloaded')
        ->and($events[3]['reason'])->toBe('incomplete');
});
