<?php

namespace App\Http\Controllers;

use App\Models\AgencyInvitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $invitation = AgencyInvitation::with(['agency:id,name,slug,logo_path', 'invitedBy:id,name'])
            ->where('token', $token)
            ->first();

        if (! $invitation) {
            return Inertia::render('Invitations/Accept', [
                'invitation' => null,
                'error'      => 'Invitație inexistentă sau invalidă.',
            ]);
        }

        if ($invitation->isAccepted()) {
            return Inertia::render('Invitations/Accept', [
                'invitation' => null,
                'error'      => 'Această invitație a fost deja acceptată.',
            ]);
        }

        if ($invitation->isExpired()) {
            return Inertia::render('Invitations/Accept', [
                'invitation' => null,
                'error'      => 'Invitația a expirat. Cere admin-ului să trimită una nouă.',
            ]);
        }

        // Determine flow: existing user or registration
        $existingUser = User::where('email', $invitation->email)->first();
        $authUser     = $request->user();

        $needsLogin    = $existingUser && (! $authUser || $authUser->id !== $existingUser->id);
        $emailMismatch = $authUser && $authUser->email !== $invitation->email;

        return Inertia::render('Invitations/Accept', [
            'invitation' => [
                'token'      => $invitation->token,
                'email'      => $invitation->email,
                'role'       => $invitation->role,
                'expires_at' => $invitation->expires_at?->toDateTimeString(),
                'agency'     => [
                    'name'      => $invitation->agency->name,
                    'logo_path' => $invitation->agency->logo_path,
                ],
                'invited_by' => $invitation->invitedBy?->name,
            ],
            'flow' => [
                'is_authenticated'    => (bool) $authUser,
                'is_existing_user'    => (bool) $existingUser,
                'needs_login'         => $needsLogin,
                'email_mismatch'      => $emailMismatch,
                'auth_user_email'     => $authUser?->email,
            ],
            'error' => null,
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invitation = AgencyInvitation::where('token', $token)->first();

        if (! $invitation || ! $invitation->isValid()) {
            return redirect('/invitations/' . $token);
        }

        $authUser     = $request->user();
        $existingUser = User::where('email', $invitation->email)->first();

        // ── Path 1: existing user (must be logged in with matching email)
        if ($existingUser) {
            if (! $authUser || $authUser->id !== $existingUser->id) {
                return redirect('/login')
                    ->with('warning', 'Loghează-te cu ' . $invitation->email . ' pentru a accepta invitația.')
                    ->with('redirect_after_login', '/invitations/' . $token);
            }

            $existingUser->linkToAgency($invitation->agency_id, $invitation->role);

            $invitation->update(['accepted_at' => now()]);

            app(\App\Services\SeatBillingSyncService::class)->sync($invitation->agency->fresh());

            return redirect('/dashboard')
                ->with('success', 'Te-ai alăturat agenției „' . $invitation->agency->name . '". Folosește meniul profilului ca să comuți între agenții.');
        }

        // ── Path 2: new user — register on the spot
        $request->validate([
            'name'     => 'required|string|max:255',
            'phone'    => 'nullable|string|max:30',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()],
        ]);

        $newUser = User::create([
            'name'              => $request->name,
            'email'             => $invitation->email,
            'phone'             => $request->phone,
            'password'          => Hash::make($request->password),
            'agency_id'         => $invitation->agency_id,
            'locale'            => 'ro',
            'email_verified_at' => now(), // invitation email is the verification proof
            'is_active'         => true,
        ]);

        $newUser->assignRole($invitation->role);
        $newUser->linkToAgency($invitation->agency_id, $invitation->role);

        $invitation->update(['accepted_at' => now()]);

        app(\App\Services\SeatBillingSyncService::class)->sync($invitation->agency->fresh());

        event(new Registered($newUser));
        Auth::login($newUser);

        return redirect('/dashboard')
            ->with('success', 'Cont creat cu succes! Bun venit la „' . $invitation->agency->name . '".');
    }
}
