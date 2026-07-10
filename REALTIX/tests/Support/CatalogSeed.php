<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

/**
 * Direct DB seeding for catalog tests (bypasses Eloquent events / global scopes,
 * so we exercise PublicListingQuery against raw rows).
 */
final class CatalogSeed
{
    public static function agency(string $slug, string $name = 'Agenție'): int
    {
        return (int) DB::table('agencies')->insertGetId([
            'name' => $name,
            'slug' => $slug,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public static function user(int $agencyId, string $email): int
    {
        return (int) DB::table('users')->insertGetId([
            'agency_id' => $agencyId,
            'name' => 'Agent',
            'email' => $email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @param array<string,mixed> $attrs */
    public static function property(array $attrs): int
    {
        return (int) DB::table('properties')->insertGetId(array_merge([
            'title' => 'Obiect intern',
            'type' => 'apartment',
            'transaction_type' => 'sale',
            'price' => 50000,
            'currency' => 'EUR',
            'city' => 'Chișinău',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ], $attrs));
    }

    /** @param array<string,mixed> $attrs */
    public static function scraped(array $attrs): int
    {
        $rid = 'ext-' . uniqid();

        return (int) DB::table('scraped_listings')->insertGetId(array_merge([
            'source' => '999md',
            'external_id' => $rid,
            'external_url' => 'https://999.md/' . $rid,
            'title' => 'Obiect extern',
            'type' => 'apartment',
            'transaction_type' => 'sale',
            'price' => 50000,
            'currency' => 'EUR',
            'city' => 'Chișinău',
            'images' => json_encode([]),
            'published_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ], $attrs));
    }
}
