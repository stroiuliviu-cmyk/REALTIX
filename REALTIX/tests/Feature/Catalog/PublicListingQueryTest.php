<?php

declare(strict_types=1);

use App\Domain\Catalog\ListingQuery;
use App\Infrastructure\Catalog\PublicListingQuery;
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
