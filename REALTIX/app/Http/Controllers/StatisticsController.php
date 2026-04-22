<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactInteraction;
use App\Models\Deal;
use App\Models\Property;
use App\Models\ScrapedListing;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user   = $request->user();
        $isAdmin = $user->hasRole('admin');
        $period = $request->get('period', 'month');

        $from = match($period) {
            'week' => now()->startOfWeek(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $data = $isAdmin
            ? $this->adminStats($user, $from, $period)
            : $this->realtorStats($user, $from);

        return Inertia::render('Statistics/Index', array_merge($data, [
            'isAdmin' => $isAdmin,
            'period'  => $period,
        ]));
    }

    private function adminStats(User $user, $from, string $period): array
    {
        $agencyId = $user->agency_id;

        // ── Properties ──────────────────────────────────────────────────────
        $propertiesTotal  = Property::withoutGlobalScopes()->where('agency_id', $agencyId)->count();
        $propertiesActive = Property::withoutGlobalScopes()->where('agency_id', $agencyId)->where('status', 'active')->count();

        $propertiesByType = Property::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $propertiesThisPeriod = Property::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('created_at', '>=', $from)
            ->count();

        $prevFrom = match($period) {
            'week'  => now()->subWeek()->startOfWeek(),
            'year'  => now()->subYear()->startOfYear(),
            default => now()->subMonth()->startOfMonth(),
        };
        $prevTo = match($period) {
            'week'  => now()->subWeek()->endOfWeek(),
            'year'  => now()->subYear()->endOfYear(),
            default => now()->subMonth()->endOfMonth(),
        };
        $propertiesPrevPeriod = Property::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->whereBetween('created_at', [$prevFrom, $prevTo])
            ->count();

        // ── Market (scraped listings) ────────────────────────────────────────
        $scrapedTotal = ScrapedListing::count();

        $scrapedByWeek = ScrapedListing::selectRaw("CAST(strftime('%W', created_at) AS INTEGER) as week_num, COUNT(*) as total")
            ->whereYear('created_at', now()->year)
            ->groupBy('week_num')
            ->orderBy('week_num')
            ->get()
            ->map(fn($r) => ['week' => (int) $r->week_num, 'total' => (int) $r->total])
            ->values();

        $avgPriceByDistrict = ScrapedListing::selectRaw('district, ROUND(AVG(price)) as avg_price, COUNT(*) as cnt')
            ->whereNotNull('district')->where('district', '!=', '')
            ->groupBy('district')
            ->orderByDesc('avg_price')
            ->limit(8)
            ->get()
            ->map(fn($r) => ['district' => $r->district, 'avg_price' => (int) $r->avg_price, 'count' => (int) $r->cnt]);

        $top5Districts = ScrapedListing::selectRaw('district, COUNT(*) as listings_count')
            ->where('created_at', '>=', now()->subDays(7))
            ->whereNotNull('district')->where('district', '!=', '')
            ->groupBy('district')
            ->orderByDesc('listings_count')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['district' => $r->district, 'count' => (int) $r->listings_count]);

        // ── Contacts ─────────────────────────────────────────────────────────
        $contactsTotal  = Contact::withoutGlobalScopes()->where('agency_id', $agencyId)->count();
        $contactsByType = Contact::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        // ── Calls ─────────────────────────────────────────────────────────────
        $callsTotal = ContactInteraction::whereHas('contact', fn($q) => $q->where('agency_id', $agencyId))
            ->where('type', 'call')
            ->count();

        $callsPeriod = ContactInteraction::whereHas('contact', fn($q) => $q->where('agency_id', $agencyId))
            ->where('type', 'call')
            ->where('created_at', '>=', $from)
            ->count();

        $dealsClosedTotal = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->count();

        $callConversion = $callsTotal > 0
            ? round(($dealsClosedTotal / $callsTotal) * 100, 1)
            : 0;

        // ── Deals & Revenue ───────────────────────────────────────────────────
        $dealsPeriod = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->where('closed_at', '>=', $from)
            ->count();

        $revenuePeriod = (float) Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->where('closed_at', '>=', $from)
            ->sum('commission');

        $revenuePrev = (float) Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereBetween('closed_at', [$prevFrom, $prevTo])
            ->sum('commission');

        $avgCommission = (float) (Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->avg('commission') ?? 0);

        // ── Avg days to close ─────────────────────────────────────────────────
        $closedDeals = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereNotNull('closed_at')
            ->get(['created_at', 'closed_at']);

        $avgDaysToClose = $closedDeals->count() > 0
            ? round($closedDeals->avg(fn($d) => $d->created_at->diffInDays($d->closed_at)))
            : 0;

        // ── Agent stats ───────────────────────────────────────────────────────
        $agentStats = User::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->withCount([
                'properties as properties_count',
                'deals as deals_count',
                'contacts as contacts_count',
            ])
            ->get()
            ->map(function ($u) {
                $calls   = ContactInteraction::where('user_id', $u->id)->where('type', 'call')->count();
                $views   = (int) Property::withoutGlobalScopes()->where('user_id', $u->id)->sum('views_count');
                $revenue = (float) Deal::withoutGlobalScopes()->where('user_id', $u->id)->where('status', 'closed')->sum('commission');
                $agentDeals = Deal::withoutGlobalScopes()
                    ->where('user_id', $u->id)
                    ->where('status', 'closed')
                    ->whereNotNull('closed_at')
                    ->get(['created_at', 'closed_at']);
                $avgDays = $agentDeals->count() > 0
                    ? round($agentDeals->avg(fn($d) => $d->created_at->diffInDays($d->closed_at)))
                    : null;

                return [
                    'id'               => $u->id,
                    'name'             => $u->name,
                    'properties_count' => $u->properties_count,
                    'deals_count'      => $u->deals_count,
                    'contacts_count'   => $u->contacts_count,
                    'calls_count'      => $calls,
                    'views_total'      => $views,
                    'revenue'          => $revenue,
                    'avg_days_close'   => $avgDays,
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        $revenueByMonth = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereYear('closed_at', now()->year)
            ->whereNotNull('closed_at')
            ->get(['closed_at', 'commission'])
            ->groupBy(fn($d) => (int) $d->closed_at->format('n'))
            ->map(fn($g, $m) => ['month' => $m, 'total' => (float) $g->sum('commission')])
            ->sortKeys()
            ->values();

        return compact(
            'propertiesTotal', 'propertiesActive', 'propertiesByType',
            'propertiesThisPeriod', 'propertiesPrevPeriod',
            'scrapedTotal', 'scrapedByWeek', 'avgPriceByDistrict', 'top5Districts',
            'contactsTotal', 'contactsByType',
            'callsTotal', 'callsPeriod', 'callConversion',
            'dealsPeriod', 'revenuePeriod', 'revenuePrev', 'avgCommission',
            'avgDaysToClose', 'agentStats', 'revenueByMonth'
        );
    }

    private function realtorStats(User $user, $from): array
    {
        $propertiesTotal    = Property::where('user_id', $user->id)->count();
        $propertiesActive   = Property::where('user_id', $user->id)->where('status', 'active')->count();
        $propertiesArchived = Property::where('user_id', $user->id)->where('status', 'archived')->count();

        $contactsTotal = Contact::where('user_id', $user->id)->count();
        $viewsTotal    = (int) Property::where('user_id', $user->id)->sum('views_count');

        $top3Properties = Property::where('user_id', $user->id)
            ->orderByDesc('views_count')
            ->limit(3)
            ->get(['id', 'title', 'views_count', 'status', 'type'])
            ->map(fn($p) => [
                'id'          => $p->id,
                'title'       => $p->title,
                'views_count' => $p->views_count,
                'status'      => $p->status,
                'type'        => $p->type,
            ]);

        $myCallsTotal    = ContactInteraction::where('user_id', $user->id)->where('type', 'call')->count();
        $myCallsPeriod   = ContactInteraction::where('user_id', $user->id)->where('type', 'call')->where('created_at', '>=', $from)->count();
        $myDealsTotal    = Deal::where('user_id', $user->id)->where('status', 'closed')->count();
        $myDealsInProgress = Deal::where('user_id', $user->id)->where('status', 'in_progress')->count();

        $callConversion = $myCallsTotal > 0
            ? round(($myDealsTotal / $myCallsTotal) * 100, 1)
            : 0;

        $dealsPeriod = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->where('closed_at', '>=', $from)
            ->count();

        $revenuePeriod = (float) Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->where('closed_at', '>=', $from)
            ->sum('commission');

        $revenueTotal = (float) Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->sum('commission');

        $revenueByMonth = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereYear('closed_at', now()->year)
            ->whereNotNull('closed_at')
            ->get(['closed_at', 'commission'])
            ->groupBy(fn($d) => (int) $d->closed_at->format('n'))
            ->map(fn($g, $m) => ['month' => $m, 'total' => (float) $g->sum('commission')])
            ->sortKeys()
            ->values();

        return compact(
            'propertiesTotal', 'propertiesActive', 'propertiesArchived',
            'contactsTotal', 'viewsTotal', 'top3Properties',
            'myCallsTotal', 'myCallsPeriod', 'callConversion',
            'myDealsTotal', 'myDealsInProgress',
            'dealsPeriod', 'revenuePeriod', 'revenueTotal', 'revenueByMonth'
        );
    }
}
