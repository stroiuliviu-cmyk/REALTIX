<?php

declare(strict_types=1);

use App\Domain\Assistant\Contracts\LlmClient;
use Tests\Support\FakeLlmClient;

/**
 * Read-only history API (GET /assistant/api/conversations[/{id}]). Self-contained
 * helpers (uniquely named so they don't collide with ChatEndpointTest's globals).
 */

/** Scripts for one smalltalk turn: hop1 (no tool) + hop2 (text answer). */
function convScripts(string $reply): array
{
    return [
        [['type' => 'usage', 'tokensIn' => 10, 'tokensOut' => 1], ['type' => 'stop', 'reason' => 'end_turn']],
        [['type' => 'text', 'text' => $reply], ['type' => 'usage', 'tokensIn' => 12, 'tokensOut' => 4], ['type' => 'stop', 'reason' => 'end_turn']],
    ];
}

/** Parse an SSE body into its decoded `data:` payloads. */
function convSse(string $body): array
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

/** Run one smalltalk turn over the chat endpoint and return its conversation id. */
function chatTurn(string $ownerCookie, string $text, string $reply = 'Salut!'): string
{
    app()->instance(LlmClient::class, new FakeLlmClient(convScripts($reply)));

    $response = test()->withCookie('assistant_owner', $ownerCookie)
        ->post('/assistant/chat', ['text' => $text, 'language' => 'ro']);

    $response->assertOk();

    return collect(convSse($response->streamedContent()))
        ->firstWhere('type', 'done')['conversationId'];
}

it('lists the conversation with an auto-title after a chat', function () {
    $id = chatTurn('owner-hist', 'Caut un apartament în centru', 'Sigur, te ajut.');

    $list = $this->withCredentials()->withCookie('assistant_owner', 'owner-hist')
        ->getJson('/assistant/api/conversations');

    $list->assertOk();
    $conversations = $list->json('conversations');

    expect($conversations)->toHaveCount(1)
        ->and($conversations[0]['id'])->toBe($id)
        ->and($conversations[0]['title'])->toBe('Caut un apartament în centru')
        ->and($conversations[0]['language'])->toBe('ro')
        ->and($conversations[0]['message_count'])->toBe(2)
        ->and($conversations[0]['last_activity_at'])->toBeString();
});

it('loads the stored messages for rehydration', function () {
    $id = chatTurn('owner-load', 'Bună ziua', 'Bună! Cu ce te pot ajuta?');

    $show = $this->withCredentials()->withCookie('assistant_owner', 'owner-load')
        ->getJson("/assistant/api/conversations/{$id}");

    $show->assertOk();

    expect($show->json('id'))->toBe($id)
        ->and($show->json('language'))->toBe('ro')
        ->and($show->json('messages'))->toBe([
            ['role' => 'user', 'text' => 'Bună ziua'],
            ['role' => 'assistant', 'text' => 'Bună! Cu ce te pot ajuta?'],
        ]);
});

it('never leaks another owner\'s conversations', function () {
    $id = chatTurn('owner-a', 'Secretul lui A');

    // B has no conversations of their own …
    $bList = $this->withCredentials()->withCookie('assistant_owner', 'owner-b')
        ->getJson('/assistant/api/conversations');
    $bList->assertOk();
    expect($bList->json('conversations'))->toBe([]);

    // … and cannot read A's by id (scoped 404, not a 403 that confirms existence).
    $this->withCredentials()->withCookie('assistant_owner', 'owner-b')
        ->getJson("/assistant/api/conversations/{$id}")
        ->assertStatus(404);
});

it('continues the same conversation after a reload (owner-scoped lookup)', function () {
    $id = chatTurn('owner-reload', 'Primul mesaj', 'Prima.');

    // "reload": the client kept the id and posts the next turn to it.
    app()->instance(LlmClient::class, new FakeLlmClient(convScripts('A doua.')));
    $second = $this->withCookie('assistant_owner', 'owner-reload')
        ->post("/assistant/chat/{$id}", ['text' => 'Al doilea mesaj', 'language' => 'ro']);

    $doneId = collect(convSse($second->streamedContent()))->firstWhere('type', 'done')['conversationId'];

    expect($doneId)->toBe($id)
        ->and(\App\Models\Conversation::where('owner_token', 'owner-reload')->count())->toBe(1);

    // History still shows a single conversation with all four messages.
    $show = $this->withCredentials()->withCookie('assistant_owner', 'owner-reload')
        ->getJson("/assistant/api/conversations/{$id}");
    expect($show->json('messages'))->toBe([
        ['role' => 'user', 'text' => 'Primul mesaj'],
        ['role' => 'assistant', 'text' => 'Prima.'],
        ['role' => 'user', 'text' => 'Al doilea mesaj'],
        ['role' => 'assistant', 'text' => 'A doua.'],
    ]);
});
