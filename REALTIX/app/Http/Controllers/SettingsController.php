<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Intervention\Image\Laravel\Facades\Image;

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
            $agentUsers = User::withoutGlobalScopes()
                ->where('agency_id', $user->agency_id)
                ->withCount(['properties', 'deals', 'contacts'])
                ->with('roles')
                ->get();

            // Pull last login info from activity_logs + active session for online status
            $agentIds = $agentUsers->pluck('id');
            $lastLogins = ActivityLog::whereIn('user_id', $agentIds)
                ->where('action', 'auth.login')
                ->orderByDesc('created_at')
                ->get(['user_id', 'ip_address', 'user_agent', 'created_at'])
                ->groupBy('user_id')
                ->map(fn ($rows) => $rows->first());

            $activeSessions = DB::table('sessions')
                ->whereIn('user_id', $agentIds)
                ->where('last_activity', '>=', now()->subMinutes(5)->timestamp)
                ->pluck('user_id')
                ->all();

            $agents = $agentUsers->map(function ($u) use ($lastLogins, $activeSessions, $user) {
                $login = $lastLogins[$u->id] ?? null;
                $ua = $login?->user_agent ?? '';
                return [
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
                    'is_online'        => in_array($u->id, $activeSessions, true),
                    'last_login_at'    => $login?->created_at?->toIso8601String(),
                    'last_login_ip'    => $login?->ip_address,
                    'last_login_device' => $this->guessDevice($ua),
                    'last_login_browser' => $this->guessBrowser($ua),
                ];
            });
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

        $activityLog = ActivityLog::forUser($user->id)
            ->latest('created_at')
            ->limit(30)
            ->get()
            ->map(fn ($a) => [
                'id'          => $a->id,
                'action'      => $a->action,
                'description' => $a->description,
                'ip'          => $a->ip_address,
                'created_at'  => $a->created_at->diffForHumans(),
                'created_iso' => $a->created_at->toIso8601String(),
            ]);

        return Inertia::render('Settings/Index', [
            'user'                => $userData,
            'agency'              => $user->agency,
            'isAdmin'             => $isAdmin,
            'sessions'            => $sessions,
            'agents'              => $agents,
            'invitations'         => $invitations,
            'canInviteAgents'     => (bool) ($user->agency?->canInviteAgents() ?? false),
            'canInviteMoreAgents' => (bool) ($user->agency?->canInviteMoreAgents() ?? false),
            'seatsUsed'           => (int) ($user->agency?->seatsUsed() ?? 0),
            'seatsLimit'          => $user->agency?->seatsLimit(),
            'activityLog'         => $activityLog,
            'flash'               => session('success'),
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
            'locale'   => 'nullable|in:ro,ru',
            'timezone' => 'nullable|string|max:100',
        ]);

        if (isset($validated['email']) && $validated['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->update($validated);

        ActivityLog::record('profile.updated', $user, 'Profil actualizat', ['fields' => array_keys($validated)]);

        return back()->with('success', 'Profilul a fost salvat.');
    }

    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:png,jpg,jpeg,webp|max:5120',
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update([
            'avatar_path' => $this->processImageUpload(
                $request->file('avatar'),
                "users/{$user->id}",
                512,
                'avatar',
            ),
        ]);

        ActivityLog::record('profile.avatar_updated', $user, 'Fotografie de profil actualizată');

        return back()->with('success', 'Fotografia a fost actualizată.');
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
            ActivityLog::record('profile.avatar_removed', $user, 'Fotografie de profil ștearsă');
        }

        return back()->with('success', 'Fotografia a fost ștearsă.');
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
            'logo'          => 'nullable|image|mimes:png,jpg,jpeg,webp,svg|max:10240',
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
                Storage::disk('public')->delete($agency->logo_path);
            }
            $update['logo_path'] = $this->processImageUpload(
                $request->file('logo'),
                "agencies/{$agency->id}",
                1024,
                'logo',
            );
        } elseif (! empty($validated['remove_logo']) && $agency->logo_path) {
            Storage::disk('public')->delete($agency->logo_path);
            $update['logo_path'] = null;
        }

        $agency->update($update);

        return back()->with('success', 'Datele agenției au fost salvate.');
    }

    /**
     * Resize an uploaded image down to fit within $maxDimension, encode as JPEG q85,
     * and store under disk('public'). SVGs pass through unprocessed (vector format).
     * On any failure (extension missing, malformed file) falls back to the raw uploaded
     * file via ->store() so the feature degrades gracefully.
     */
    private function processImageUpload(UploadedFile $file, string $directory, int $maxDimension, string $filenamePrefix): string
    {
        if ($file->getMimeType() === 'image/svg+xml') {
            return $file->store($directory, 'public');
        }

        try {
            $encoded = Image::read($file)
                ->scaleDown(width: $maxDimension, height: $maxDimension)
                ->toJpeg(quality: 85);

            $relativePath = $directory . '/' . $filenamePrefix . '_' . time() . '.jpg';
            Storage::disk('public')->put($relativePath, (string) $encoded);

            return $relativePath;
        } catch (\Throwable $e) {
            Log::error('Image upload processing failed, falling back to raw store', [
                'error'     => $e->getMessage(),
                'directory' => $directory,
            ]);

            return $file->store($directory, 'public');
        }
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

        ActivityLog::record('profile.password_changed', $request->user(), 'Parolă schimbată');

        return back()->with('success', 'Parola a fost actualizată.');
    }

    public function inviteAgent(Request $request): RedirectResponse
    {
        $admin = $request->user();
        abort_unless($admin->isAdmin(), 403);

        $planLabels = ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'];
        $currentSlug = $admin->agency->subscription_plan ?? 'starter';
        $currentLabel = $planLabels[$currentSlug] ?? ucfirst($currentSlug);

        // Plan gate: only Team and Growth can invite agents (Solo is single-user)
        if (! $admin->agency->canInviteAgents()) {
            return back()->with('error', "Pachetul curent ({$currentLabel}) nu permite invitarea agenților. Fă upgrade la Team sau Growth.");
        }

        // Seat-limit gate: Team has 5 seats max; Growth is unlimited (overage billed automatically).
        if (! $admin->agency->canInviteMoreAgents()) {
            $limit = $admin->agency->seatsLimit();
            return back()->with('error', "Ai atins limita de {$limit} agenți a planului {$currentLabel}. Fă upgrade la Growth pentru agenți nelimitați (8€/agent extra).");
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

        $oldActive = $agent->is_active;
        $newActive = $validated['is_active'] ?? $agent->is_active;
        $agent->update(['is_active' => $newActive]);
        if (!empty($validated['role'])) {
            $agent->syncRoles([$validated['role']]);
        }

        // If the agent was just deactivated → force logout (revoke all sessions)
        if ($oldActive && ! $newActive) {
            $revoked = app(\App\Services\UserSessionManager::class)->revokeAll($agent);
            ActivityLog::record('agent.deactivated_forced_logout', $agent, "Sesiuni revocate: {$revoked}");
        }

        return back()->with('success', 'Agentul a fost actualizat.');
    }

    public function removeAgent(Request $request, User $agent): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin() && $agent->agency_id === $user->agency_id && $agent->id !== $user->id, 403);

        $agent->delete();

        app(\App\Services\SeatBillingSyncService::class)->sync($user->agency->fresh());

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

    public function loginHistory(Request $request, User $agent): \Illuminate\Http\JsonResponse
    {
        abort_unless($request->user()->isAdmin() && $agent->agency_id === $request->user()->agency_id, 403);

        $logs = ActivityLog::where('user_id', $agent->id)
            ->whereIn('action', ['auth.login', 'auth.logout', 'auth.failed'])
            ->latest()->take(30)
            ->get(['id', 'action', 'description', 'ip_address', 'user_agent', 'created_at'])
            ->map(fn ($l) => [
                'id'         => $l->id,
                'action'     => $l->action,
                'ip'         => $l->ip_address,
                'device'     => $this->guessDevice($l->user_agent ?? ''),
                'browser'    => $this->guessBrowser($l->user_agent ?? ''),
                'created_at' => $l->created_at->toIso8601String(),
            ]);

        return response()->json(['logs' => $logs]);
    }

    private function guessDevice(string $ua): string
    {
        if (str_contains($ua, 'iPhone'))  return 'iPhone';
        if (str_contains($ua, 'iPad'))    return 'iPad';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'Windows')) return 'Windows';
        if (str_contains($ua, 'Mac OS'))  return 'macOS';
        if (str_contains($ua, 'Linux'))   return 'Linux';
        return $ua ? 'Other' : '—';
    }

    private function guessBrowser(string $ua): string
    {
        if (str_contains($ua, 'Firefox/'))      return 'Firefox';
        if (str_contains($ua, 'Edg/'))          return 'Edge';
        if (str_contains($ua, 'OPR/'))          return 'Opera';
        if (str_contains($ua, 'Chrome/'))       return 'Chrome';
        if (str_contains($ua, 'Safari/'))       return 'Safari';
        return $ua ? '—' : '—';
    }

    public function updateIntegrations(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'facebook_token'       => 'nullable|string|max:500',
            'portal_999md_api_key' => 'nullable|string|max:200',
        ]);

        $agency   = $request->user()->agency;
        $settings = $agency->settings ?? [];

        $agency->update([
            'settings' => array_merge($settings, array_filter($validated, fn($v) => $v !== null)),
        ]);

        return back()->with('success', 'Integrările au fost salvate.');
    }
}
