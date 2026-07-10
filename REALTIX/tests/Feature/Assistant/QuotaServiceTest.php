<?php

declare(strict_types=1);

use App\Services\Assistant\QuotaOwner;
use App\Services\Assistant\QuotaService;
use Tests\Support\CatalogSeed;

/** N listing refs {id, source} with sequential ids. */
function refs(int $n, int $start = 1, string $source = 'external'): array
{
    return array_map(
        fn (int $i): array => ['id' => (string) $i, 'source' => $source],
        range($start, $start + $n - 1),
    );
}

function quota(): QuotaService
{
    return new QuotaService();
}

beforeEach(fn () => config(['assistant.free_result_limit' => 50]));

it('charges only unique new objects: first search of 8 → used 8, remaining 42', function () {
    $owner = new QuotaOwner('owner-a', null, 'ip-x');

    $r = quota()->consume($owner, refs(8));

    expect($r->countedNew)->toBe(8)
        ->and($r->used)->toBe(8)
        ->and($r->remaining)->toBe(42)
        ->and($r->limit)->toBe(50)
        ->and($r->exceeded)->toBeFalse()
        ->and($r->keptCount)->toBe(8);

    expect(quota()->status($owner))->toBe(['used' => 8, 'freeLimit' => 50, 'purchased' => 0, 'remaining' => 42]);
});

it('does not re-charge a revisited object', function () {
    $owner = new QuotaOwner('owner-a', null, 'ip-x');
    quota()->consume($owner, refs(8));

    // aceleași 8 obiecte din nou → nimic nou consumat, used rămâne 8
    $r = quota()->consume($owner, refs(8));

    expect($r->countedNew)->toBe(0)
        ->and($r->used)->toBe(8)
        ->and($r->keptCount)->toBe(8)      // toate 8 sunt „văzute" → rămân vizibile
        ->and($r->exceeded)->toBeFalse();

    expect(quota()->status($owner)['used'])->toBe(8);
});

it('consumes only what fits and truncates the rest (partial)', function () {
    $owner = new QuotaOwner('owner-a', null, 'ip-x');
    quota()->consume($owner, refs(48));            // ids 1..48

    // 5 obiecte noi (49..53), dar remaining=2 → doar 2 marcate, restul tăiat
    $r = quota()->consume($owner, refs(5, 49));

    expect($r->countedNew)->toBe(2)
        ->and($r->used)->toBe(50)
        ->and($r->remaining)->toBe(0)
        ->and($r->exceeded)->toBeTrue()
        ->and($r->keptCount)->toBe(2);
});

it('blocks the 51st series entirely once the free limit is spent', function () {
    $owner = new QuotaOwner('owner-a', null, 'ip-x');
    quota()->consume($owner, refs(50));            // epuizează cota

    $r = quota()->consume($owner, refs(5, 51));    // toate noi, remaining=0

    expect($r->countedNew)->toBe(0)
        ->and($r->exceeded)->toBeTrue()
        ->and($r->keptCount)->toBe(0);             // cards tăiat la 0
    expect(quota()->status($owner)['remaining'])->toBe(0);
});

it('shares the quota across owner_tokens on the same ip (anti-abuse)', function () {
    $a = new QuotaOwner('owner-a', null, 'ip-shared');
    quota()->consume($a, refs(50));                // A arde 50 pe ip-shared

    // cookie proaspăt, același IP → vede cota partajată, nu se resetează
    $b = new QuotaOwner('owner-b', null, 'ip-shared');
    expect(quota()->status($b)['used'])->toBe(50);

    $r = quota()->consume($b, refs(3, 51));
    expect($r->exceeded)->toBeTrue()->and($r->countedNew)->toBe(0);
});

it('counts an authenticated user on user_id and persists across sessions', function () {
    $userId = CatalogSeed::user(CatalogSeed::agency('quota-usr'), 'q@x.md');

    $session1 = new QuotaOwner('cookie-1', $userId, 'ip-1');
    quota()->consume($session1, refs(8));

    // sesiune nouă (alt cookie, alt IP) dar același cont → aceeași cotă
    $session2 = new QuotaOwner('cookie-2', $userId, 'ip-2');
    expect(quota()->status($session2)['used'])->toBe(8);

    $r = quota()->consume($session2, refs(8));      // aceleași obiecte
    expect($r->countedNew)->toBe(0)->and($r->used)->toBe(8);
});

it('returns an empty status for a brand-new owner', function () {
    $owner = new QuotaOwner('nobody', null, 'ip-none');
    expect(quota()->status($owner))->toBe(['used' => 0, 'freeLimit' => 50, 'purchased' => 0, 'remaining' => 50]);
});

it('attaches anonymous quota to a user account on merge', function () {
    $anon = new QuotaOwner('anon-cookie', null, 'ip-merge');
    quota()->consume($anon, refs(5));

    $userId = CatalogSeed::user(CatalogSeed::agency('merge-usr'), 'm@x.md');
    quota()->mergeIntoAccount('anon-cookie', 'ip-merge', $userId);

    // contul (dintr-o sesiune nouă) moștenește cele 5 obiecte consumate anonim
    $user = new QuotaOwner('new-cookie', $userId, 'ip-other');
    expect(quota()->status($user)['used'])->toBe(5);
});
