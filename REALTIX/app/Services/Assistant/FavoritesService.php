<?php

declare(strict_types=1);

namespace App\Services\Assistant;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Anonymous-favorites store for the assistant. Favorites are keyed by
 * owner_token (the anonymous cookie) in the `favorites` table; on login they
 * are re-attached to the user account.
 *
 * Only mergeIntoAccount is needed for Etapa B (favorite persistence has its own
 * surface); the merge is the seam the login/register listener calls.
 */
final class FavoritesService
{
    /**
     * Re-attach an anonymous owner's favorites to a user account. Idempotent
     * (a second run finds no unattached rows) and de-duplicated: if the user
     * already has a favorite for the same object, the anonymous row is dropped
     * instead of creating a duplicate.
     */
    public function mergeIntoAccount(string $ownerToken, int $userId): void
    {
        $anon = DB::table('favorites')
            ->whereNull('user_id')
            ->where('owner_token', $ownerToken)
            ->get();

        foreach ($anon as $row) {
            $alreadyOwned = DB::table('favorites')
                ->where('user_id', $userId)
                ->where('listing_id', $row->listing_id)
                ->where('source', $row->source)
                ->exists();

            if ($alreadyOwned) {
                DB::table('favorites')->where('id', $row->id)->delete();
            } else {
                DB::table('favorites')
                    ->where('id', $row->id)
                    ->update(['user_id' => $userId, 'updated_at' => Carbon::now()]);
            }
        }
    }
}
