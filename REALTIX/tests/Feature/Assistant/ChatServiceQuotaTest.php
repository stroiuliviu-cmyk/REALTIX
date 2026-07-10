<?php

declare(strict_types=1);

use App\Application\Assistant\Tools\ToolDispatcher;
use App\Services\Assistant\ChatEvent;
use App\Services\Assistant\ChatService;
use App\Services\Assistant\ConversationManager;
use App\Services\Assistant\QuotaOwner;
use App\Services\Assistant\QuotaService;
use Tests\Support\CatalogSeed;
use Tests\Support\FakeLlmClient;

/** Run a turn through ChatService WITH a quota owner; return wire-shaped events. */
function runQuotaTurn(FakeLlmClient $fake, QuotaOwner $owner, string $lang = 'ro'): array
{
    $c = (new ConversationManager())->findOrCreate($owner->ownerToken, $owner->userId, $lang);
    $service = new ChatService($fake, new ConversationManager(), app(ToolDispatcher::class), new QuotaService());

    return array_map(
        fn (ChatEvent $e): array => $e->toArray(),
        iterator_to_array($service->stream($c, 'caut ceva', $owner), false),
    );
}

/** HOP1 tool_use + HOP2 text scripts for a given tool. */
function toolThenText(string $tool, array $input, string $reply = 'Gata.'): array
{
    return [
        [['type' => 'tool_use', 'id' => 'toolu_q', 'name' => $tool, 'input' => $input], ['type' => 'stop', 'reason' => 'tool_use']],
        [['type' => 'text', 'text' => $reply], ['type' => 'stop', 'reason' => 'end_turn']],
    ];
}

/** Decode the tool_result payload the given createStream call received (what the model sees). */
function toolResultForModel(FakeLlmClient $fake, int $call): array
{
    foreach ($fake->calls[$call]['messages'] as $message) {
        foreach ((array) ($message['content'] ?? []) as $block) {
            if (($block['type'] ?? '') === 'tool_result') {
                return json_decode((string) $block['content'], true) ?? [];
            }
        }
    }

    return [];
}

beforeEach(fn () => config(['assistant.free_result_limit' => 50]));

it('emits a quota event after cards for a search, charging the new listings', function () {
    $ag = CatalogSeed::agency('q-search');
    for ($i = 0; $i < 3; $i++) {
        CatalogSeed::scraped(['agency_id' => $ag, 'title' => "Anunț $i", 'published_at' => now()]);
    }

    $fake = new FakeLlmClient(toolThenText('search_listings', ['deal_type' => 'sale']));
    $events = runQuotaTurn($fake, new QuotaOwner('owner-q', null, 'ip-q'));

    expect(array_column($events, 'type'))->toBe(['tool_running', 'cards', 'quota', 'token', 'done']);

    $cards = $events[1];
    $quota = $events[2];
    expect($cards['listings'])->toHaveCount(3)
        ->and($quota)->toMatchArray(['type' => 'quota', 'used' => 3, 'remaining' => 47, 'limit' => 50, 'exceeded' => false]);

    // Not exceeded → for_model is untouched: full results, no quota_notice.
    $forModel = toolResultForModel($fake, 1);
    expect($forModel['results'])->toHaveCount(3)
        ->and($forModel)->not->toHaveKey('quota_notice');
});

it('truncates cards to the remaining quota and flags exceeded', function () {
    config(['assistant.free_result_limit' => 2]);

    $ag = CatalogSeed::agency('q-trunc');
    for ($i = 0; $i < 5; $i++) {
        CatalogSeed::scraped(['agency_id' => $ag, 'title' => "Obiect $i", 'published_at' => now()]);
    }

    $fake = new FakeLlmClient(toolThenText('search_listings', []));
    $events = runQuotaTurn($fake, new QuotaOwner('owner-t', null, 'ip-t'));

    $cards = collect($events)->firstWhere('type', 'cards');
    $quota = collect($events)->firstWhere('type', 'quota');

    // 5 rezultate, dar limita = 2 → cards tăiat la 2, exceeded
    expect($cards['listings'])->toHaveCount(2)
        ->and($quota)->toMatchArray(['used' => 2, 'remaining' => 0, 'limit' => 2, 'exceeded' => true]);
});

it('trims for_model to keptCount and adds a quota_notice at exceeded', function () {
    config(['assistant.free_result_limit' => 2]);

    $ag = CatalogSeed::agency('q-fm');
    for ($i = 0; $i < 5; $i++) {
        CatalogSeed::scraped(['agency_id' => $ag, 'title' => "Obj $i", 'published_at' => now()]);
    }

    $fake = new FakeLlmClient(toolThenText('search_listings', [], 'Ai atins limita gratuită.'));
    $events = runQuotaTurn($fake, new QuotaOwner('owner-fm', null, 'ip-fm'));

    // SSE neschimbat: cards trunchiat la 2, apoi quota exceeded
    expect(collect($events)->firstWhere('type', 'cards')['listings'])->toHaveCount(2)
        ->and(collect($events)->firstWhere('type', 'quota')['exceeded'])->toBeTrue();

    // HOP 2 (call index 1) a văzut DOAR ce e afișat: exact keptCount rezultate + notă.
    $forModel = toolResultForModel($fake, 1);
    expect($forModel['results'])->toHaveCount(2)       // nu vede obiectele tăiate
        ->and($forModel['count'])->toBe(2)
        ->and($forModel)->toHaveKey('quota_notice')
        ->and($forModel['quota_notice'])->toContain('limita gratuită de 2')
        ->and($forModel['quota_notice'])->toContain('doar 2')
        ->and($forModel['quota_notice'])->toContain('creând cont');
});

it('does NOT consume quota for get_listing_details (a re-view)', function () {
    $ag = CatalogSeed::agency('q-detail');
    $id = CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Detaliat', 'published_at' => now()]);

    $fake = new FakeLlmClient(toolThenText('get_listing_details', ['listing_id' => (string) $id, 'source' => 'external']));
    $owner = new QuotaOwner('owner-d', null, 'ip-d');
    $events = runQuotaTurn($fake, $owner);

    expect(array_column($events, 'type'))->not->toContain('quota');
    expect((new QuotaService())->status($owner)['used'])->toBe(0);
});

it('does NOT consume quota for search_agencies', function () {
    $ag = CatalogSeed::agency('q-ag', 'Agenția Q');
    $u = CatalogSeed::user($ag, 'qag@x.md');
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'type' => 'apartment', 'city' => 'Chișinău', 'status' => 'active']);

    $fake = new FakeLlmClient(toolThenText('search_agencies', []));
    $owner = new QuotaOwner('owner-a2', null, 'ip-a2');
    $events = runQuotaTurn($fake, $owner);

    expect(array_column($events, 'type'))->not->toContain('quota');
    expect((new QuotaService())->status($owner)['used'])->toBe(0);
});

it('does NOT consume quota for smalltalk (no tool)', function () {
    $fake = new FakeLlmClient([
        [['type' => 'stop', 'reason' => 'end_turn']],                       // hop1: fără tool
        [['type' => 'text', 'text' => 'Salut!'], ['type' => 'stop', 'reason' => 'end_turn']],
    ]);
    $owner = new QuotaOwner('owner-s', null, 'ip-s');
    $events = runQuotaTurn($fake, $owner);

    expect(array_column($events, 'type'))->toBe(['token', 'done'])
        ->and(array_column($events, 'type'))->not->toContain('quota');
    expect((new QuotaService())->status($owner)['used'])->toBe(0);
});
