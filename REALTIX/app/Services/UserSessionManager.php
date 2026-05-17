<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Hard-revoke all sessions + remember token for a user. Used when an admin
 * deactivates an agent or a super admin force-logs-out a user.
 */
class UserSessionManager
{
    public function revokeAll(User $user): int
    {
        $deleted = DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->forceFill(['remember_token' => null])->save();
        return (int) $deleted;
    }
}
