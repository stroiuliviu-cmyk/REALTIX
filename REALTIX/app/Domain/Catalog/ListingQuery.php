<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

/**
 * Criteria for a public catalog search. Pure value object (no framework deps).
 *
 * Extended (Faza 3, tool layer) with the full public filter set: city, price
 * range + currency, rooms/area ranges, owner_type and site. Prices are always
 * interpreted in ONE currency (default EUR when a price bound is set) — the
 * catalog never converts between currencies.
 */
final class ListingQuery
{
    public const SOURCE_ANY = 'any';
    public const SOURCE_INTERNAL = 'internal';
    public const SOURCE_EXTERNAL = 'external';

    public const SORT_NEWEST = 'newest';
    public const SORT_PRICE_ASC = 'price_asc';
    public const SORT_PRICE_DESC = 'price_desc';

    public const MAX_RESULTS = 10;

    public function __construct(
        public readonly ?string $text = null,
        public readonly string $source = self::SOURCE_ANY,   // any|internal|external
        public readonly ?string $district = null,
        public readonly ?int $rooms = null,                  // exact match (legacy)
        public readonly ?string $dealType = null,            // sale|rent
        public readonly ?string $propertyType = null,        // apartment|house|villa|commercial|land|office|garage
        public readonly string $sort = self::SORT_NEWEST,
        public readonly int $page = 1,
        public readonly int $perPage = self::MAX_RESULTS,
        // --- extended filters (assistant tools) ---
        public readonly ?string $city = null,
        public readonly ?float $priceMin = null,
        public readonly ?float $priceMax = null,
        public readonly ?string $currency = null,            // EUR|MDL|USD
        public readonly ?int $roomsMin = null,
        public readonly ?int $roomsMax = null,
        public readonly ?float $areaMin = null,
        public readonly ?float $areaMax = null,
        public readonly ?string $ownerType = null,           // owner|agency
        public readonly ?string $site = null,                // 999.md|imobiliare.md|piata.md (external only)
    ) {
    }

    /** Per-page, hard-capped at MAX_RESULTS (≤10). */
    public function limit(): int
    {
        return max(1, min($this->perPage, self::MAX_RESULTS));
    }

    public function offset(): int
    {
        return max(0, ($this->page - 1) * $this->limit());
    }

    public function wantsInternal(): bool
    {
        return $this->source === self::SOURCE_ANY || $this->source === self::SOURCE_INTERNAL;
    }

    public function wantsExternal(): bool
    {
        return $this->source === self::SOURCE_ANY || $this->source === self::SOURCE_EXTERNAL;
    }

    /**
     * Whether the internal (properties) branch can produce matches at all:
     * internal listings have no source site and are always agency inventory,
     * so `site` or `ownerType=owner` restricts the search to external rows.
     */
    public function appliesToInternal(): bool
    {
        return $this->site === null && $this->ownerType !== 'owner';
    }
}
