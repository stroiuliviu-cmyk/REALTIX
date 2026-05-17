<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ImpersonationSession;
use App\Models\IpBlacklist;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function index(): Response
    {
        $failedLogins = ActivityLog::where('action', 'auth.failed')
            ->latest()
            ->take(50)
            ->get(['id', 'description', 'ip_address', 'user_agent', 'created_at']);

        // Group failed login IPs to detect brute force
        // Postgres doesn't allow SELECT alias in HAVING — use havingRaw + orderByRaw.
        $bruteForceCandidates = ActivityLog::where('action', 'auth.failed')
            ->where('created_at', '>=', now()->subHours(24))
            ->selectRaw('ip_address, COUNT(*) as attempts')
            ->groupBy('ip_address')
            ->havingRaw('COUNT(*) >= ?', [5])
            ->orderByRaw('COUNT(*) DESC')
            ->limit(20)
            ->get();

        $blacklist = IpBlacklist::with('blockedBy:id,name')
            ->latest()
            ->paginate(15, ['*'], 'blacklist_page');

        $activeImpersonations = ImpersonationSession::whereNull('ended_at')
            ->with(['superAdmin:id,name,email', 'target:id,name,email'])
            ->latest('started_at')
            ->get();

        $recentImpersonations = ImpersonationSession::whereNotNull('ended_at')
            ->with(['superAdmin:id,name', 'target:id,name'])
            ->latest('started_at')
            ->take(15)
            ->get();

        return Inertia::render('SuperAdmin/Security/Index', [
            'failedLogins'          => $failedLogins,
            'bruteForceCandidates'  => $bruteForceCandidates,
            'blacklist'             => $blacklist,
            'activeImpersonations'  => $activeImpersonations,
            'recentImpersonations'  => $recentImpersonations,
        ]);
    }

    public function blacklistIp(Request $request, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'ip'         => 'required|ip',
            'reason'     => 'nullable|string|max:200',
            'expires_at' => 'nullable|date|after:now',
        ]);

        IpBlacklist::updateOrCreate(
            ['ip' => $data['ip']],
            [
                'reason'             => $data['reason'] ?? null,
                'blocked_by_user_id' => $request->user()->id,
                'expires_at'         => $data['expires_at'] ?? null,
            ],
        );

        $audit->ipBlacklisted($data['ip'], $data['reason'] ?? null);
        return back()->with('success', "IP {$data['ip']} blacklisted.");
    }

    public function unblacklistIp(Request $request, IpBlacklist $entry, AuditLogger $audit): RedirectResponse
    {
        $ip = $entry->ip;
        $entry->delete();
        $audit->record('security.ip.unblacklist', null, "IP {$ip} unblacklisted");
        return back()->with('success', "IP {$ip} eliberat.");
    }
}
