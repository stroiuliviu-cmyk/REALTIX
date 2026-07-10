<?php

declare(strict_types=1);

use App\Domain\Assistant\Contracts\LlmClient;
use Tests\Support\CatalogSeed;
use Tests\Support\FakeLlmClient;

/** Bind a scripted LlmClient in the container (no HTTP anywhere). */
function bindFakeLlm(array $scripts): FakeLlmClient
{
    $fake = new FakeLlmClient($scripts);
    app()->instance(LlmClient::class, $fake);

    return $fake;
}

/** Scripts for one smalltalk turn (hop1 no tool, hop2 text). */
function smalltalkScripts(string $reply = 'Salut!'): array
{
    return [
        [['type' => 'usage', 'tokensIn' => 10, 'tokensOut' => 1], ['type' => 'stop', 'reason' => 'end_turn']],
        [['type' => 'text', 'text' => $reply], ['type' => 'usage', 'tokensIn' => 12, 'tokensOut' => 4], ['type' => 'stop', 'reason' => 'end_turn']],
    ];
}

/** Parse the SSE body into decoded `data:` payloads. */
function sseEvents(string $body): array
{
    $events = [];
    foreach (explode("\n\n", $body) as $frame) {
        foreach (explode("\n", $frame) as $line) {
            if (str_starts_with($line, 'data:')) {
                $events[] = json_decode(trim(substr($line, 5)), true);
            }
        }
    }

    return array_values(array_filter($events, fn ($e) => is_array($e)));
}

it('streams a tool scenario as SSE data lines in order and sets the owner cookie', function () {
    $ag = CatalogSeed::agency('sse-tool');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Apartament SSE', 'published_at' => now()]);

    bindFakeLlm([
        // HOP 1: cere unealta
        [
            ['type' => 'tool_use', 'id' => 'toolu_sse', 'name' => 'search_listings', 'input' => []],
            ['type' => 'usage', 'tokensIn' => 100, 'tokensOut' => 5],
            ['type' => 'stop', 'reason' => 'tool_use'],
        ],
        // HOP 2: răspunsul final
        [
            ['type' => 'text', 'text' => 'Am găsit '],
            ['type' => 'text', 'text' => 'un anunț.'],
            ['type' => 'usage', 'tokensIn' => 200, 'tokensOut' => 10],
            ['type' => 'stop', 'reason' => 'end_turn'],
        ],
    ]);

    $response = $this->post('/assistant/chat', ['text' => 'apartament de vânzare', 'language' => 'ro']);

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toStartWith('text/event-stream');
    expect($response->headers->get('X-Accel-Buffering'))->toBe('no');

    // cookie-ul owner_token a fost setat la primul request
    $response->assertCookie('assistant_owner');

    $events = sseEvents($response->streamedContent());
    // controller-ul aplică cota → un eveniment 'quota' după 'cards'
    expect(array_column($events, 'type'))->toBe(['tool_running', 'cards', 'quota', 'token', 'token', 'done'])
        ->and($events[0]['tool'])->toBe('search_listings')
        ->and($events[1]['listings'])->toHaveCount(1)
        ->and($events[2])->toMatchArray(['type' => 'quota', 'used' => 1, 'remaining' => 49, 'limit' => 50, 'exceeded' => false])
        ->and($events[3]['text'] . $events[4]['text'])->toBe('Am găsit un anunț.')
        ->and($events[5]['conversationId'])->toBeString();
});

it('emits a single rate_limited SSE error event when the message limit is exceeded', function () {
    config(['assistant.anon_msg_limit' => 2]);

    // scripturi pentru 2 tururi smalltalk (câte 2 hop-uri fiecare)
    bindFakeLlm([...smalltalkScripts(), ...smalltalkScripts()]);

    // cookie fix → aceeași cheie de rate limit pe toate request-urile
    $ok1 = $this->withCookie('assistant_owner', 'owner-rl')->post('/assistant/chat', ['text' => 'unu', 'language' => 'ro']);
    $ok2 = $this->withCookie('assistant_owner', 'owner-rl')->post('/assistant/chat', ['text' => 'doi', 'language' => 'ro']);

    expect(array_column(sseEvents($ok1->streamedContent()), 'type'))->toContain('done');
    expect(array_column(sseEvents($ok2->streamedContent()), 'type'))->toContain('done');

    // al 3-lea mesaj: peste limită → UN eveniment error, HTTP 200 (nu 429 brut)
    $blocked = $this->withCookie('assistant_owner', 'owner-rl')->post('/assistant/chat', ['text' => 'trei', 'language' => 'ro']);

    $blocked->assertOk();
    $events = sseEvents($blocked->streamedContent());
    expect($events)->toHaveCount(1)
        ->and($events[0]['type'])->toBe('error')
        ->and($events[0]['code'])->toBe('rate_limited')
        ->and($events[0]['message'])->toContain('cont');
});

it('rejects an empty text with 422 before any streaming', function () {
    bindFakeLlm([]);

    $this->postJson('/assistant/chat', ['text' => '', 'language' => 'ro'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['text']);

    $this->postJson('/assistant/chat', ['text' => 'salut', 'language' => 'en'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['language']);
});

it('continues an existing conversation when its id is in the URL', function () {
    bindFakeLlm([...smalltalkScripts('Primul.'), ...smalltalkScripts('Al doilea.')]);

    $first = $this->withCookie('assistant_owner', 'owner-cont')
        ->post('/assistant/chat', ['text' => 'salut', 'language' => 'ro']);
    $conversationId = collect(sseEvents($first->streamedContent()))->firstWhere('type', 'done')['conversationId'];

    $second = $this->withCookie('assistant_owner', 'owner-cont')
        ->post("/assistant/chat/{$conversationId}", ['text' => 'mai spune', 'language' => 'ro']);

    $doneId = collect(sseEvents($second->streamedContent()))->firstWhere('type', 'done')['conversationId'];
    expect($doneId)->toBe($conversationId)
        ->and(\App\Models\Conversation::where('owner_token', 'owner-cont')->count())->toBe(1)
        ->and(\App\Models\Message::whereRelation('conversation', 'owner_token', 'owner-cont')->count())->toBe(4);
});
