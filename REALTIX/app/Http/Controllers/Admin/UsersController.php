<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\User;
use App\Services\SuperAdmin\AuditLogger;
use App\Services\SuperAdmin\ImpersonationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()
            ->with(['agency:id,name,slug', 'roles:id,name'])
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name',  'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            }))
            ->when($request->agency_id, fn ($q, $id) => $q->where('agency_id', $id))
            ->when($request->role, function ($q, $role) {
                $q->whereHas('roles', fn ($rq) => $rq->where('name', $role));
            })
            ->when($request->status === 'active',   fn ($q) => $q->where('is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false));

        return Inertia::render('Admin/Users', [
            'users'    => $query->latest()->paginate(25)->withQueryString(),
            'filters'  => $request->only(['search', 'agency_id', 'role', 'status']),
            'agencies' => Agency::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Assign or change a user's role. Sends `role=""` (or null) to strip the
     * user of any role. Spatie's syncRoles handles the swap cleanly.
     */
    public function setRole(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'role' => 'nullable|in:super_admin,admin,realtor',
        ]);
        $role = $data['role'] ?? null;

        // Guard: don't allow stripping the only super_admin (footgun protection).
        if ($user->hasRole('super_admin') && $role !== 'super_admin') {
            $remaining = User::role('super_admin')->where('id', '!=', $user->id)->count();
            if ($remaining === 0) {
                return back()->with('error', 'Nu poți retrograda ultimul super admin.');
            }
        }

        $previous = $user->roles->pluck('name')->first() ?? 'none';
        $user->syncRoles($role ? [$role] : []);
        $audit->record('user.role_change', null, "Role: {$previous} → " . ($role ?? 'none') . " for {$user->email}", [
            'user_id' => $user->id, 'from' => $previous, 'to' => $role,
        ]);

        return back()->with('success', $role
            ? "Rol actualizat pentru {$user->email}: " . ($role === 'admin' ? 'Admin' : ($role === 'realtor' ? 'Agent' : 'Super Admin'))
            : "Rol eliminat pentru {$user->email}.");
    }

    public function toggleActive(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Nu îți poți dezactiva propriul cont.');
        }

        $wasActive = $user->is_active;
        $user->update(['is_active' => ! $wasActive]);

        if ($wasActive) {
            app(\App\Services\UserSessionManager::class)->revokeAll($user);
        }

        return back()->with('success', $user->is_active
            ? "Contul {$user->email} a fost activat."
            : "Contul {$user->email} a fost dezactivat. Sesiuni active revocate.");
    }

    public function destroy(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Nu îți poți șterge propriul cont.');
        }

        $email = $user->email;
        $audit->record('user.delete', null, "Deleted user {$email}", ['user_id' => $user->id, 'agency_id' => $user->agency_id]);
        $user->delete();

        return back()->with('success', "Contul {$email} a fost șters.");
    }

    public function resetPassword(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $newPassword = Str::random(12);
        $user->update(['password' => Hash::make($newPassword)]);
        $audit->record('user.password_reset', null, "Password reset for {$user->email}", ['user_id' => $user->id]);

        return back()->with('success', "Parolă nouă pentru {$user->email}: {$newPassword} (comunic-o manual user-ului — nu se mai afișează după refresh).");
    }

    public function forceVerify(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        if ($user->email_verified_at) {
            return back()->with('warning', 'Email-ul este deja verificat.');
        }
        $user->forceFill(['email_verified_at' => now()])->save();
        $audit->record('user.force_verify', null, "Force-verified {$user->email}", ['user_id' => $user->id]);
        return back()->with('success', "Email-ul {$user->email} a fost marcat ca verificat.");
    }

    public function impersonate(Request $request, User $user, ImpersonationService $impersonation): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Nu te poți imita pe tine.');
        }
        if ($user->hasRole('super_admin')) {
            return back()->with('error', 'Nu poți imita un alt super admin.');
        }

        $impersonation->start($request->user(), $user, $request->input('reason'));
        return redirect()->route('dashboard')->with('warning', "🎭 Imită acum: {$user->name} ({$user->email})");
    }

    public function stopImpersonate(ImpersonationService $impersonation): RedirectResponse
    {
        $admin = $impersonation->stop();
        if (! $admin) {
            return redirect()->route('dashboard')->with('error', 'Nicio sesiune de impersonate activă.');
        }
        return redirect()->route('super-admin.users.index')->with('success', "Sesiune încheiată — autentificat ca {$admin->name}.");
    }
}
