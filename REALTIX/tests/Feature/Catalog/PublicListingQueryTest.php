<?php

declare(strict_types=1);

use App\Domain\Catalog\ListingQuery;
use App\Infrastructure\Catalog\PublicListingQuery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CatalogSeed;

function listings(ListingQuery $q): array
{
    return (new PublicListingQuery())->search($q);
}

it('returns only ACTIVE internal listings', function () {
    $ag = CatalogSeed::agency('a-active');
    $u = CatalogSeed::user($ag, 'active@x.md');
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Activ', 'status' => 'active']);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Inactiv', 'status' => 'inactive']);
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Vândut', 'status' => 'sold']);

    $res = listings(new ListingQuery(source: ListingQuery::SOURCE_INTERNAL));

    expect($res)->toHaveCount(1)
        ->and($res[0]->title)->toBe('Activ')
        ->and($res[0]->source)->toBe('internal')
        ->and($res[0]->ownerType)->toBe('agency'); // internal = agency inventory
});

it('hides external listings without published_at (non-published never appears)', function () {
    $ag = CatalogSeed::agency('a-pub');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Publicat', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Nepublicat', 'published_at' => null]);

    $res = listings(new ListingQuery(source: ListingQuery::SOURCE_EXTERNAL));

    expect($res)->toHaveCount(1)
        ->and($res[0]->title)->toBe('Publicat');
});

it('never exposes private fields (phone / raw_data) in the DTO', function () {
    $ag = CatalogSeed::agency('a-priv');
    CatalogSeed::scraped([
        'agency_id' => $ag,
        'title' => 'Cu contact',
        'phone' => '069123456',
        'raw_data' => json_encode(['phone' => '069123456', 'seller_name' => 'Ion Privat']),
        'published_at' => now(),
    ]);

    $card = listings(new ListingQuery(source: ListingQuery::SOURCE_EXTERNAL))[0];
    $arr = $card->toArray();

    expect($arr)->not->toHaveKey('phone')
        ->and($arr)->not->toHaveKey('raw_data')
        ->and($arr)->not->toHaveKey('extra_flags')
        ->and($arr)->not->toHaveKey('agency_id');

    $json = json_encode($arr);
    expect($json)->not->toContain('069123456')
        ->and($json)->not->toContain('Ion Privat');
});

it('returns BOTH internal and external for a "Buiucani" query', function () {
    $ag = CatalogSeed::agency('a-buiucani');
    $u = CatalogSeed::user($ag, 'b@x.md');
    CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => 'Intern Buiucani', 'district' => 'Buiucani']);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Extern Buiucani', 'district' => 'Buiucani', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Extern Botanica', 'district' => 'Botanica', 'published_at' => now()]);

    $res = listings(new ListingQuery(district: 'Buiucani', source: ListingQuery::SOURCE_ANY));

    $sources = collect($res)->pluck('source')->unique()->sort()->values()->all();
    $titles = collect($res)->pluck('title')->all();

    expect($sources)->toBe(['external', 'internal'])
        ->and($titles)->toContain('Intern Buiucani')
        ->and($titles)->toContain('Extern Buiucani')
        ->and($titles)->not->toContain('Extern Botanica');
});

it('excludes exchange / buy transaction types', function () {
    $ag = CatalogSeed::agency('a-deals');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Vânzare', 'transaction_type' => 'sale', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Schimb', 'transaction_type' => 'exchange', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Cumpăr', 'transaction_type' => 'buy', 'published_at' => now()]);

    $titles = collect(listings(new ListingQuery(source: ListingQuery::SOURCE_EXTERNAL)))->pluck('title')->all();

    expect($titles)->toContain('Vânzare')
        ->and($titles)->not->toContain('Schimb')
        ->and($titles)->not->toContain('Cumpăr');
});

it('maps external fields to ListingCard (sourceSite, externalUrl, rentPeriod, pricePerM2, photos)', function () {
    $ag = CatalogSeed::agency('a-map');
    CatalogSeed::scraped([
        'agency_id' => $ag,
        'title' => 'Chirie zilnică',
        'source' => 'imobiliare_md',
        'transaction_type' => 'inchiriere_zilnica',
        'owner_type' => 'owner',
        'price' => 500,
        'area' => 50,
        'price_per_m2' => 10,
        'external_url' => 'https://imobiliare.md/x1',
        'images' => json_encode(['https://img/1.jpg', 'https://img/2.jpg']),
        'published_at' => now(),
    ]);

    $c = listings(new ListingQuery(source: ListingQuery::SOURCE_EXTERNAL))[0];

    expect($c->isExternal)->toBeTrue()
        ->and($c->dealType)->toBe('rent')
        ->and($c->rentPeriod)->toBe('day')
        ->and($c->ownerType)->toBe('owner')
        ->and($c->sourceSite)->toBe('imobiliare.md')
        ->and($c->externalUrl)->toBe('https://imobiliare.md/x1')
        ->and($c->pricePerM2)->toBe(10)
        ->and($c->photoCount)->toBe(2)
        ->and($c->photoUrl)->toBe('https://img/1.jpg')
        ->and($c->url)->toBe('/assistant/listing/external/' . $c->id);
});

it('resolves external scraped image paths to public /storage URLs, http passthrough', function () {
    $ag = CatalogSeed::agency('a-imgs');
    CatalogSeed::scraped([
        'agency_id' => $ag,
        'title' => 'Cu poze',
        'images' => json_encode([
            'scraped/104648474/01.jpg',            // cale locală a scraper-ului
            'https://i.simpalsmedia.com/x/02.jpg', // URL CDN extern
        ]),
        'published_at' => now(),
    ]);

    $c = listings(new ListingQuery(source: ListingQuery::SOURCE_EXTERNAL))[0];

    // calea locală e rezolvată prin discul public (ca la internal), NU rămâne brută
    expect($c->photoUrl)->toBe(Storage::disk('public')->url('scraped/104648474/01.jpg'))
        ->and($c->photoUrl)->not->toBe('scraped/104648474/01.jpg')
        ->and($c->photoUrl)->toContain('/storage/scraped/104648474/01.jpg')
        // URL-ul CDN extern trece neschimbat
        ->and($c->photos[1])->toBe('https://i.simpalsmedia.com/x/02.jpg')
        ->and($c->photoCount)->toBe(2);
});

it('caps results at 10 across the union', function () {
    $ag = CatalogSeed::agency('a-cap');
    for ($i = 0; $i < 8; $i++) {
        CatalogSeed::scraped(['agency_id' => $ag, 'title' => "Ext $i", 'published_at' => now()]);
    }
    $u = CatalogSeed::user($ag, 'cap@x.md');
    for ($i = 0; $i < 8; $i++) {
        CatalogSeed::property(['agency_id' => $ag, 'user_id' => $u, 'title' => "Int $i"]);
    }

    expect(listings(new ListingQuery(source: ListingQuery::SOURCE_ANY)))->toHaveCount(10);
});

/*
|--------------------------------------------------------------------------
| Price intelligence — marketDeltaPct (live median, per-currency bucket)
|--------------------------------------------------------------------------
| Bucket = type + transaction_type + city + currency, pooled internal+external.
| NOT read from ai_valuation (categorical label only — see PublicListingQuery
| docblock); computed live from actual price/area of comparable listings.
*/

it('computes marketDeltaPct against the live bucket median (internal+external pooled)', function () {
    $ag = CatalogSeed::agency('t-delta-basic');
    $u = CatalogSeed::user($ag, 'delta@x.md');

    // 5 comparabile la ppm=1000 EUR (3 externe + 2 interne) — median trivial = 1000
    for ($i = 0; $i < 3; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Ref ext $i", 'type' => 'apartment',
            'transaction_type' => 'sale', 'city' => 'Chișinău', 'currency' => 'EUR',
            'price' => 100000, 'area' => 100, 'published_at' => now(),
        ]);
    }
    for ($i = 0; $i < 2; $i++) {
        CatalogSeed::property([
            'agency_id' => $ag, 'user_id' => $u, 'title' => "Ref int $i", 'type' => 'apartment',
            'transaction_type' => 'sale', 'city' => 'Chișinău', 'currency' => 'EUR',
            'price' => 100000, 'area_total' => 100,
        ]);
    }
    // subiect la ppm=880 -> delta așteptat exact -12%
    CatalogSeed::scraped([
        'agency_id' => $ag, 'title' => 'Subiect Delta', 'type' => 'apartment',
        'transaction_type' => 'sale', 'city' => 'Chișinău', 'currency' => 'EUR',
        'price' => 88000, 'area' => 100, 'published_at' => now(),
    ]);

    $res = listings(new ListingQuery(text: 'Subiect Delta', source: ListingQuery::SOURCE_EXTERNAL));

    expect($res)->toHaveCount(1)
        ->and($res[0]->marketDeltaPct)->toBe(-12);

    // niciun câmp privat/intern (bucket/median/count) nu scapă în DTO
    $arr = $res[0]->toArray();
    expect($arr)->toHaveKey('marketDeltaPct')
        ->and($arr)->not->toHaveKey('median')
        ->and($arr)->not->toHaveKey('bucket')
        ->and($arr)->not->toHaveKey('sampleSize')
        ->and($arr)->not->toHaveKey('meta');
});

it('hides marketDeltaPct when the bucket has fewer than 5 comparables', function () {
    $ag = CatalogSeed::agency('t-delta-small');
    // 3 referințe + subiect = 4 total în bucket, sub pragul de 5
    for ($i = 0; $i < 3; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Ref mic $i", 'type' => 'house',
            'transaction_type' => 'sale', 'city' => 'Bălți', 'currency' => 'EUR',
            'price' => 50000, 'area' => 100, 'published_at' => now(),
        ]);
    }
    CatalogSeed::scraped([
        'agency_id' => $ag, 'title' => 'Subiect Mic', 'type' => 'house',
        'transaction_type' => 'sale', 'city' => 'Bălți', 'currency' => 'EUR',
        'price' => 40000, 'area' => 100, 'published_at' => now(),
    ]);

    $res = listings(new ListingQuery(text: 'Subiect Mic', source: ListingQuery::SOURCE_EXTERNAL));

    expect($res)->toHaveCount(1)
        ->and($res[0]->marketDeltaPct)->toBeNull();
});

it('hides marketDeltaPct when the deviation exceeds the 60% safety cap', function () {
    $ag = CatalogSeed::agency('t-delta-cap');
    // 5 referințe la ppm=100 EUR (median stabil la 100 chiar cu subiectul-outlier inclus)
    for ($i = 0; $i < 5; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Ref cap $i", 'type' => 'land',
            'transaction_type' => 'sale', 'city' => 'Orhei', 'currency' => 'EUR',
            'price' => 10000, 'area' => 100, 'published_at' => now(),
        ]);
    }
    // subiect la ppm=1000 -> deviație ~900%, mult peste plafonul de 60%
    CatalogSeed::scraped([
        'agency_id' => $ag, 'title' => 'Subiect Absurd', 'type' => 'land',
        'transaction_type' => 'sale', 'city' => 'Orhei', 'currency' => 'EUR',
        'price' => 100000, 'area' => 100, 'published_at' => now(),
    ]);

    $res = listings(new ListingQuery(text: 'Subiect Absurd', source: ListingQuery::SOURCE_EXTERNAL));

    expect($res)->toHaveCount(1)
        ->and($res[0]->marketDeltaPct)->toBeNull();
});

it('keeps currencies isolated — MDL bucket never borrows the EUR median', function () {
    $ag = CatalogSeed::agency('t-delta-currency');
    // bucket EUR: 5 comparabile la ppm=1000 EUR (numeric complet diferit de MDL)
    for ($i = 0; $i < 5; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "EUR ref $i", 'type' => 'apartment',
            'transaction_type' => 'sale', 'city' => 'Comrat', 'currency' => 'EUR',
            'price' => 100000, 'area' => 100, 'published_at' => now(),
        ]);
    }
    // bucket MDL: 5 comparabile la ppm=20000 MDL + subiect la ppm=17600 -> delta real -12% față de MDL
    for ($i = 0; $i < 5; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "MDL ref $i", 'type' => 'apartment',
            'transaction_type' => 'sale', 'city' => 'Comrat', 'currency' => 'MDL',
            'price' => 2000000, 'area' => 100, 'published_at' => now(),
        ]);
    }
    CatalogSeed::scraped([
        'agency_id' => $ag, 'title' => 'Subiect MDL', 'type' => 'apartment',
        'transaction_type' => 'sale', 'city' => 'Comrat', 'currency' => 'MDL',
        'price' => 1760000, 'area' => 100, 'published_at' => now(),
    ]);

    $res = listings(new ListingQuery(text: 'Subiect MDL', source: ListingQuery::SOURCE_EXTERNAL));

    // dacă bucket-urile s-ar fi amestecat, delta ar fi fost calculat față de medianul EUR=1000
    // (un număr absurd, >60%, ascuns); obținerea EXACT -12% dovedeste izolarea pe valută.
    expect($res)->toHaveCount(1)
        ->and($res[0]->marketDeltaPct)->toBe(-12);
});

it('applies the identical delta formula to internal and external listings in the same bucket (symmetry)', function () {
    $ag = CatalogSeed::agency('t-delta-symmetry');
    $u = CatalogSeed::user($ag, 'sym@x.md');

    // 4 referințe externe la ppm=100 EUR + câte un subiect intern/extern la ppm=90
    for ($i = 0; $i < 4; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Sym ref $i", 'type' => 'house',
            'transaction_type' => 'rent', 'city' => 'Ungheni', 'currency' => 'EUR',
            'price' => 5000, 'area' => 50, 'published_at' => now(),
        ]);
    }
    CatalogSeed::property([
        'agency_id' => $ag, 'user_id' => $u, 'title' => 'Subiect Intern', 'type' => 'house',
        'transaction_type' => 'rent', 'city' => 'Ungheni', 'currency' => 'EUR',
        'price' => 4500, 'area_total' => 50,
    ]);
    CatalogSeed::scraped([
        'agency_id' => $ag, 'title' => 'Subiect Extern', 'type' => 'house',
        'transaction_type' => 'rent', 'city' => 'Ungheni', 'currency' => 'EUR',
        'price' => 4500, 'area' => 50, 'published_at' => now(),
    ]);

    $res = listings(new ListingQuery(propertyType: 'house', dealType: 'rent', source: ListingQuery::SOURCE_ANY));
    $intern = collect($res)->first(fn ($c) => $c->title === 'Subiect Intern');
    $extern = collect($res)->first(fn ($c) => $c->title === 'Subiect Extern');

    expect($intern)->not->toBeNull()
        ->and($extern)->not->toBeNull()
        ->and($intern->marketDeltaPct)->toBe(-10)
        ->and($extern->marketDeltaPct)->toBe(-10);
});

it('computes market deltas with ONE batched query, not per-card (no N+1)', function () {
    $ag = CatalogSeed::agency('t-delta-batch');
    // 8 carduri, TOATE în același bucket -> un singur median trebuie calculat, nu 8
    for ($i = 0; $i < 8; $i++) {
        CatalogSeed::scraped([
            'agency_id' => $ag, 'title' => "Batch $i", 'type' => 'apartment',
            'transaction_type' => 'sale', 'city' => 'Soroca', 'currency' => 'EUR',
            'price' => 60000 + $i * 100, 'area' => 60, 'published_at' => now(),
        ]);
    }

    DB::enableQueryLog();
    $res = listings(new ListingQuery(city: 'Soroca', source: ListingQuery::SOURCE_EXTERNAL));
    $queries = DB::getQueryLog();
    DB::flushQueryLog();
    DB::disableQueryLog();

    $medianQueries = collect($queries)
        ->filter(fn ($q) => str_contains(strtolower($q['query']), 'union'))
        ->count();

    expect($res)->toHaveCount(8)
        ->and(collect($res)->every(fn ($c) => $c->marketDeltaPct !== null))->toBeTrue()
        ->and($medianQueries)->toBe(1) // o singură interogare de mediane, nu una per card
        ->and(count($queries))->toBeLessThanOrEqual(3);
});
