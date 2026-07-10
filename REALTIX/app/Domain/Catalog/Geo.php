<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

/**
 * Normalizes the dirty free-text `city`/`district` from listings towards the
 * canonical Moldova vocabulary (mirrors resources/js/Constants/moldova.js:
 * CHISINAU_SECTORS + raioane). Diacritic- and case-insensitive matching with a
 * few common Cyrillic/transliterated aliases. Phase 1: best-effort, non-mutating.
 */
final class Geo
{
    /** Canonical urban sectors of Chișinău. */
    public const CHISINAU_SECTORS = [
        'Aeroport', 'Botanica', 'Buiucani', 'Centru', 'Ciocana',
        'Poșta Veche', 'Râșcani', 'Sculeni', 'Telecentru',
    ];

    /** key() => canonical city */
    private const CITY_ALIASES = [
        'chisinau' => 'Chișinău',
        'kishinev' => 'Chișinău',
        'kishinyov' => 'Chișinău',
        'kishineu' => 'Chișinău',
        'chisineu' => 'Chișinău',
        'кишинев' => 'Chișinău',
        'кишинёв' => 'Chișinău',
    ];

    /** key() => canonical sector (for spellings not caught by direct match) */
    private const DISTRICT_ALIASES = [
        'riscani' => 'Râșcani',
        'рышкановка' => 'Râșcani',
        'рышканы' => 'Râșcani',
        'ботаника' => 'Botanica',
        'буюканы' => 'Buiucani',
        'чеканы' => 'Ciocana',
        'центр' => 'Centru',
        'телецентр' => 'Telecentru',
        'posta veche' => 'Poșta Veche',
    ];

    public static function normalizeCity(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }
        $key = self::key($value);

        if (isset(self::CITY_ALIASES[$key])) {
            return self::CITY_ALIASES[$key];
        }
        // Title-case fallback for clean-ish input.
        return self::titleCase(trim($value));
    }

    public static function normalizeDistrict(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }
        $key = self::key($value);

        foreach (self::CHISINAU_SECTORS as $sector) {
            $sk = self::key($sector);
            if ($key === $sk || str_contains($key, $sk)) {
                return $sector;
            }
        }
        if (isset(self::DISTRICT_ALIASES[$key])) {
            return self::DISTRICT_ALIASES[$key];
        }

        return self::titleCase(trim($value));
    }

    /**
     * Lowercase LIKE-needles covering the known dirty variants of a city
     * (canonical + diacritic-stripped + transliterated/Cyrillic aliases).
     * Used by the SQL layer to match rows stored with inconsistent spelling.
     *
     * @return list<string>
     */
    public static function cityNeedles(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }
        $needles = [mb_strtolower(trim($value)), self::key($value)];

        $canonical = self::normalizeCity($value);
        if ($canonical !== null) {
            $needles[] = mb_strtolower($canonical);
            $needles[] = self::key($canonical);
            foreach (self::CITY_ALIASES as $alias => $canon) {
                if ($canon === $canonical) {
                    $needles[] = $alias;
                }
            }
        }

        return array_values(array_unique(array_filter($needles)));
    }

    /**
     * Same as cityNeedles() for districts/sectors (best-effort — rows stored
     * with unlisted spellings are matched only when SQL LOWER folds them).
     *
     * @return list<string>
     */
    public static function districtNeedles(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }
        $needles = [mb_strtolower(trim($value)), self::key($value)];

        $canonical = self::normalizeDistrict($value);
        if ($canonical !== null) {
            $needles[] = mb_strtolower($canonical);
            $needles[] = self::key($canonical);
            foreach (self::DISTRICT_ALIASES as $alias => $canon) {
                if ($canon === $canonical) {
                    $needles[] = $alias;
                }
            }
        }

        return array_values(array_unique(array_filter($needles)));
    }

    /**
     * Diacritic-/case-insensitive city equality on the canonical forms —
     * 'Balti', 'Bălți' and 'Кишинев'/'Chișinău' compare via the same key,
     * so a query without diacritics still matches the normalized value.
     */
    public static function isSameCity(?string $a, ?string $b): bool
    {
        $ca = self::normalizeCity($a);
        $cb = self::normalizeCity($b);
        if ($ca === null || $cb === null) {
            return false;
        }

        return self::key($ca) === self::key($cb);
    }

    /** Diacritic- and case-insensitive comparison key. */
    private static function key(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $from = ['ă', 'â', 'î', 'ș', 'ş', 'ț', 'ţ'];
        $to = ['a', 'a', 'i', 's', 's', 't', 't'];

        return str_replace($from, $to, $value);
    }

    private static function titleCase(string $value): string
    {
        return mb_convert_case($value, MB_CASE_TITLE, 'UTF-8');
    }
}
