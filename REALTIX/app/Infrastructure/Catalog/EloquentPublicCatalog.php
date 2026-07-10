<?php

declare(strict_types=1);

namespace App\Infrastructure\Catalog;

use App\Domain\Catalog\Contracts\PublicCatalog;
use App\Domain\Catalog\ListingDetails;
use App\Domain\Catalog\ListingQuery;

/**
 * Eloquent-backed implementation of the PublicCatalog seam. Delegates to the two
 * focused query objects. This (Infrastructure\Catalog) is the ONLY layer allowed
 * to touch the catalog Eloquent models.
 */
final class EloquentPublicCatalog implements PublicCatalog
{
    public function __construct(
        private readonly PublicListingQuery $listings,
        private readonly PublicAgencyQuery $agencies,
    ) {
    }

    /** {@inheritDoc} */
    public function searchListings(ListingQuery $query): array
    {
        return $this->listings->search($query);
    }

    /** {@inheritDoc} */
    public function getListing(string $source, string $id): ?ListingDetails
    {
        return $this->listings->find($source, $id);
    }

    /** {@inheritDoc} */
    public function searchAgencies(
        ?string $text = null,
        ?string $city = null,
        ?string $specialization = null,
        int $limit = 10,
    ): array {
        return $this->agencies->search($text, $city, $specialization, $limit);
    }
}
