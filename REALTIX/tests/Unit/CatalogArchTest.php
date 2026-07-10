<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Public catalog seam — architecture guards
|--------------------------------------------------------------------------
|
| The catalog is a hexagonal seam: App\Domain\Catalog holds the contract +
| pure DTOs (no framework, no Eloquent); App\Infrastructure\Catalog is the ONE
| layer allowed to touch the Eloquent models. Consumers (Application/Http, e.g.
| the future ChatService + assistant controllers) must depend on the
| PublicCatalog contract and the DTOs — never on Property/ScrapedListing/Agency.
|
| Note: a global "app/Http must not use App\Models" rule is intentionally NOT
| asserted here — the legacy CRM Http layer uses those models throughout. The
| guard below is scoped to the catalog seam; extend the `toOnlyBeUsedIn` list
| when the assistant's own Application/Http namespace is introduced.
*/

arch('catalog domain layer is free of Eloquent models and the DB')
    ->expect('App\Domain\Catalog')
    ->not->toUse([
        'App\Models\Property',
        'App\Models\ScrapedListing',
        'App\Models\Agency',
        'Illuminate\Database\Eloquent\Model',
        'Illuminate\Support\Facades\DB',
    ]);

arch('the PublicCatalog contract exposes only Domain types')
    ->expect('App\Domain\Catalog\Contracts\PublicCatalog')
    ->not->toUse('App\Models');

arch('Infrastructure\Catalog depends on the Domain seam')
    ->expect('App\Infrastructure\Catalog')
    ->toUse('App\Domain\Catalog');

arch('the assistant application layer never touches Eloquent models or the DB')
    ->expect('App\Application')
    ->not->toUse([
        'App\Models',
        'Illuminate\Database',
        'App\Infrastructure', // Application depends on the contract, not the implementation
    ]);
