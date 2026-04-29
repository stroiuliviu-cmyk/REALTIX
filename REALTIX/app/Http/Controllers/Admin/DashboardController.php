<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $now      = now();
        $weekAgo  = $now->copy()->subDays(7);
        $monthAgo = $now->copy()->subDays(30);

        // Plan breakdown for agencies
        $planBreakdown = Agency::selectRaw('subscription_plan, COUNT(*) as total')
            ->groupBy('subscription_plan')
            ->pluck('total', 'subscription_plan')
            ->all();

        // Daily registrations last 30 days
        $userTrend = User::selectRaw("DATE(created_at) as day, COUNT(*) as total")
            ->where('created_at', '>=', $monthAgo)
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => ['day' => $row->day, 'total' => (int) $row->total]);

        $recentUsers = User::with('agency:id,name')
            ->whereNotNull('agency_id')
            ->latest()
            ->take(10)
            ->get(['id', 'name', 'email', 'agency_id', 'created_at']);

        $recentAgencies = Agency::withCount('users')
            ->latest()
            ->take(10)
            ->get(['id', 'name', 'slug', 'subscription_plan', 'trial_ends_at', 'created_at']);

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users_total'        => User::count(),
                'users_new_week'     => User::where('created_at', '>=', $weekAgo)->count(),
                'users_new_month'    => User::where('created_at', '>=', $monthAgo)->count(),
                'agencies_total'     => Agency::count(),
                'agencies_new_month' => Agency::where('created_at', '>=', $monthAgo)->count(),
                'agencies_active'    => Agency::whereNotNull('subscription_plan')->count(),
                'agencies_trialing'  => Agency::whereNotNull('trial_ends_at')->where('trial_ends_at', '>', $now)->count(),
                'properties_total'   => Property::count(),
                'contacts_total'     => Contact::count(),
                'deals_total'        => Deal::count(),
            ],
            'planBreakdown'  => $planBreakdown,
            'userTrend'      => $userTrend,
            'recentUsers'    => $recentUsers,
            'recentAgencies' => $recentAgencies,
        ]);
    }
}
