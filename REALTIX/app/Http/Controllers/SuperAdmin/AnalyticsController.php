<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\Property;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('SuperAdmin/Analytics/Index', Cache::remember('super_admin.analytics', 300, function () {
            $now = now();
            $monthAgo  = $now->copy()->subDays(30);
            $prev60to30 = [$now->copy()->subDays(60), $monthAgo];

            // MRR / ARR
            $plans = SubscriptionPlan::all()->keyBy('slug');
            $activeByPlan = DB::table('subscriptions')
                ->whereIn('stripe_status', ['active', 'trialing'])
                ->join('agencies', 'agencies.id', '=', 'subscriptions.agency_id')
                ->selectRaw('agencies.subscription_plan as slug, COUNT(*) as cnt')
                ->groupBy('agencies.subscription_plan')
                ->pluck('cnt', 'slug')->all();

            $mrr = 0;
            foreach ($activeByPlan as $slug => $cnt) {
                $mrr += (float) ($plans[$slug]->price_monthly ?? 0) * $cnt;
            }

            // Active agencies (have stripe sub or are in trial)
            $activeAgencies = Agency::query()
                ->where(function ($q) use ($now) {
                    $q->whereHas('subscriptions', fn ($qq) => $qq->whereIn('stripe_status', ['active', 'trialing']))
                      ->orWhere('trial_ends_at', '>', $now);
                })->count();

            $totalAgencies = Agency::count();

            // Churn — agencies whose sub became canceled in the last 30 days
            $churnedLast30 = DB::table('subscriptions')
                ->where('stripe_status', 'canceled')
                ->where('updated_at', '>=', $monthAgo)
                ->distinct('agency_id')
                ->count('agency_id');

            $activeBefore30 = max(1, $activeAgencies + $churnedLast30);
            $churnRate = round(($churnedLast30 / $activeBefore30) * 100, 2);

            // ARPU
            $arpu = $activeAgencies > 0 ? round($mrr / $activeAgencies, 2) : 0;

            // LTV = ARPU / churn rate (monthly)
            $monthlyChurnDecimal = $churnRate > 0 ? $churnRate / 100 : 0.05; // assume 5% if no data
            $ltv = $arpu > 0 ? round($arpu / $monthlyChurnDecimal, 2) : 0;

            // New agencies per day, last 30 days
            $newAgenciesTrend = DB::table('agencies')
                ->where('created_at', '>=', $monthAgo)
                ->selectRaw("DATE(created_at) as day, COUNT(*) as total")
                ->groupBy('day')->orderBy('day')->get()
                ->map(fn ($r) => ['day' => $r->day, 'total' => (int) $r->total]);

            // Listings created per day, last 30 days
            $listingsTrend = DB::table('properties')
                ->where('created_at', '>=', $monthAgo)
                ->selectRaw("DATE(created_at) as day, COUNT(*) as total")
                ->groupBy('day')->orderBy('day')->get()
                ->map(fn ($r) => ['day' => $r->day, 'total' => (int) $r->total]);

            // Plan distribution
            $planDistribution = Agency::selectRaw('subscription_plan, COUNT(*) as total')
                ->groupBy('subscription_plan')
                ->pluck('total', 'subscription_plan')->all();

            // Top 10 agencies by listings count
            $topByListings = Agency::withCount('properties')
                ->orderByDesc('properties_count')
                ->take(10)
                ->get(['id', 'name', 'subscription_plan']);

            return [
                'metrics' => [
                    'mrr'              => round($mrr, 2),
                    'arr'              => round($mrr * 12, 2),
                    'arpu'             => $arpu,
                    'ltv'              => $ltv,
                    'churn_rate'       => $churnRate,
                    'active_agencies'  => $activeAgencies,
                    'total_agencies'   => $totalAgencies,
                    'total_users'      => User::count(),
                    'total_listings'   => Property::count(),
                    'churned_last_30'  => $churnedLast30,
                ],
                'newAgenciesTrend' => $newAgenciesTrend,
                'listingsTrend'    => $listingsTrend,
                'planDistribution' => $planDistribution,
                'topByListings'    => $topByListings,
                'planLabels'       => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
                'computedAt'       => $now->toIso8601String(),
            ];
        }));
    }
}
