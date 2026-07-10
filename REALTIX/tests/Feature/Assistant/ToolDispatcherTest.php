<?php

declare(strict_types=1);

use App\Application\Assistant\Tools\ToolDispatcher;
use App\Application\Assistant\Tools\ToolResult;
use Tests\Support\CatalogSeed;

function runTool(string $name, array $input = []): ToolResult
{
    return app(ToolDispatcher::class)->run($name, $input);
}

it('search_listings returns ≤10 public cards with zero private fields', function () {
    $ag = CatalogSeed::agency('t-priv');
    $u = CatalogSeed::user($ag, 'tools@x.md');
    for ($i = 0; $i < 12; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag,
            'title' => "Ext $i",
            'phone' => '06955512' . $i,
            'raw_data' => json_encode(['phone' => '06955512' . $i, 'seller_name' => 'Vasile Secret']),
            'published_at' => now(),
        ]);
    }
    for ($i = 0; $i < 3; $i++) {
        CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => "Int $i"]);
    }

    $res = runTool('search_listings', []);

    expect($res->ok)->toBeTrue()
        ->and($res->forModel['count'])->toBeLessThanOrEqual(10)
        ->and($res->cards)->toHaveCount($res->forModel['count']);

    $json = json_encode($res->toArray());
    expect($json)->not->toContain('"phone"')
        ->and($json)->not->toContain('"raw_data"')
        ->and($json)->not->toContain('"agency_id"')
        ->and($json)->not->toContain('"matched_at"')
        ->and($json)->not->toContain('0695512')
        ->and($json)->not->toContain('Vasile Secret');

    // page 2 picks up the remainder, without overlapping ids
    $p2 = runTool('search_listings', ['page' => 2]);
    $ids1 = array_column($res->forModel['results'], 'id');
    $ids2 = array_column($p2->forModel['results'], 'id');
    expect($p2->ok)->toBeTrue()
        ->and(count($ids2))->toBeGreaterThan(0)
        ->and(array_intersect($ids1, $ids2))->toBe([]);
});

it('owner_type=owner narrows to external listings from owners only', function () {
    $ag = CatalogSeed::agency('t-owner');
    $u = CatalogSeed::user($ag, 'owner@x.md');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Ext Owner', 'owner_type' => 'owner', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Ext Agency', 'owner_type' => 'agency', 'published_at' => now()]);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Intern']);

    $res = runTool('search_listings', ['owner_type' => 'owner']);

    $titles = array_column($res->forModel['results'], 'title');
    expect($res->ok)->toBeTrue()
        ->and($titles)->toBe(['Ext Owner']);
    foreach ($res->cards as $card) {
        expect($card->ownerType)->toBe('owner')
            ->and($card->source)->toBe('external');
    }
});

it('site=999.md narrows to that external site only', function () {
    $ag = CatalogSeed::agency('t-site');
    $u = CatalogSeed::user($ag, 'site@x.md');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Pe 999', 'source' => '999md', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Pe Imobiliare', 'source' => 'imobiliare_md', 'published_at' => now()]);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Intern']);

    $res = runTool('search_listings', ['site' => '999.md']);

    $titles = array_column($res->forModel['results'], 'title');
    expect($res->ok)->toBeTrue()
        ->and($titles)->toBe(['Pe 999']);
    foreach ($res->cards as $card) {
        expect($card->sourceSite)->toBe('999.md');
    }
});

it('deal_type=rent excludes sale, and exchange/buy never appear', function () {
    $ag = CatalogSeed::agency('t-deals');
    $u = CatalogSeed::user($ag, 'deals@x.md');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Chirie', 'transaction_type' => 'rent', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Vânzare', 'transaction_type' => 'sale', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Schimb', 'transaction_type' => 'exchange', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Cumpărare', 'transaction_type' => 'buy', 'published_at' => now()]);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Chirie Internă', 'transaction_type' => 'rent']);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Schimb Intern', 'transaction_type' => 'exchange']);

    $rent = array_column(runTool('search_listings', ['deal_type' => 'rent'])->forModel['results'], 'title');
    expect($rent)->toContain('Chirie')
        ->and($rent)->toContain('Chirie Internă')
        ->and($rent)->not->toContain('Vânzare')
        ->and($rent)->not->toContain('Schimb')
        ->and($rent)->not->toContain('Cumpărare')
        ->and($rent)->not->toContain('Schimb Intern');

    $all = array_column(runTool('search_listings', [])->forModel['results'], 'title');
    expect($all)->not->toContain('Schimb')
        ->and($all)->not->toContain('Cumpărare')
        ->and($all)->not->toContain('Schimb Intern');
});

it('applies price range in one currency (default EUR, no conversion)', function () {
    $ag = CatalogSeed::agency('t-price');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Ieftin', 'price' => 40000, 'currency' => 'EUR', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Potrivit', 'price' => 90000, 'currency' => 'EUR', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'În Lei', 'price' => 60000, 'currency' => 'MDL', 'published_at' => now()]);

    $titles = array_column(
        runTool('search_listings', ['price_min' => 50000, 'price_max' => 100000])->forModel['results'],
        'title',
    );

    expect($titles)->toBe(['Potrivit']);
});

it('applies rooms and area ranges', function () {
    $ag = CatalogSeed::agency('t-ranges');
    foreach ([1, 2, 3, 4] as $rooms) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Cam $rooms", 'rooms' => $rooms,
            'area' => $rooms * 30, 'published_at' => now(),
        ]);
    }

    $rooms = array_column(runTool('search_listings', ['rooms_min' => 2, 'rooms_max' => 3])->forModel['results'], 'title');
    expect($rooms)->toContain('Cam 2')->and($rooms)->toContain('Cam 3')
        ->and($rooms)->not->toContain('Cam 1')->and($rooms)->not->toContain('Cam 4');

    $area = array_column(runTool('search_listings', ['area_min' => 50, 'area_max' => 100])->forModel['results'], 'title');
    expect($area)->toContain('Cam 2')->and($area)->toContain('Cam 3')
        ->and($area)->not->toContain('Cam 1')->and($area)->not->toContain('Cam 4');
});

it('matches dirty city variants for a canonical location input', function () {
    $ag = CatalogSeed::agency('t-geo');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'În Capitală', 'city' => 'Chisinau', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'La Nord', 'city' => 'Balti', 'published_at' => now()]);

    $titles = array_column(runTool('search_listings', ['location' => 'Kishinev'])->forModel['results'], 'title');

    expect($titles)->toBe(['În Capitală']);
});

it('rejects invalid input with a clear error, not an exception', function () {
    $bad = runTool('search_listings', ['property_type' => 'castle']);
    expect($bad->ok)->toBeFalse()
        ->and($bad->error)->toContain('property_type')
        ->and($bad->error)->toContain('apartment');

    $unknownParam = runTool('search_listings', ['bogus' => 1]);
    expect($unknownParam->ok)->toBeFalse()
        ->and($unknownParam->error)->toContain('bogus');

    $unknownTool = runTool('teleport_user', []);
    expect($unknownTool->ok)->toBeFalse()
        ->and($unknownTool->error)->toContain('necunoscută')
        ->and($unknownTool->error)->toContain('search_listings');
});

it('get_listing_details returns extended public data without phone/raw_data', function () {
    $ag = CatalogSeed::agency('t-details');
    $id = CatalogSeed::scraped([
        'agency_id' => $ag,
        'title' => 'Detaliat',
        'description' => 'Apartament luminos, renovat recent.',
        'condition' => 'renovated',
        'year_built' => 2015,
        'floor' => 3,
        'floors_total' => 9,
        'phone' => '069777888',
        'raw_data' => json_encode(['phone' => '069777888', 'seller_name' => 'Maria Ascunsă']),
        'published_at' => now(),
    ]);

    $res = runTool('get_listing_details', ['listing_id' => (string) $id, 'source' => 'external']);

    expect($res->ok)->toBeTrue()
        ->and($res->forModel['title'])->toBe('Detaliat')
        ->and($res->forModel['description'])->toBe('Apartament luminos, renovat recent.')
        ->and($res->forModel['condition'])->toBe('renovated')
        ->and($res->forModel['yearBuilt'])->toBe(2015)
        ->and($res->forModel['floor'])->toBe(3)
        ->and($res->forModel['url'])->toBe('/assistant/listing/external/' . $id)
        ->and($res->forModel)->not->toHaveKey('photos'); // trimmed for the model

    $json = json_encode($res->toArray());
    expect($json)->not->toContain('069777888')
        ->and($json)->not->toContain('Maria Ascunsă')
        ->and($json)->not->toContain('"raw_data"');
});

it('get_listing_details refuses non-public and missing listings clearly', function () {
    $ag = CatalogSeed::agency('t-hidden');
    $hidden = CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Nepublicat', 'published_at' => null]);

    $res = runTool('get_listing_details', ['listing_id' => (string) $hidden, 'source' => 'external']);
    expect($res->ok)->toBeFalse()
        ->and($res->error)->toContain('nu există sau nu (mai) este public');

    $missing = runTool('get_listing_details', ['listing_id' => '99999999', 'source' => 'external']);
    expect($missing->ok)->toBeFalse();

    $noArgs = runTool('get_listing_details', []);
    expect($noArgs->ok)->toBeFalse()
        ->and($noArgs->error)->toContain('listing_id');
});

it('search_agencies returns derived city/specializations and filters on them', function () {
    $a1 = CatalogSeed::agency('t-ag-chisinau', 'Capitala Imobil');
    $u1 = CatalogSeed::user($a1, 'cap@x.md');
    CatalogSeed::property(['agency_id' => $a1, 'user_id' => $u1, 'type' => 'apartment', 'city' => 'Chișinău', 'status' => 'active']);
    CatalogSeed::property(['agency_id' => $a1, 'user_id' => $u1, 'type' => 'apartment', 'city' => 'Chișinău', 'status' => 'active']);

    $a2 = CatalogSeed::agency('t-ag-balti', 'Nord Case');
    $u2 = CatalogSeed::user($a2, 'nord@x.md');
    CatalogSeed::property(['agency_id' => $a2, 'user_id' => $u2, 'type' => 'house', 'city' => 'Bălți', 'status' => 'active']);

    $all = runTool('search_agencies', []);
    expect($all->ok)->toBeTrue()
        ->and(count($all->cards))->toBe(2);

    // specialization filter (token → derived label)
    $apart = runTool('search_agencies', ['specialization' => 'apartment']);
    expect(array_column($apart->forModel['results'], 'name'))->toBe(['Capitala Imobil'])
        ->and($apart->forModel['results'][0]['specializations'])->toContain('Apartamente')
        ->and($apart->forModel['results'][0]['city'])->toBe('Chișinău');

    // city filter accepts dirty input (Kishinev → Chișinău)
    $city = runTool('search_agencies', ['city' => 'Kishinev']);
    expect(array_column($city->forModel['results'], 'name'))->toBe(['Capitala Imobil']);

    // …and diacritic-less input (Balti → Bălți)
    $balti = runTool('search_agencies', ['city' => 'Balti']);
    expect(array_column($balti->forModel['results'], 'name'))->toBe(['Nord Case']);
});
