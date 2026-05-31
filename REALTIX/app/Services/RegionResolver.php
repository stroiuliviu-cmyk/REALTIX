<?php

namespace App\Services;

/**
 * Map a (city, district) tuple to its 999.md region key.
 *
 * Mirrors the Python `resolve_region` in python_scraper/scraper_999.py so the
 * scraped offers and locally-stored properties agree on raion attribution.
 *
 * Returns null when ambiguous (locality belongs to several raions) or unknown
 * (locality not in catalog). Callers should treat null as "no raion known".
 */
class RegionResolver
{
    /** @var array<string, array{sectors?: list<string>, localities?: list<string>}>|null */
    private static ?array $regions = null;

    /** @var array<string, true>|null Sectors of Chișinău mun. — flat set for fast lookup. */
    private static ?array $sectors = null;

    /** @var array<string, list<string>>|null Inverse index: locality → list of raions. */
    private static ?array $localityToRegions = null;

    public static function resolve(?string $city, ?string $district): ?string
    {
        if ($city === null || $city === '') {
            return null;
        }

        self::ensureLoaded();

        // Chișinău sectors live on either column depending on the scraper feed.
        if (isset(self::$sectors[$city]) || ($district !== null && isset(self::$sectors[$district]))) {
            return 'Chișinău mun.';
        }

        // City is itself a raion key (e.g. "Cantemir" town in "Cantemir" raion).
        if (isset(self::$regions[$city])) {
            return $city;
        }

        // Unambiguous locality lookup.
        $regions = self::$localityToRegions[$city] ?? null;
        if ($regions !== null && count($regions) === 1) {
            return $regions[0];
        }

        return null;
    }

    /** Drop the in-memory cache — useful for tests that swap the catalog file. */
    public static function flushCache(): void
    {
        self::$regions = null;
        self::$sectors = null;
        self::$localityToRegions = null;
    }

    private static function ensureLoaded(): void
    {
        if (self::$regions !== null) {
            return;
        }

        $regions = self::loadCatalog();
        self::$regions = $regions;

        $sectors = [];
        foreach ($regions['Chișinău mun.']['sectors'] ?? [] as $s) {
            $sectors[$s] = true;
        }
        self::$sectors = $sectors;

        $index = [];
        foreach ($regions as $raion => $entry) {
            foreach ($entry['localities'] ?? [] as $loc) {
                $index[$loc][] = $raion;
            }
        }
        self::$localityToRegions = $index;
    }

    /**
     * Read the catalog from the first existing path among: env override,
     * production shared path, repo fallback. Returns [] on total miss so the
     * resolver becomes a safe no-op (always null) rather than crashing.
     *
     * @return array<string, array{sectors?: list<string>, localities?: list<string>}>
     */
    private static function loadCatalog(): array
    {
        $candidates = array_filter([
            config('locations.catalog_path'),
            ...config('locations.catalog_search_paths', []),
        ]);

        foreach ($candidates as $path) {
            if (! is_string($path) || ! is_file($path)) {
                continue;
            }
            $raw = @file_get_contents($path);
            if ($raw === false) {
                continue;
            }
            $decoded = json_decode($raw, true);
            if (! is_array($decoded) || ! isset($decoded['regions']) || ! is_array($decoded['regions'])) {
                continue;
            }
            return $decoded['regions'];
        }

        return [];
    }
}
