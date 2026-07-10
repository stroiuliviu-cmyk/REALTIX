<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Contracts;

use App\Domain\Catalog\AgencyCard;
use App\Domain\Catalog\ListingCard;
use App\Domain\Catalog\ListingDetails;
use App\Domain\Catalog\ListingQuery;

/**
 * The public, read-only catalog seam. The Application/Http layers depend on THIS
 * interface (+ the DTOs) — never on the Eloquent models directly. The concrete
 * implementation lives in App\Infrastructure\Catalog.
 */
interface PublicCatalog
{
    /**
     * Unified public search over internal + external listings (≤10 results).
     *
     * @return list<ListingCard>
     */
    public function searchListings(ListingQuery $query): array;

    /**
     * Extended PUBLIC details for one listing. Returns null when the listing
     * does not exist or is not publicly visible (inactive / non-published /
     * excluded transaction type) — same visibility rules as searchListings().
     *
     * @param string $source 'internal'|'external'
     */
    public function getListing(string $source, string $id): ?ListingDetails;

    /**
     * Public agency directory. City/specialization filter on the DERIVED
     * values (most-frequent city, distinct types of active listings).
     *
     * @param string|null $specialization apartment|house|villa|commercial|land|office|garage
     * @return list<AgencyCard>
     */
    public function searchAgencies(
        ?string $text = null,
        ?string $city = null,
        ?string $specialization = null,
        int $limit = 10,
    ): array;
}
