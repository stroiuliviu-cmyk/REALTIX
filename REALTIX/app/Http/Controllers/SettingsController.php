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

        $invitations = [];
        if ($isAdmin) {
            $invitations = \App\Models\AgencyInvitation::where('agency_id', $user->agency_id)
                ->whereNull('accepted_at')
                ->with('invitedBy:id,name')
                ->latest()
                ->get()
                ->map(fn ($i) => [
                    'id'         => $i->id,
                    'email'      => $i->email,
                    'role'       => $i->role,
                    'token'      => $i->token,
                    'expires_at' => $i->expires_at?->toDateTimeString(),
                    'created_at' => $i->created_at->toDateTimeString(),
                    'is_expired' => $i->isExpired(),
                    'invited_by' => $i->invitedBy?->name,
                ]);
        }

        return Inertia::render('Settings/Index', [
            'user'             => $userData,
            'agency'           => $user->agency,
            'isAdmin'          => $isAdmin,
            'sessions'         => $sessions,
            'agents'           => $agents,
            'invitations'      => $invitations,
            'canInviteAgents'  => (bool) ($user->agency?->canInviteAgents() ?? false),
            'flash'            => session('success'),
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
            'logo'          => 'nullable|image|mimes:png,jpg,jpeg,webp,svg|max:2048',
            'remove_logo'   => 'nullable|boolean',
        ]);

        $agency   = $user->agency;
        $settings = $agency->settings ?? [];

        $update = [
            'name'     => $validated['name'],
            'settings' => array_merge($settings, array_filter([
                'contact_phone' => $validated['contact_phone'] ?? null,
                'contact_email' => $validated['contact_email'] ?? null,
                'address'       => $validated['address'] ?? null,
                'director_name' => $validated['director_name'] ?? null,
                'about'         => $validated['about'] ?? null,
                'brand_color'   => $validated['brand_color'] ?? null,
            ], fn($v) => $v !== null)),
        ];

        // Handle logo: upload, replace or remove
        if ($request->hasFile('logo')) {
            // Delete old logo file if any
            if ($agency->logo_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($agency->logo_path);
            }
            $update['logo_path'] = $request->file('logo')->store("agencies/{$agency->id}", 'public');
        } elseif (! empty($validated['remove_logo']) && $agency->logo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($agency->logo_path);
            $update['logo_path'] = null;
        }

        $agency->update($update);

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
        $admin = $request->user();
        abort_unless($admin->isAdmin(), 403);

        // Plan gate: only Medium and Pro can invite agents
        if (! $admin->agency->canInviteAgents()) {
            $current = ucfirst($admin->agency->subscription_plan ?? 'Starter');
            return back()->with('error', 'Pachetul curent (' . $current . ') nu permite invitarea agenților. Trebuie să faci upgrade la Medium sau Pro.');
        }

        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'role'  => 'nullable|in:admin,realtor',
        ]);

        $email = strtolower(trim($validated['email']));
        $role  = $validated['role'] ?? 'realtor';

        // Reject self-invite
        if ($email === strtolower($admin->email)) {
            return back()->with('error', 'Nu te poți invita pe tine însuți.');
        }

        // Check if there's already a user with this email already linked to this agency
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            $alreadyLinked = $existingUser->linkedAgencies()
                ->where('agencies.id', $admin->agency_id)
                ->exists();
            if ($alreadyLinked) {
                return back()->with('error', 'Acest utilizator face deja parte din agenție.');
            }
        }

        // Check for existing pending invitation
        $existingInv = \App\Models\AgencyInvitation::where('agency_id', $admin->agency_id)
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($existingInv) {
            return back()->with('warning', 'Există deja o invitație activă pentru acest email. Anuleaz-o sau retrimite-o din lista de invitații.');
        }

        $invitation = \App\Models\AgencyInvitation::create([
            'agency_id'          => $admin->agency_id,
            'invited_by_user_id' => $admin->id,
            'email'              => $email,
            'token'              => \App\Models\AgencyInvitation::generateToken(),
            'role'               => $role,
            'expires_at'         => now()->addDays(7),
        ]);

        try {
            \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\AgencyInvitationMail($invitation));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('AgencyInvitation mail failed: ' . $e->getMessage());
            return back()->with('warning', 'Invitația a fost creată dar trimiterea email-ului a eșuat. Verifică SMTP. Linkul: ' . url('/invitations/' . $invitation->token));
        }

        return back()->with('success', 'Invitația a fost trimisă la ' . $email . '.');
    }

    public function cancelInvitation(Request $request, \App\Models\AgencyInvitation $invitation): RedirectResponse
    {
        abort_unless($request->user()->isAdmin() && $invitation->agency_id === $request->user()->agency_id, 403);

        $invitation->delete();

        return back()->with('success', 'Invitația a fost anulată.');
    }

    public function resendInvitation(Request $request, \App\Models\AgencyInvitation $invitation): RedirectResponse
    {
        abort_unless($request->user()->isAdmin() && $invitation->agency_id === $request->user()->agency_id, 403);

        if ($invitation->isAccepted()) {
            return back()->with('error', 'Această invitație a fost deja acceptată.');
        }

        // Refresh expiry
        $invitation->update(['expires_at' => now()->addDays(7)]);

        try {
            \Illuminate\Support\Facades\Mail::to($invitation->email)->send(new \App\Mail\AgencyInvitationMail($invitation));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('AgencyInvitation resend mail failed: ' . $e->getMessage());
            return back()->with('warning', 'Email-ul nu s-a putut trimite. Linkul direct: ' . url('/invitations/' . $invitation->token));
        }

        return back()->with('success', 'Invitația a fost retrimisă.');
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

    public function updatePortalKeys(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'portal_999md_api_key'     => 'nullable|string|max:200',
            'p999_category_id'         => 'nullable|integer',
            'p999_subcat_apartment'    => 'nullable|integer',
            'p999_subcat_house'        => 'nullable|integer',
            'p999_subcat_commercial'   => 'nullable|integer',
            'p999_subcat_land'         => 'nullable|integer',
            'p999_offer_sale'          => 'nullable|integer',
            'p999_offer_rent'          => 'nullable|integer',
            'p999_offer_rent_short'    => 'nullable|integer',
            'p999_feature_price'       => 'nullable|integer',
            'p999_feature_title'       => 'nullable|integer',
            'p999_feature_description' => 'nullable|integer',
            'p999_feature_images'      => 'nullable|integer',
            'p999_feature_contacts'    => 'nullable|integer',
            'p999_feature_location'    => 'nullable|integer',
        ]);

        $agency   = $request->user()->agency;
        $settings = $agency->settings ?? [];

        $agency->update([
            'settings' => array_merge($settings, array_filter($validated, fn($v) => $v !== null)),
        ]);

        return back()->with('success', 'Configurarea portalurilor a fost salvată.');
    }

    public function discoverPortal999Categories(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $agency  = $request->user()->agency;
        $service = new \App\Services\Portals\Portal999Service();

        try {
            $categories = $service->getCategories($agency);
            return response()->json(['categories' => $categories]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
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
