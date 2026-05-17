<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LogsController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->get('tab', 'all');

        $tabPrefixes = [
            'all'         => null,
            'auth'        => ['auth.'],
            'payment'     => ['subscription.', 'super_admin.billing.'],
            'super-admin' => ['super_admin.'],
            'ai'          => ['ai.', 'super_admin.ai.'],
            'moderation'  => ['moderation.', 'super_admin.moderation.'],
            'errors'      => ['auth.failed', 'super_admin.billing.refund'],
        ];

        $query = ActivityLog::query()
            ->with(['user:id,name,email'])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($x) use ($s) {
                    $x->where('description', 'ilike', "%{$s}%")
                      ->orWhere('action', 'ilike', "%{$s}%")
                      ->orWhere('ip_address', 'ilike', "%{$s}%");
                });
            })
            ->when($request->user_id, fn ($q, $u) => $q->where('user_id', $u))
            ->when($request->agency_id, fn ($q, $a) => $q->where('agency_id', $a));

        if (isset($tabPrefixes[$tab]) && $tabPrefixes[$tab] !== null) {
            $prefixes = $tabPrefixes[$tab];
            $query->where(function ($q) use ($prefixes) {
                foreach ($prefixes as $p) {
                    $q->orWhere('action', 'like', $p . '%');
                }
            });
        }

        $logs = $query->latest('created_at')->paginate(50)->withQueryString();

        // Counts per tab for badge display
        $counts = [];
        foreach ($tabPrefixes as $key => $prefixes) {
            if ($prefixes === null) {
                $counts[$key] = ActivityLog::count();
                continue;
            }
            $q = ActivityLog::query();
            $q->where(function ($qq) use ($prefixes) {
                foreach ($prefixes as $p) {
                    $qq->orWhere('action', 'like', $p . '%');
                }
            });
            $counts[$key] = $q->count();
        }

        return Inertia::render('SuperAdmin/Logs/Index', [
            'logs'    => $logs,
            'tab'     => $tab,
            'counts'  => $counts,
            'filters' => $request->only(['search', 'user_id', 'agency_id']),
        ]);
    }
}
