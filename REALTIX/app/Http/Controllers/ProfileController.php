<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     *
     * Owner (admin de agenție): anulează imediat abonamentul Stripe (cancelNow,
     * fără grace period — userul pleacă acum), apoi șterge agenția (cascade
     * pe properties/contacts/deals/contracts/etc.) și user-ul.
     * Non-owner (realtor): șterge doar user-ul; FK users.agency_id e nullOnDelete,
     * deci datele agenției rămân intacte.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user    = $request->user();
        $agency  = $user->agency;
        $isOwner = ($user->isAdmin() || $user->isSuperAdmin()) && $agency !== null;

        if ($isOwner && $agency->subscribed('default')) {
            try {
                $agency->subscription('default')->cancelNow();
            } catch (\Throwable $e) {
                Log::error('Account deletion: subscription cancelNow failed', [
                    'agency_id' => $agency->id,
                    'user_id'   => $user->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }

        Auth::logout();

        if ($isOwner) {
            $agency->delete();
        }

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
