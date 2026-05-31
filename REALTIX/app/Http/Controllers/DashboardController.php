<?php

namespace App\Http\Controllers;

use App\Models\AutoPostRequest;
use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user    = $request->user();
        $isAdmin = $user->isAdmin();

        // Scope helper — realtor sees only their own rows; admin sees agency-wide.
        $own = fn ($q) => $isAdmin ? $q : $q->where('user_id', $user->id);
        $ownEvents = fn ($q) => $isAdmin ? $q : $q->where('user_id', $user->id);

        $stats = [
            'properties'       => $own(Property::query())->count(),
            'active_properties'=> $own(Property::query())->where('status', 'active')->count(),
            'contacts'         => $own(Contact::query())->count(),
            'buyers'           => $own(Contact::query())->where('type', 'buyer')->count(),
            'active_deals'     => $own(Deal::query())->whereNotIn('status', ['closed', 'lost'])->count(),
            'closed_deals'     => $own(Deal::query())->where('status', 'closed')->count(),
            'deals_month'      => $own(Deal::query())->where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->count(),
            'monthly_revenue'  => $own(Deal::query())->where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->sum('commission'),
            'upcoming_events'  => $ownEvents(CalendarEvent::query())
                ->where('starts_at', '>=', now())
                ->where('starts_at', '<=', now()->addDays(7))
                ->count(),
            'views_count'      => $own(Property::query())->sum('views_count'),
        ];

        // Week-over-week property growth — drives the hero card "În creștere X%" line.
        $thisWeek = $own(Property::query())->where('created_at', '>=', now()->startOfWeek())->count();
        $lastWeek = $own(Property::query())
            ->whereBetween('created_at', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()])
            ->count();
        $weekGrowth = $lastWeek > 0
            ? round((($thisWeek - $lastWeek) / $lastWeek) * 100, 1)
            : ($thisWeek > 0 ? 100.0 : 0.0);

        // Month-over-month closed deals growth.
        $dealsThisMonth = $own(Deal::query())->where('status', 'closed')
            ->whereMonth('closed_at', now()->month)->whereYear('closed_at', now()->year)->count();
        $dealsLastMonth = $own(Deal::query())->where('status', 'closed')
            ->whereMonth('closed_at', now()->subMonth()->month)
            ->whereYear('closed_at', now()->subMonth()->year)->count();
        $dealsGrowth = $dealsLastMonth > 0
            ? round((($dealsThisMonth - $dealsLastMonth) / $dealsLastMonth) * 100, 1)
            : ($dealsThisMonth > 0 ? 100.0 : 0.0);

        // Stat-tile trend badges. Absolute week-over-week / month-over-month
        // deltas, surfaced only when positive — the tile shows nothing for a
        // flat or down metric (small agencies sit at 0 most days). Build via a
        // helper so each metric uses the same shape.
        $contactsThisWeek = $own(Contact::query())->where('created_at', '>=', now()->startOfWeek())->count();
        $contactsLastWeek = $own(Contact::query())
            ->whereBetween('created_at', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()])
            ->count();
        $eventsThisWeek = $ownEvents(CalendarEvent::query())
            ->whereBetween('created_at', [now()->startOfWeek(), now()])->count();
        $eventsLastWeek = $ownEvents(CalendarEvent::query())
            ->whereBetween('created_at', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()])->count();

        $upTrend = fn (int $delta) => $delta > 0
            ? ['dir' => 'up', 'value' => '+'.number_format($delta, 0, '.', '.')]
            : null;

        $partialTrends = [
            'properties'      => $upTrend($thisWeek - $lastWeek),
            'contacts'        => $upTrend($contactsThisWeek - $contactsLastWeek),
            'deals_month'     => $upTrend($dealsThisMonth - $dealsLastMonth),
            'upcoming_events' => $upTrend($eventsThisWeek - $eventsLastWeek),
        ];

        // Web Oferte (12k+ rows) — the source of richer charts; portfolio table is too small.
        $scrapedStats = [
            'total'   => ScrapedListing::count(),
            'today'   => ScrapedListing::where('updated_at', '>=', now()->startOfDay())->count(),
            'last_7d' => ScrapedListing::where('created_at', '>=', now()->subDays(7))->count(),
        ];

        // Scraper runs daily — last_7d is always a meaningful fresh-supply badge.
        $trends = $partialTrends + [
            'web_offers' => $scrapedStats['last_7d'] > 0
                ? ['dir' => 'up', 'value' => '+'.number_format($scrapedStats['last_7d'], 0, '.', '.')]
                : null,
        ];

        // 30-day daily series — area chart on the dashboard.
        $scrapedDaily = ScrapedListing::query()
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($r) => ['day' => $r->day, 'count' => (int) $r->count])
            ->values();

        // Type breakdown — donut.
        $scrapedByType = ScrapedListing::query()
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['type' => $r->type, 'count' => (int) $r->count])
            ->values();

        // 14-day sparkline series for the stat cards. Build a complete series
        // (gaps as 0) so the inline SVG renders a stable bar count.
        $propsDailyRaw = $own(Property::query())
            ->where('created_at', '>=', now()->subDays(14))
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')->orderBy('day')->get()->keyBy('day');
        $propsSparkline = collect(range(13, 0))->map(function ($daysAgo) use ($propsDailyRaw) {
            $day = now()->subDays($daysAgo)->toDateString();
            return (int) ($propsDailyRaw[$day]->count ?? 0);
        })->values();

        $scrapedDailyRaw = ScrapedListing::query()
            ->where('created_at', '>=', now()->subDays(14))
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')->orderBy('day')->get()->keyBy('day');
        $scrapedSparkline = collect(range(13, 0))->map(function ($daysAgo) use ($scrapedDailyRaw) {
            $day = now()->subDays($daysAgo)->toDateString();
            return (int) ($scrapedDailyRaw[$day]->count ?? 0);
        })->values();

        $autopostStats = [
            'total'  => AutoPostRequest::count(),
            'posted' => AutoPostRequest::where('status', 'posted')->count(),
        ];

        $recentProperties = $own(Property::with('coverMedia'))
            ->latest()
            ->limit(5)
            ->get();

        $recentContacts = $own(Contact::query())->latest()->limit(5)->get();

        $hotDeals = ScrapedListing::where('ai_valuation', 'cheap')
            ->where('owner_type', 'owner')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn ($l) => [
                'id'           => $l->id,
                'title'        => $l->title,
                'price'        => $l->price,
                'area'         => $l->area,
                'city'         => $l->city,
                'district'     => $l->district,
                'images'       => $l->images ?? [],
                'ai_valuation' => $l->ai_valuation,
                'external_url' => $l->external_url,
            ]);

        return Inertia::render('Dashboard/Index', [
            'stats'            => $stats,
            'recentProperties' => $recentProperties,
            'recentContacts'   => $recentContacts,
            'hotDeals'         => $hotDeals,
            'lastUpdated'      => now()->toTimeString('minute'),
            'growth'           => ['week' => $weekGrowth, 'deals' => $dealsGrowth],
            'trends'           => $trends,
            'scrapedStats'     => $scrapedStats,
            'scrapedDaily'     => $scrapedDaily,
            'scrapedByType'    => $scrapedByType,
            'autopostStats'    => $autopostStats,
            'sparklines'       => ['properties' => $propsSparkline, 'scraped' => $scrapedSparkline],
        ]);
    }
}
