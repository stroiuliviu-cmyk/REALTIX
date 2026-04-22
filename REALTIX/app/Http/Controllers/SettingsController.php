<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function show(Request $request): Response
    {
        $user    = $request->user()->load('agency');
        $isAdmin = $user->isAdmin();

        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->limit(10)
            ->get()
            ->map(fn($s) => [
                'id'         => $s->id,
                'ip'         => $s->ip_address ?? '—',
                'user_agent' => $s->user_agent ?? '—',
                'last_active'=> Carbon::createFromTimestamp($s->last_activity)->diffForHumans(),
                'is_current' => $s->id === $request->session()->getId(),
            ]);

        $agents = [];
        if ($isAdmin) {
            $agents = User::withoutGlobalScopes()
                ->where('agency_id', $user->agency_id)
                ->withCount(['properties', 'deals', 'contacts'])
                ->with('roles')
                ->get()
                ->map(fn($u) => [
                    'id'               => $u->id,
                    'name'             => $u->name,
                    'email'            => $u->email,
                    'phone'            => $u->phone,
                    'position'         => $u->position,
                    'is_active'        => $u->is_active,
                    'role'             => $u->roles->first()?->name ?? 'realtor',
                    'properties_count' => $u->properties_count,
                    'deals_count'      => $u->deals_count,
                    'contacts_count'   => $u->contacts_count,
                    'is_self'          => $u->id === $user->id,
                ]);
        }

        $userData = $user->toArray();
        $userData['google_access_token'] = $user->google_access_token ? '***connected***' : null;
        unset($userData['google_refresh_token']);

        return Inertia::render('Settings/Index', [
            'user'    => $userData,
            'agency'  => $user->agency,
            'isAdmin' => $isAdmin,
            'sessions'=> $sessions,
            'agents'  => $agents,
            'flash'   => session('success'),
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255|unique:users,email,' . $user->id,
            'phone'    => 'nullable|string|max:30',
            'whatsapp' => 'nullable|string|max:30',
            'viber'    => 'nullable|string|max:30',
            'telegram' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'locale'   => 'nullable|in:ro,ru,en',
            'timezone' => 'nullable|string|max:100',
        ]);

        if (isset($validated['email']) && $validated['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->update($validated);

        return back()->with('success', 'Profilul a fost salvat.');
    }

    public function updateAgency(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin(), 403);

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'contact_phone' => 'nullable|string|max:30',
            'contact_email' => 'nullable|email|max:255',
            'address'       => 'nullable|string|max:255',
            'director_name' => 'nullable|string|max:255',
            'about'         => 'nullable|string|max:2000',
            'brand_color'   => 'nullable|string|max:7|regex:/^#[0-9a-fA-F]{6}$/',
        ]);

        $agency   = $user->agency;
        $settings = $agency->settings ?? [];

        $agency->update([
            'name'     => $validated['name'],
            'settings' => array_merge($settings, array_filter([
                'contact_phone' => $validated['contact_phone'] ?? null,
                'contact_email' => $validated['contact_email'] ?? null,
                'address'       => $validated['address'] ?? null,
                'director_name' => $validated['director_name'] ?? null,
                'about'         => $validated['about'] ?? null,
                'brand_color'   => $validated['brand_color'] ?? null,
            ], fn($v) => $v !== null)),
        ]);

        return back()->with('success', 'Datele agenției au fost salvate.');
    }

    public function updateNotifications(Request $request): RedirectResponse
    {
        $request->validate(['prefs' => 'array']);

        $request->user()->update(['notification_prefs' => $request->input('prefs', [])]);

        return back()->with('success', 'Preferințele de notificare au fost salvate.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $request->user()->update(['password' => Hash::make($request->password)]);

        return back()->with('success', 'Parola a fost actualizată.');
    }

    public function inviteAgent(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate(['email' => 'required|email']);

        return back()->with('success', "Invitația a fost trimisă la {$request->email}.");
    }

    public function updateAgent(Request $request, User $agent): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin() && $agent->agency_id === $user->agency_id, 403);

        $validated = $request->validate([
            'is_active' => 'boolean',
            'role'      => 'nullable|in:admin,realtor',
        ]);

        $agent->update(['is_active' => $validated['is_active'] ?? $agent->is_active]);
        if (!empty($validated['role'])) {
            $agent->syncRoles([$validated['role']]);
        }

        return back()->with('success', 'Agentul a fost actualizat.');
    }

    public function removeAgent(Request $request, User $agent): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin() && $agent->agency_id === $user->agency_id && $agent->id !== $user->id, 403);

        $agent->delete();

        return back()->with('success', 'Agentul a fost eliminat.');
    }

    public function logoutOtherDevices(Request $request): RedirectResponse
    {
        $request->validate(['password' => 'required|current_password']);

        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return back()->with('success', 'Toate celelalte sesiuni au fost deconectate.');
    }

    public function updateIntegrations(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'claude_api_key'       => 'nullable|string|max:200',
            'google_calendar_key'  => 'nullable|string|max:200',
            'facebook_token'       => 'nullable|string|max:500',
        ]);

        $agency   = $request->user()->agency;
        $settings = $agency->settings ?? [];

        $agency->update([
            'settings' => array_merge($settings, array_filter($validated, fn($v) => $v !== null)),
        ]);

        return back()->with('success', 'Integrările au fost salvate.');
    }
}
