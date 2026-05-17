<?php

namespace App\Services\SuperAdmin;

use App\Models\ImpersonationSession;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class ImpersonationService
{
    public function start(User $superAdmin, User $target, ?string $reason = null): ImpersonationSession
    {
        $session = ImpersonationSession::create([
            'super_admin_user_id' => $superAdmin->id,
            'target_user_id'      => $target->id,
            'reason'              => $reason,
            'ip'                  => request()->ip(),
            'started_at'          => now(),
        ]);

        Session::put('impersonator_id', $superAdmin->id);
        Session::put('impersonation_session_id', $session->id);
        Auth::login($target);

        app(AuditLogger::class)->impersonationStart($target->id, $reason);

        return $session;
    }

    public function stop(): ?User
    {
        $impersonatorId = Session::get('impersonator_id');
        $sessionId      = Session::get('impersonation_session_id');
        if (! $impersonatorId) {
            return null;
        }

        $admin = User::find($impersonatorId);
        if (! $admin) {
            Session::forget(['impersonator_id', 'impersonation_session_id']);
            return null;
        }

        $targetId = Auth::id();
        if ($sessionId) {
            ImpersonationSession::where('id', $sessionId)->whereNull('ended_at')
                ->update(['ended_at' => now()]);
        }

        Session::forget(['impersonator_id', 'impersonation_session_id']);
        Auth::login($admin);
        app(AuditLogger::class)->impersonationStop($targetId ?? 0);

        return $admin;
    }

    public function isImpersonating(): bool
    {
        return Session::has('impersonator_id');
    }

    public function impersonator(): ?User
    {
        return Session::has('impersonator_id')
            ? User::find(Session::get('impersonator_id'))
            : null;
    }
}
