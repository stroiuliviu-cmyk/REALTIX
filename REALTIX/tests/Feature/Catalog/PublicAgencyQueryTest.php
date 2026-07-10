<?php

declare(strict_types=1);

use App\Infrastructure\Catalog\PublicAgencyQuery;
use Tests\Support\CatalogSeed;

it('derives city, specializations and publicListingsCount from active listings', function () {
    $ag = CatalogSeed::agency('imobil-prim', 'Imobil Prim');
    $u = CatalogSeed::user($ag, 'c@x.md');

    // 2 apartments in Chișinău, 1 house in Bălți -> city = Chișinău (most frequent)
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'type' => 'apartment', 'city' => 'Chișinău', 'status' => 'active']);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'type' => 'apartment', 'city' => 'Chișinău', 'status' => 'active']);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'type' => 'house', 'city' => 'Bălți', 'status' => 'active']);
    // inactive land -> must NOT count nor appear in specializations
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'type' => 'land', 'status' => 'inactive']);

    // agency with no public listings -> excluded from the directory
    CatalogSeed::agency('goala', 'Agenție Goală');

    $cards = (new PublicAgencyQuery())->search();

    expect($cards)->toHaveCount(1);

    $card = $cards[0];
    expect($card->name)->toBe('Imobil Prim')
        ->and($card->publicListingsCount)->toBe(3)
        ->and($card->city)->toBe('Chișinău')
        ->and($card->specializations)->toContain('Apartamente')
        ->and($card->specializations)->toContain('Case')
        ->and($card->specializations)->not->toContain('Terenuri') // inactive land excluded
        ->and($card->url)->toBe('/assistant/agency/' . $card->id);
});

it('filters agencies by name text', function () {
    $a1 = CatalogSeed::agency('prima', 'Prima Imobil');
    $u1 = CatalogSeed::user($a1, 'p@x.md');
    CatalogSeed::property(['agency_id' => $a1, 'user_id' => $u1, 'status' => 'active']);

    $a2 = CatalogSeed::agency('verde', 'Casa Verde');
    $u2 = CatalogSeed::user($a2, 'v@x.md');
    CatalogSeed::property(['agency_id' => $a2, 'user_id' => $u2, 'status' => 'active']);

    $cards = (new PublicAgencyQuery())->search('verde');

    expect($cards)->toHaveCount(1)
        ->and($cards[0]->name)->toBe('Casa Verde');
});
