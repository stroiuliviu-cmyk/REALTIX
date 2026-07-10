<?php

declare(strict_types=1);

namespace App\Services\Assistant;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Free-result quota engine (TZ §4.10). A "result" is a unique listing object;
 * only the first time an owner sees an object does it cost quota — revisiting a
 * counted object is free. Identity is user_id for logged-in users, or
 * owner_token OR ip_hash for anonymous ones (distinct objects across BOTH, so
 * clearing the cookie does not reset the quota).
 *
 * Sources of truth:
 *  - assistant_quota_seen  → the set of unique objects consumed ("used").
 *  - assistant_quota_ledger → the purchased balance (0 in C1, no Stripe yet).
 */
final class QuotaService
{
    public function freeLimit(): int
    {
        return (int) config('assistant.free_result_limit', 50);
    }

    /**
     * @return array{used:int, freeLimit:int, purchased:int, remaining:int}
     */
    public function status(QuotaOwner $owner): array
    {
        $used = count($this->seenKeys($owner));
        $purchased = $this->purchasedTotal($owner);
        $free = $this->freeLimit();

        return [
            'used' => $used,
            'freeLimit' => $free,
            'purchased' => $purchased,
            'remaining' => max(0, $free + $purchased - $used),
        ];
    }

    /**
     * Charge the quota for a batch of search-result listings.
     *
     * Each object not already in the owner's seen-set is a new charge; already
     * seen objects are free. New objects are marked only while `remaining`
     * lasts — the rest are left unmarked and the batch is truncated there.
     *
     * @param iterable<int,object|array<string,mixed>> $listings each with id + source
     */
    public function consume(QuotaOwner $owner, iterable $listings): QuotaConsumeResult
    {
        $free = $this->freeLimit();
        $purchased = $this->purchasedTotal($owner);

        $seen = $this->seenKeys($owner);           // key "source:id" => true
        $used = count($seen);
        $remaining = max(0, $free + $purchased - $used);

        $countedNew = 0;
        $keptCount = 0;
        $exceeded = false;
        $index = 0;

        foreach ($listings as $listing) {
            [$id, $source] = $this->pair($listing);
            $key = $source . ':' . $id;

            if (isset($seen[$key])) {
                // already counted → revisit is free, keep it visible
                $keptCount = $index + 1;
                $index++;
                continue;
            }

            // a genuinely new object costs quota
            if ($countedNew >= $remaining) {
                $exceeded = true;   // no room left — truncate the batch here
                break;
            }

            $this->markSeen($owner, $id, $source);
            $seen[$key] = true;     // guards duplicates within the same batch
            $countedNew++;
            $keptCount = $index + 1;
            $index++;
        }

        $newUsed = $used + $countedNew;

        return new QuotaConsumeResult(
            countedNew: $countedNew,
            used: $newUsed,
            remaining: max(0, $free + $purchased - $newUsed),
            limit: $free + $purchased,
            exceeded: $exceeded,
            keptCount: $keptCount,
        );
    }

    /**
     * Attach an anonymous owner's quota (seen objects + purchased ledger) to a
     * user account after login/register. Dedup is intrinsic: "used" counts
     * DISTINCT (listing_id, source), so duplicate rows never inflate the total.
     * (Etapa B should call this from its account-merge hook.)
     */
    public function mergeIntoAccount(string $ownerToken, ?string $ipHash, int $userId): void
    {
        DB::table('assistant_quota_seen')
            ->whereNull('user_id')
            ->where(function (Builder $q) use ($ownerToken, $ipHash): void {
                $q->where('owner_token', $ownerToken);
                if ($ipHash !== null) {
                    $q->orWhere('ip_hash', $ipHash);
                }
            })
            ->update(['user_id' => $userId]);

        DB::table('assistant_quota_ledger')
            ->whereNull('user_id')
            ->where('owner_token', $ownerToken)
            ->update(['user_id' => $userId, 'updated_at' => Carbon::now()]);
    }

    // ------------------------------------------------------------------ internals

    /**
     * Distinct objects in the owner's identity set, as a "source:id" lookup map.
     *
     * @return array<string,true>
     */
    private function seenKeys(QuotaOwner $owner): array
    {
        $rows = DB::table('assistant_quota_seen')
            ->select('listing_id', 'source')
            ->where(fn (Builder $q) => $this->identityWhere($q, $owner))
            ->get();

        $set = [];
        foreach ($rows as $row) {
            $set[$row->source . ':' . $row->listing_id] = true;
        }

        return $set;
    }

    private function identityWhere(Builder $query, QuotaOwner $owner): void
    {
        if ($owner->isAuthenticated()) {
            $query->where('user_id', $owner->userId);

            return;
        }

        $query->where('owner_token', $owner->ownerToken);
        if ($owner->ipHash !== null) {
            $query->orWhere('ip_hash', $owner->ipHash);
        }
    }

    private function purchasedTotal(QuotaOwner $owner): int
    {
        $query = DB::table('assistant_quota_ledger');
        if ($owner->isAuthenticated()) {
            $query->where('user_id', $owner->userId);
        } else {
            $query->where('owner_token', $owner->ownerToken);
        }

        return (int) $query->sum('purchased_total');
    }

    private function markSeen(QuotaOwner $owner, string $listingId, string $source): void
    {
        // Idempotent on unique(owner_token, listing_id, source).
        DB::table('assistant_quota_seen')->insertOrIgnore([
            'owner_token' => $owner->ownerToken,
            'user_id' => $owner->userId,
            'ip_hash' => $owner->ipHash,
            'listing_id' => $listingId,
            'source' => $source,
            'seen_at' => Carbon::now(),
        ]);
    }

    /**
     * @param object|array<string,mixed> $listing
     * @return array{0:string,1:string} [id, source]
     */
    private function pair(object|array $listing): array
    {
        if (is_array($listing)) {
            return [(string) ($listing['id'] ?? ''), (string) ($listing['source'] ?? '')];
        }

        return [(string) ($listing->id ?? ''), (string) ($listing->source ?? '')];
    }
}
