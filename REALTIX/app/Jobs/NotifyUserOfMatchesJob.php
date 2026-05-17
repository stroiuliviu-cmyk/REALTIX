<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\NewListingsMatched;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Delivers a single grouped notification to one user with the list of fresh
 * scraped_listings that matched any of their saved searches. Dispatched by
 * BatchMatchingJob once per affected user per matching batch.
 */
class NotifyUserOfMatchesJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @param array<int> $listingIds */
    public function __construct(
        public readonly int   $userId,
        public readonly array $listingIds,
    ) {}

    public function handle(): void
    {
        if ($this->listingIds === []) {
            return;
        }

        $user = User::find($this->userId);
        if (! $user) {
            Log::info("NotifyUserOfMatches: user {$this->userId} no longer exists");
            return;
        }

        $user->notify(new NewListingsMatched($this->listingIds));
    }
}
