<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionsController extends Controller
{
    public function index(Request $request): Response
    {
        $now = now();

        $query = Agency::query()
            ->withCount('users')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->plan, fn ($q, $p) => $q->where('subscription_plan', $p))
            ->when($request->status === 'trial', fn ($q) => $q->whereNotNull('trial_ends_at')->where('trial_ends_at', '>', $now))
            ->when($request->status === 'active', fn ($q) => $q->where(function ($q) use ($now) {
                $q->whereNotNull('subscription_ends_at')->where('subscription_ends_at', '>', $now);
            }))
            ->when($request->status === 'expired', fn ($q) => $q->whereNotNull('subscription_ends_at')->where('subscription_ends_at', '<=', $now));

        $agencies = $query->latest()->paginate(25)->withQueryString();

        // Aggregate stats
        $stats = [
            'total_agencies'      => Agency::count(),
            'paying_agencies'     => Agency::whereNotIn('subscription_plan', ['starter'])->count(),
            'trialing'            => Agency::whereNotNull('trial_ends_at')->where('trial_ends_at', '>', $now)->count(),
            'expired'             => Agency::whereNotNull('subscription_ends_at')->where('subscription_ends_at', '<=', $now)->count(),
            'plan_breakdown'      => Agency::selectRaw('subscription_plan, COUNT(*) as total')
                                        ->groupBy('subscription_plan')
                                        ->pluck('total', 'subscription_plan')
                                        ->all(),
        ];

        return Inertia::render('Admin/Subscriptions', [
            'agencies' => $agencies,
            'filters'  => $request->only(['search', 'plan', 'status']),
            'stats'    => $stats,
        ]);
    }
}
