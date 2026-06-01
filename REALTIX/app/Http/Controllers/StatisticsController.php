<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactInteraction;
use App\Models\Deal;
use App\Models\PhoneInteraction;
use App\Models\Property;
use App\Models\ScrapedListing;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StatisticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user   = $request->user();
        $isAdmin = $user->hasRole('admin');
        $period = $request->get('period', 'month');

        [$dateFrom, $dateTo, $periodLabel, $isCustom] = $this->resolveDateRange($request);

        // When from+to are explicitly provided we mark the period as 'custom'
        // so the prev-period match() inside the stats helpers derives length
        // from the actual range instead of falling back to a calendar boundary.
        $internalPeriod = $isCustom ? 'custom' : $period;

        $data = $isAdmin
            ? $this->adminStats($user, $dateFrom, $internalPeriod, $dateTo)
            : $this->realtorStats($user, $dateFrom, $dateTo);

        // Deals tab payload — mirrors DealController@index so the in-page
        // "Tranzacții" tab renders the same data without an extra navigation.
        // Capped at 50 latest rows because the tab uses a simple list, not
        // pagination; the dedicated /deals page keeps full paginated access.
        $own = fn ($q) => $isAdmin ? $q : $q->where('user_id', $user->id);
        $dealsList = Deal::with(['contact', 'property'])
            ->when(! $isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->limit(50)
            ->get();
        $dealsStats = [
            'total_volume'     => $own(Deal::query())->where('status', 'closed')->sum('value'),
            'total_commission' => $own(Deal::query())->where('status', 'closed')->sum('commission'),
            'active_count'     => $own(Deal::query())->whereNotIn('status', ['closed', 'lost'])->count(),
        ];

        return Inertia::render('Statistics/Index', array_merge($data, [
            'isAdmin'     => $isAdmin,
            'period'      => $period,                  // kept for ExportModal links
            'from'        => $dateFrom->toDateString(),
            'to'          => $dateTo->toDateString(),
            'periodLabel' => $periodLabel,
            'dealsList'   => $dealsList,
            'dealsStats'  => $dealsStats,
        ]));
    }

    /**
     * Resolve the active date range for stats queries.
     * Priority: explicit ?from=&to= → period preset (week/month/year) → default
     * (last 30 days). Returns [Carbon $from, Carbon $to, string $humanLabel,
     * bool $isCustom]. Custom ranges get range-length swap protection and a
     * cap at today so a future $to never widens the window past now().
     */
    private function resolveDateRange(Request $request): array
    {
        $rawFrom = $request->get('from');
        $rawTo   = $request->get('to');

        if ($rawFrom && $rawTo) {
            try {
                $from = Carbon::parse($rawFrom)->startOfDay();
                $to   = Carbon::parse($rawTo)->endOfDay();
                if ($from->gt($to)) {
                    [$from, $to] = [
                        $to->copy()->startOfDay(),
                        $from->copy()->endOfDay(),
                    ];
                }
                if ($to->gt(now())) {
                    $to = now()->endOfDay();
                }
                if ($from->isSameDay($to)) {
                    $label = $from->locale('ro')->isoFormat('D MMM YYYY');
                } else {
                    $label = $from->locale('ro')->isoFormat('D MMM') . ' – '
                           . $to->locale('ro')->isoFormat('D MMM YYYY');
                }
                return [$from, $to, $label, true];
            } catch (\Exception $e) {
                // Fall through to period preset on unparseable dates.
            }
        }

        $period = $request->get('period', 'month');
        $to     = now()->endOfDay();
        switch ($period) {
            case 'week':
                $from  = now()->subDays(7)->startOfDay();
                $label = 'Ultimele 7 zile';
                break;
            case 'year':
                $from  = now()->subYear()->startOfDay();
                $label = 'Ultimul an';
                break;
            case 'month':
            default:
                $from  = now()->subDays(30)->startOfDay();
                $label = 'Ultimele 30 zile';
                break;
        }
        return [$from, $to, $label, false];
    }

    public function exportPdf(Request $request)
    {
        $user    = $request->user();
        $isAdmin = $user->hasRole('admin');
        $period  = $request->get('period', 'month');
        $sections = $this->parseSections($request);

        $from = match($period) {
            'week'  => now()->startOfWeek(),
            'year'  => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $data = $isAdmin
            ? $this->adminStats($user, $from, $period)
            : $this->realtorStats($user, $from);

        $pdf = Pdf::loadView('statistics.pdf', array_merge($data, [
            'isAdmin'      => $isAdmin,
            'period'       => $period,
            'periodLabel'  => $this->periodLabel($period),
            'agency'       => $user->agency,
            'user'         => $user,
            'generatedAt'  => now(),
            'sections'     => $sections,
        ]))->setPaper('a4', 'portrait');

        $filename = sprintf(
            'realtix-statistics-%s-%s.pdf',
            $period,
            now()->format('Y-m-d')
        );

        return $pdf->download($filename);
    }

    /**
     * Parse sections=a,b,c query param. Returns null if not provided (= include all sections).
     * @return array<string>|null
     */
    private function parseSections(Request $request): ?array
    {
        $raw = $request->get('sections');
        if (! $raw) return null;
        $list = array_filter(array_map('trim', explode(',', $raw)));
        return empty($list) ? null : $list;
    }

    private function wants(?array $sections, string $key): bool
    {
        return $sections === null || in_array($key, $sections, true);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $user    = $request->user();
        $isAdmin = $user->hasRole('admin');
        $period  = $request->get('period', 'month');
        $sections = $this->parseSections($request);

        $from = match($period) {
            'week'  => now()->startOfWeek(),
            'year'  => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $data = $isAdmin
            ? $this->adminStats($user, $from, $period)
            : $this->realtorStats($user, $from);

        $filename = sprintf('realtix-statistics-%s-%s.csv', $period, now()->format('Y-m-d'));

        return response()->stream(function () use ($data, $isAdmin, $period, $user, $sections) {
            $out = fopen('php://output', 'w');
            // BOM for Excel UTF-8
            fwrite($out, "\xEF\xBB\xBF");

            $sep = [];
            $row = fn (array $r) => fputcsv($out, $r, ';');
            $wants = fn (string $key) => $this->wants($sections, $key);

            $row(['REALTIX — Raport Statistici']);
            $row(['Agenție', $user->agency?->name ?? '—']);
            $row(['Utilizator', $user->name]);
            $row(['Perioadă', $this->periodLabel($period)]);
            $row(['Generat', now()->format('d.m.Y H:i')]);
            $row($sep);

            if ($isAdmin) {
                if ($wants('summary')) {
                    $row(['== SUMAR AGENȚIE ==']);
                    $row(['Metric', 'Valoare']);
                    $row(['Proprietăți total', $data['propertiesTotal']]);
                    $row(['Proprietăți active', $data['propertiesActive']]);
                    $row(['Proprietăți noi (perioada)', $data['propertiesThisPeriod']]);
                    $row(['Proprietăți noi (perioada anterioară)', $data['propertiesPrevPeriod']]);
                    $row(['Contacte total', $data['contactsTotal']]);
                    $row(['Apeluri total', $data['callsTotal']]);
                    $row(['Apeluri (perioada)', $data['callsPeriod']]);
                    $row(['Conversie apel→sdelka (%)', $data['callConversion']]);
                    $row(['Tranzacții (perioada)', $data['dealsPeriod']]);
                    $row(['Venit (perioada)', number_format($data['revenuePeriod'], 2, '.', '')]);
                    $row(['Venit (perioada anterioară)', number_format($data['revenuePrev'], 2, '.', '')]);
                    $row(['Comision mediu', number_format($data['avgCommission'], 2, '.', '')]);
                    $row(['Zile mediu închidere', $data['avgDaysToClose']]);
                    $row(['Anunțuri scrap. total', $data['scrapedTotal']]);
                    $row($sep);
                }

                if ($wants('by_type')) {
                    $row(['== PROPRIETĂȚI PE TIP ==']);
                    $row(['Tip', 'Total']);
                    foreach ($data['propertiesByType'] as $t => $n) {
                        $row([$t, $n]);
                    }
                    $row($sep);
                }

                if ($wants('agents')) {
                    $row(['== AGENȚI ==']);
                    $row(['Nume', 'Proprietăți', 'Tranzacții', 'Contacte', 'Apeluri', 'Vizualizări', 'Venit', 'Zile mediu închidere']);
                    foreach ($data['agentStats'] as $a) {
                        $row([
                            $a['name'],
                            $a['properties_count'],
                            $a['deals_count'],
                            $a['contacts_count'],
                            $a['calls_count'],
                            $a['views_total'],
                            number_format($a['revenue'], 2, '.', ''),
                            $a['avg_days_close'] ?? '—',
                        ]);
                    }
                    $row($sep);
                }

                if ($wants('revenue_monthly')) {
                    $row(['== VENIT PE LUNI (an curent) ==']);
                    $row(['Luna', 'Venit']);
                    foreach ($data['revenueByMonth'] as $m) {
                        $row([$m['month'], number_format($m['total'], 2, '.', '')]);
                    }
                    $row($sep);
                }

                if ($wants('top_districts')) {
                    $row(['== TOP DISTRICTE (anunțuri săptămâna asta) ==']);
                    $row(['District', 'Anunțuri']);
                    foreach ($data['top5Districts'] as $d) {
                        $row([$d['district'], $d['count']]);
                    }
                    $row($sep);
                }

                if ($wants('avg_price')) {
                    $row(['== PREȚ MEDIU €/m² PE DISTRICT ==']);
                    $row(['District', 'Preț mediu €/m²', 'Anunțuri']);
                    foreach ($data['avgPriceByDistrict'] as $d) {
                        $row([$d['district'], $d['avg_price'], $d['count']]);
                    }
                    $row($sep);
                }

                if ($wants('ai_insights') && ! empty($data['aiInsights'])) {
                    $ai = $data['aiInsights'];
                    $row(['== AI INSIGHTS ==']);
                    if (! empty($ai['trends'])) {
                        $row(['— Predicții tendințe —']);
                        foreach ($ai['trends'] as $t) {
                            $row([$t['badge'] ?? '', $t['text'] ?? '']);
                        }
                        $row($sep);
                    }
                    if (! empty($ai['priceRecommendations'])) {
                        $row(['— Recomandări prețuri —']);
                        $row(['Agent', 'Recomandare']);
                        foreach ($ai['priceRecommendations'] as $r) {
                            $row([$r['name'] ?? '', $r['text'] ?? '']);
                        }
                        $row($sep);
                    }
                    if (! empty($ai['forecast'])) {
                        $row(['— Prognoză venit —']);
                        $row(['Orizont', 'Variație %', 'Estimare €']);
                        $row(['Luna viitoare', $ai['forecast']['next_month']['pct'] ?? 0, $ai['forecast']['next_month']['amount'] ?? 0]);
                        $row(['Trimestrul viitor', $ai['forecast']['next_quarter']['pct'] ?? 0, $ai['forecast']['next_quarter']['amount'] ?? 0]);
                        $row(['Sfârșitul anului', $ai['forecast']['next_year']['pct'] ?? 0, $ai['forecast']['next_year']['amount'] ?? 0]);
                    }
                }
            } else {
                if ($wants('summary')) {
                    $row(['== SUMAR PERSONAL ==']);
                    $row(['Metric', 'Valoare']);
                    $row(['Proprietăți total', $data['propertiesTotal']]);
                    $row(['Proprietăți active', $data['propertiesActive']]);
                    $row(['Proprietăți arhivate', $data['propertiesArchived']]);
                    $row(['Contacte total', $data['contactsTotal']]);
                    $row(['Vizualizări total', $data['viewsTotal']]);
                    $row(['Apeluri total', $data['myCallsTotal']]);
                    $row(['Apeluri (perioada)', $data['myCallsPeriod']]);
                    $row(['Conversie apel→sdelka (%)', $data['callConversion']]);
                    $row(['Tranzacții închise', $data['myDealsTotal']]);
                    $row(['Tranzacții în lucru', $data['myDealsInProgress']]);
                    $row(['Tranzacții (perioada)', $data['dealsPeriod']]);
                    $row(['Venit (perioada)', number_format($data['revenuePeriod'], 2, '.', '')]);
                    $row(['Venit total', number_format($data['revenueTotal'], 2, '.', '')]);
                    $row($sep);
                }

                if ($wants('top_properties')) {
                    $row(['== TOP 3 PROPRIETĂȚI (după vizualizări) ==']);
                    $row(['ID', 'Titlu', 'Vizualizări', 'Status', 'Tip']);
                    foreach ($data['top3Properties'] as $p) {
                        $row([$p['id'], $p['title'], $p['views_count'], $p['status'], $p['type']]);
                    }
                    $row($sep);
                }

                if ($wants('revenue_monthly')) {
                    $row(['== VENIT PE LUNI (an curent) ==']);
                    $row(['Luna', 'Venit']);
                    foreach ($data['revenueByMonth'] as $m) {
                        $row([$m['month'], number_format($m['total'], 2, '.', '')]);
                    }
                }
            }

            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function periodLabel(string $period): string
    {
        return match($period) {
            'week'  => 'Săptămâna curentă',
            'year'  => 'Anul curent',
            default => 'Luna curentă',
        };
    }

    private function adminStats(User $user, $from, string $period, ?Carbon $to = null): array
    {
        $agencyId = $user->agency_id;
        $to       = $to ?? now();

        // ── Properties — all listings belonging to the agency, including
        // those imported from scraped sites. (We used to filter out rows
        // where meta->imported_from was set, but that hid 11 of 12 props
        // for agency 1 and made the KPI look broken.)
        $ownProperties = fn () => Property::withoutGlobalScopes()
            ->where('agency_id', $agencyId);

        $propertiesTotal  = $ownProperties()->count();
        $propertiesActive = $ownProperties()->where('status', 'active')->count();

        $propertiesByType = $ownProperties()
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $propertiesThisPeriod = $ownProperties()
            ->whereBetween('created_at', [$from, $to])
            ->count();

        // Previous period — same length offset back for custom ranges; calendar
        // boundary for the period presets (preserves export behaviour).
        $rangeSeconds = max(1, (int) $from->diffInSeconds($to));
        $prevFrom = match($period) {
            'week'   => now()->subWeek()->startOfWeek(),
            'year'   => now()->subYear()->startOfYear(),
            'custom' => $from->copy()->subSecond()->subSeconds($rangeSeconds),
            default  => now()->subMonth()->startOfMonth(),
        };
        $prevTo = match($period) {
            'week'   => now()->subWeek()->endOfWeek(),
            'year'   => now()->subYear()->endOfYear(),
            'custom' => $from->copy()->subSecond(),
            default  => now()->subMonth()->endOfMonth(),
        };
        $propertiesPrevPeriod = $ownProperties()
            ->whereBetween('created_at', [$prevFrom, $prevTo])
            ->count();

        // ── Market (scraped listings) ────────────────────────────────────────
        $scrapedTotal = ScrapedListing::count();

        $scrapedByWeek = ScrapedListing::selectRaw("CAST(EXTRACT(WEEK FROM created_at) AS INTEGER) as week_num, COUNT(*) as total")
            ->whereYear('created_at', now()->year)
            ->groupBy('week_num')
            ->orderBy('week_num')
            ->get()
            ->map(fn($r) => ['week' => (int) $r->week_num, 'total' => (int) $r->total])
            ->values();

        $avgPriceByDistrict = ScrapedListing::query()
            ->whereNotNull('district')->where('district', '!=', '')
            ->whereNotNull('price')->where('price', '>', 0)
            ->whereNotNull('area')->where('area', '>', 0)
            ->whereIn('type', ['apartment', 'house', 'office', 'commercial'])
            ->selectRaw('district, ROUND(AVG(price / area)) as avg_price_sqm, COUNT(*) as cnt')
            ->groupBy('district')
            ->havingRaw('COUNT(*) >= 5')
            ->havingRaw('AVG(price / area) BETWEEN 200 AND 5000')
            ->orderByDesc('avg_price_sqm')
            ->limit(8)
            ->get()
            ->map(fn($r) => ['district' => $r->district, 'avg_price' => (int) $r->avg_price_sqm, 'count' => (int) $r->cnt]);

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

        // ── Calls (phone_interactions is the real call-tracking table.
        //     contact_interactions still exists for legacy contact-side
        //     events but the dashboard uses phone_interactions). ──
        $callsTotal = PhoneInteraction::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->count();

        $callsPeriod = PhoneInteraction::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $callsPrevPeriod = PhoneInteraction::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->whereBetween('created_at', [$prevFrom, $prevTo])
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
            ->whereBetween('closed_at', [$from, $to])
            ->count();

        $revenuePeriod = (float) Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereBetween('closed_at', [$from, $to])
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
        // Phone interactions aggregated once: split by subject type + outcome.
        $phoneAgg = \DB::table('phone_interactions')
            ->where('agency_id', $agencyId)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('user_id, subject_type, outcome, COUNT(*) AS c')
            ->groupBy('user_id', 'subject_type', 'outcome')
            ->get()
            ->groupBy('user_id');

        $propertyMorph = Property::class;
        $listingMorph  = ScrapedListing::class;

        $agentStats = User::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->withCount([
                'properties as properties_count',
                'deals as deals_count',
                'contacts as contacts_count',
            ])
            ->get()
            ->map(function ($u) use ($phoneAgg, $propertyMorph, $listingMorph) {
                $rows = $phoneAgg->get($u->id, collect());

                $countBy = fn (string $morph, array $outcomes) => (int) $rows
                    ->where('subject_type', $morph)
                    ->whereIn('outcome', $outcomes)
                    ->sum('c');

                $woViews    = $countBy($listingMorph, ['viewed']);
                $woAttempts = $countBy($listingMorph, ['called', 'no_answer']);
                $woSuccess  = $countBy($listingMorph, ['called']);

                $ownAttempts = $countBy($propertyMorph, ['called', 'no_answer', 'refused']);
                $ownSuccess  = $countBy($propertyMorph, ['called']);
                $ownRefused  = $countBy($propertyMorph, ['refused']);

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
                    'calls_count'      => $woSuccess + $ownSuccess,
                    'views_total'      => $views,
                    'revenue'          => $revenue,
                    'avg_days_close'   => $avgDays,
                    'wo_views'         => $woViews,
                    'wo_attempts'      => $woAttempts,
                    'wo_success'       => $woSuccess,
                    'own_attempts'     => $ownAttempts,
                    'own_success'      => $ownSuccess,
                    'own_refused'      => $ownRefused,
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

        $aiInsights = $this->aiInsights($agencyId, $agentStats);

        // Trend percentages for the headline KPI cards. Returning null when
        // prev=0 and current>0 lets the UI label the metric as "Nou" instead
        // of an arbitrary "+100%" or "▲ 0%".
        $propertiesTrendPct = $this->trendPct($propertiesThisPeriod, $propertiesPrevPeriod);
        $callsTrendPct      = $this->trendPct($callsPeriod, $callsPrevPeriod);
        $revenueTrendPct    = $this->trendPct((int) round($revenuePeriod), (int) round($revenuePrev));

        return compact(
            'propertiesTotal', 'propertiesActive', 'propertiesByType',
            'propertiesThisPeriod', 'propertiesPrevPeriod', 'propertiesTrendPct',
            'scrapedTotal', 'scrapedByWeek', 'avgPriceByDistrict', 'top5Districts',
            'contactsTotal', 'contactsByType',
            'callsTotal', 'callsPeriod', 'callsPrevPeriod', 'callConversion', 'callsTrendPct',
            'dealsPeriod', 'revenuePeriod', 'revenuePrev', 'revenueTrendPct', 'avgCommission',
            'avgDaysToClose', 'agentStats', 'revenueByMonth', 'aiInsights'
        );
    }

    /**
     * Percentage change from prev → current with the dashboard's three-state
     * convention: null when prev=0 and current>0 (rendered as "Nou"), 0.0
     * when both are zero or equal, else rounded float.
     */
    private function trendPct(int $current, int $previous): ?float
    {
        if ($previous === 0) {
            return $current > 0 ? null : 0.0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Real AI Insights computed from scraped market data + agency deals.
     * Returns: trends (3 signals), priceRecommendations (per-agent), forecast (1m/3m/1y).
     */
    private function aiInsights(int $agencyId, $agentStats): array
    {
        $now        = now();
        $period30   = $now->copy()->subDays(30);
        $periodPrev = $now->copy()->subDays(60);

        // ── 1. Trends: type+district segments with biggest growth/decline (market) ──
        $segmentCurrent = ScrapedListing::query()
            ->whereBetween('created_at', [$period30, $now])
            ->whereNotNull('district')->where('district', '!=', '')
            ->whereNotNull('type')
            ->selectRaw('type, district, COUNT(*) as cnt')
            ->groupBy('type', 'district')
            ->havingRaw('COUNT(*) >= 5')
            ->get();

        $segmentPrev = ScrapedListing::query()
            ->whereBetween('created_at', [$periodPrev, $period30])
            ->whereNotNull('district')->where('district', '!=', '')
            ->whereNotNull('type')
            ->selectRaw('type, district, COUNT(*) as cnt')
            ->groupBy('type', 'district')
            ->get()
            ->keyBy(fn ($r) => "{$r->type}|{$r->district}");

        $segmentChanges = $segmentCurrent->map(function ($r) use ($segmentPrev) {
            $prev = (int) ($segmentPrev["{$r->type}|{$r->district}"]->cnt ?? 0);
            $cur  = (int) $r->cnt;
            $pct  = $prev > 0 ? round((($cur - $prev) / $prev) * 100) : null;
            return [
                'type'     => $r->type,
                'district' => $r->district,
                'cur'      => $cur,
                'prev'     => $prev,
                'pct'      => $pct,
            ];
        })->filter(fn ($x) => $x['pct'] !== null)->values();

        $typeLabels = [
            'apartment' => 'apartamentelor',
            'house'     => 'caselor',
            'land'      => 'terenurilor',
            'commercial'=> 'spațiilor comerciale',
            'office'    => 'birourilor',
            'garage'    => 'garajelor',
        ];

        $trends = [];
        $rising = $segmentChanges->sortByDesc('pct')->first();
        if ($rising && $rising['pct'] >= 10) {
            $label = $typeLabels[$rising['type']] ?? "anunțurilor de tip „{$rising['type']}\"";
            $trends[] = [
                'icon'  => '📈',
                'text'  => "Oferta {$label} în {$rising['district']} a crescut cu {$rising['pct']}% în ultimele 30 zile (vs. perioada anterioară).",
                'badge' => 'Creștere',
                'color' => 'green',
            ];
        }

        $falling = $segmentChanges->sortBy('pct')->first();
        if ($falling && $falling['pct'] <= -10) {
            $label = $typeLabels[$falling['type']] ?? "anunțurilor de tip „{$falling['type']}\"";
            $trends[] = [
                'icon'  => '📉',
                'text'  => "Oferta {$label} în {$falling['district']} a scăzut cu " . abs($falling['pct']) . "% — potențial moment de achiziție.",
                'badge' => 'Atenție',
                'color' => 'amber',
            ];
        }

        // Fastest-moving district by agency deals (median days from created → closed)
        $dealsByDistrict = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereNotNull('closed_at')
            ->with('property:id,district')
            ->get()
            ->filter(fn ($d) => $d->property && $d->property->district)
            ->groupBy(fn ($d) => $d->property->district);

        if ($dealsByDistrict->isNotEmpty()) {
            $medianByDistrict = $dealsByDistrict->map(function ($group) {
                $days = $group->map(fn ($d) => $d->created_at->diffInDays($d->closed_at))->sort()->values();
                return (int) round($days[(int) floor($days->count() / 2)]);
            })->sort();
            $globalMedian = (int) round($medianByDistrict->avg());
            $fastest      = $medianByDistrict->keys()->first();
            $fastestDays  = $medianByDistrict->first();
            if ($globalMedian > 0 && $fastestDays < $globalMedian) {
                $trends[] = [
                    'icon'  => '🏘️',
                    'text'  => "Sectorul {$fastest} are cel mai rapid ritm de realizare în agenția ta — mediana {$fastestDays} zile (media agenție: {$globalMedian} zile).",
                    'badge' => 'Rapid',
                    'color' => 'blue',
                ];
            }
        }

        // ── 2. Price recommendations: market median vs. agent's active listings ──
        $marketMedian = ScrapedListing::query()
            ->whereNotNull('price')->where('price', '>', 0)
            ->whereNotNull('district')->where('district', '!=', '')
            ->whereNotNull('type')
            ->where('created_at', '>=', $now->copy()->subDays(90))
            ->selectRaw('type, district, COUNT(*) as cnt, AVG(price) as avg_price')
            ->groupBy('type', 'district')
            ->havingRaw('COUNT(*) >= 3')
            ->get()
            ->keyBy(fn ($r) => "{$r->type}|{$r->district}");

        $priceRecommendations = collect($agentStats)->map(function ($a) use ($agencyId, $marketMedian) {
            $props = Property::withoutGlobalScopes()
                ->where('agency_id', $agencyId)
                ->where('user_id', $a['id'])
                ->where('status', 'active')
                ->whereNotNull('price')->where('price', '>', 0)
                ->whereNotNull('district')
                ->whereNotNull('type')
                ->get(['id', 'type', 'district', 'price', 'created_at']);

            if ($props->isEmpty()) {
                if (($a['avg_days_close'] ?? null) !== null && $a['avg_days_close'] > 45) {
                    return [
                        'name' => $a['name'],
                        'text' => "Timp mediu de închidere ridicat ({$a['avg_days_close']} zile). Evaluează reducerea prețului cu 5-8% la anunțurile cu vechime > 30 zile.",
                    ];
                }
                return ['name' => $a['name'], 'text' => 'Niciun anunț activ — nu există date suficiente pentru recomandare.'];
            }

            $overpriced = $props->filter(function ($p) use ($marketMedian) {
                $median = $marketMedian["{$p->type}|{$p->district}"]->avg_price ?? null;
                return $median && (float) $p->price > (float) $median * 1.15;
            });

            $ratio = round(($overpriced->count() / $props->count()) * 100);
            if ($overpriced->count() === 0) {
                return [
                    'name' => $a['name'],
                    'text' => "{$props->count()} anunțuri active, toate la nivelul medianei pieței. Strategia curentă este optimă.",
                ];
            }

            return [
                'name' => $a['name'],
                'text' => "{$overpriced->count()} din {$props->count()} anunțuri ({$ratio}%) sunt cu peste 15% peste mediana pieței pentru tip+sector. Evaluează ajustarea prețului.",
            ];
        })->take(3)->values();

        // ── 3. Revenue forecast: linear projection from last 3 months ──
        $monthly = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereNotNull('closed_at')
            ->where('closed_at', '>=', $now->copy()->subMonths(6))
            ->get(['closed_at', 'commission'])
            ->groupBy(fn ($d) => $d->closed_at->format('Y-m'))
            ->map(fn ($g) => (float) $g->sum('commission'));

        $forecast = null;
        if ($monthly->count() >= 2) {
            $values = $monthly->values()->all();
            $n      = count($values);
            // Average month-over-month growth
            $deltas = [];
            for ($i = 1; $i < $n; $i++) {
                if ($values[$i - 1] > 0) {
                    $deltas[] = ($values[$i] - $values[$i - 1]) / $values[$i - 1];
                }
            }
            $avgGrowth = ! empty($deltas) ? array_sum($deltas) / count($deltas) : 0;
            $lastMonth = end($values);

            $forecast = [
                'next_month'   => ['pct' => round($avgGrowth * 100), 'amount' => (int) round($lastMonth * (1 + $avgGrowth))],
                'next_quarter' => ['pct' => round($avgGrowth * 3 * 100), 'amount' => (int) round($lastMonth * 3 * (1 + $avgGrowth * 1.5))],
                'next_year'    => ['pct' => round($avgGrowth * 12 * 100), 'amount' => (int) round($lastMonth * 12 * (1 + $avgGrowth * 4))],
                'basis'        => "Calculat din {$n} luni de date.",
            ];
        }

        return [
            'trends'               => $trends,
            'priceRecommendations' => $priceRecommendations,
            'forecast'             => $forecast,
        ];
    }

    private function realtorStats(User $user, $from, ?Carbon $to = null): array
    {
        $to = $to ?? now();

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

        // Calls are tracked in phone_interactions (the contact_interactions
        // model is legacy contact-side and stays 0 for these users).
        $myCallsTotal  = PhoneInteraction::withoutGlobalScopes()
            ->where('user_id', $user->id)->count();
        $myCallsPeriod = PhoneInteraction::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to])->count();
        $myDealsTotal    = Deal::where('user_id', $user->id)->where('status', 'closed')->count();
        $myDealsInProgress = Deal::where('user_id', $user->id)->where('status', 'in_progress')->count();

        $callConversion = $myCallsTotal > 0
            ? round(($myDealsTotal / $myCallsTotal) * 100, 1)
            : 0;

        $dealsPeriod = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereBetween('closed_at', [$from, $to])
            ->count();

        $revenuePeriod = (float) Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereBetween('closed_at', [$from, $to])
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
