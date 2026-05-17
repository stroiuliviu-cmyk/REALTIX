<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Helper around the cache keys that drive the 999.md scraper lifecycle.
 *
 * Three signals live here:
 *  - `scraper_blocked` (bool flag, TTL set by the failing command)
 *    Set when the Python script exits with code 42 (block detected). The
 *    Laravel scheduler skips morning/hourly runs while this flag is present.
 *  - `scraper_recent_failures` (int counter)
 *    Bumped on each non-block failure (timeout, generic error). After 3
 *    failures inside an hour we treat the scraper as unhealthy and pause.
 *  - `scraper_last_success` (ISO timestamp)
 *    Refreshed on every clean run for monitoring / status pages.
 */
class ScraperHealthService
{
    public function isBlocked(): bool
    {
        return (bool) Cache::get('scraper_blocked', false);
    }

    public function markSuccessfulRun(): void
    {
        Cache::put('scraper_last_success', now()->toIso8601String(), now()->addDays(7));
        // A clean run also clears recent-failure pressure.
        Cache::forget('scraper_recent_failures');
    }

    public function getLastSuccessfulRun(): ?Carbon
    {
        $timestamp = Cache::get('scraper_last_success');
        return $timestamp ? Carbon::parse($timestamp) : null;
    }

    public function getDailyCount(): int
    {
        return (int) DB::table('scraped_listings')
            ->where('source', '999md')
            ->whereDate('created_at', today())
            ->count();
    }

    /**
     * Listings per day for the last 7 days, ordered most-recent first.
     * Returned as a plain array of { date, count } stdClass objects so it
     * can be serialized straight to Inertia.
     */
    public function getStats7Days(): array
    {
        return DB::table('scraped_listings')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('source', '999md')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at) DESC')
            ->get()
            ->toArray();
    }

    public function shouldSkipNextRun(): bool
    {
        if ($this->isBlocked()) {
            return true;
        }
        $recentFailures = (int) Cache::get('scraper_recent_failures', 0);
        return $recentFailures >= 3;
    }
}
