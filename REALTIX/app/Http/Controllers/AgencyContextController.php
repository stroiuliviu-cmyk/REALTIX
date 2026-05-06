<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AgencyContextController extends Controller
{
    public function switch(Request $request, Agency $agency): RedirectResponse
    {
        $user = $request->user();

        // Verify user is linked to that agency
        $link = $user->linkedAgencies()->where('agencies.id', $agency->id)->first();

        if (! $link) {
            abort(403, 'Nu ai acces la această agenție.');
        }

        // Switch active context
        $user->update(['agency_id' => $agency->id]);

        // Sync Spatie role to match the role for the new agency
        $newRole = $link->pivot->role ?? 'realtor';
        if (in_array($newRole, ['admin', 'realtor'], true)) {
            $user->syncRoles([$newRole]);
        }

        return back()->with('success', 'Profil schimbat la „' . $agency->name . '".');
    }
}
