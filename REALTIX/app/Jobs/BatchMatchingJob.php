<?php

namespace App\Jobs;

use App\Models\SavedSearch;
use App\Models\ScrapedListing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Picks up scraped_listings that have not yet been evaluated against the
 * active SavedSearch records (matched_at IS NULL) and dispatches one
 * NotifyUserOfMatchesJob per user that had at least one matching listing.
 *
 * Runs every 30 minutes between 06:30 and 22:30 (see routes/console.php).
 */
class BatchMatchingJob implements ShouldQueue
{
    use Queueable;

    public int $tries   = 2;
    public int $timeout = 300;

    public function handle(): void
    {
        // Recent scraped listings the matcher hasn't seen yet. The 2-hour
        // safety window guards against weird clock skew but the WHERE
        // matched_at IS NULL guarantees idempotency.
        $cutoff = now()->subHours(2);

        $newListings = ScrapedListing::query()
            ->where('source', '999md')
            ->where('created_at', '>=', $cutoff)
            ->whereNull('matched_at')
            ->get();

        if ($newListings->isEmpty()) {
            Log::info('BatchMatching: no new listings to match');
            return;
        }

        Log::info("BatchMatching: processing {$newListings->count()} new listings");

        // Load active saved searches once — N×M evaluation, all in-memory.
        $searches = SavedSearch::query()->where('is_active', true)->get();

        if ($searches->isEmpty()) {
            // Still mark listings as processed so we don't reconsider them.
            ScrapedListing::query()
                ->whereIn('id', $newListings->pluck('id'))
                ->update(['matched_at' => now()]);
            Log::info('BatchMatching: no active saved searches');
            return;
        }

        /** @var array<int, array<int>> $matchesByUser */
        $matchesByUser = [];

        foreach ($newListings as $listing) {
            foreach ($searches as $search) {
                if ($search->matchListing($listing)) {
                    $matchesByUser[$search->user_id][] = $listing->id;
                }
            }
        }

        foreach ($matchesByUser as $userId => $listingIds) {
            NotifyUserOfMatchesJob::dispatch(
                userId: (int) $userId,
                listingIds: array_values(array_unique($listingIds)),
            )->onQueue('notifications');
        }

        ScrapedListing::query()
            ->whereIn('id', $newListings->pluck('id'))
            ->update(['matched_at' => now()]);

        // Refresh last_matched_at on the searches that fired.
        $touchedSearchIds = [];
        foreach ($newListings as $listing) {
            foreach ($searches as $search) {
                if ($search->matchListing($listing)) {
                    $touchedSearchIds[$search->id] = true;
                }
            }
        }
        if ($touchedSearchIds) {
            SavedSearch::query()
                ->whereIn('id', array_keys($touchedSearchIds))
                ->update(['last_matched_at' => now()]);
        }

        Log::info('BatchMatching: notified ' . count($matchesByUser) . ' users');
    }
}
