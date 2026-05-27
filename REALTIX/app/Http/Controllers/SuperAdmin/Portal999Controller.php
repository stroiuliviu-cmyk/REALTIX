<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ScrapedListing;
use App\Services\ScraperProcessGuard;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class Portal999Controller extends Controller
{
    public function triggerSync(Request $request, AuditLogger $audit, ScraperProcessGuard $guard): RedirectResponse
    {
        // Refuse spawning a parallel sync if one is already in flight.
        // Without this, rapid button clicks pile up 2-3 Python processes
        // competing for the same Firefox session and 999.md rate limits.
        $runningPids = $guard->getRunningPids();
        if (count($runningPids) > 0) {
            return back()->with('error',
                '⏳ Sync deja în desfășurare (PID: ' . implode(', ', $runningPids) . '). '
                . 'Așteaptă să termine sau verifică logs.'
            );
        }

        try {
            // Args mirror the hourly cron exactly (--pages=1 --skip-recent-hours=0
            // --scope-hours=1 --download-images --mode=manual). The old --today-only
            // flag was dropped — deprecated by the single-pass scraper refactor.
            Artisan::queue('portal:999:scrape', [
                '--pages'              => 1,
                '--agency'             => 1,
                '--skip-recent-hours'  => 0,
                '--scope-hours'        => 1,
                '--download-images'    => true,
                '--mode'               => 'manual',
            ]);
            $audit->record('portal_999.manual_sync', null, 'Manual 999.md sync triggered');
            return back()->with('success', '🔄 Sync 999.md pornit. Estimat: 5-8 minute.');
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'Eroare la pornire: ' . $e->getMessage());
        }
    }

    public function index(): Response
    {
        $today    = now()->startOfDay();
        $weekAgo  = now()->subDays(7);
        $monthAgo = now()->subDays(30);

        $stats = [
            'total'        => ScrapedListing::count(),
            'today'        => ScrapedListing::where('created_at', '>=', $today)->count(),
            'week'         => ScrapedListing::where('created_at', '>=', $weekAgo)->count(),
            'month'        => ScrapedListing::where('created_at', '>=', $monthAgo)->count(),
            'last_sync_at' => ScrapedListing::max('updated_at'),
        ];

        $byType = ScrapedListing::selectRaw('type, COUNT(*) as cnt')
            ->groupBy('type')
            ->pluck('cnt', 'type')->all();

        $byCity = ScrapedListing::selectRaw('city, COUNT(*) as cnt')
            ->whereNotNull('city')->where('city', '!=', '')
            ->groupBy('city')
            ->orderByDesc('cnt')
            ->limit(10)
            ->get();

        $byDay = DB::table('scraped_listings')
            ->where('created_at', '>=', $monthAgo)
            ->selectRaw("DATE(created_at) as day, COUNT(*) as cnt")
            ->groupBy('day')->orderBy('day')->get();

        // Daily breakdown by type for last 30 days. Pivots to one row per day
        // with all 4 types as columns. Missing days/types default to 0.
        $byTypeDailyRaw = DB::table('scraped_listings')
            ->where('created_at', '>=', $monthAgo)
            ->whereNotNull('type')
            ->selectRaw("DATE(created_at) as day, type, COUNT(*) as cnt")
            ->groupBy('day', 'type')
            ->orderBy('day')
            ->get();

        $byTypeDaily = [];
        foreach ($byTypeDailyRaw as $row) {
            if (! isset($byTypeDaily[$row->day])) {
                $byTypeDaily[$row->day] = [
                    'day'        => $row->day,
                    'apartment'  => 0,
                    'house'      => 0,
                    'cottage'    => 0,
                    'land'       => 0,
                    'garage'     => 0,
                    'commercial' => 0,
                ];
            }
            $byTypeDaily[$row->day][$row->type] = (int) $row->cnt;
        }
        $byTypeDaily = array_values($byTypeDaily);

        // Sub-category breakdown — count + last_scraped per (type, subtype).
        // COALESCE wraps NULL subtypes as '_none' so the frontend can render
        // them as a synthetic "Nedefinit" bucket without losing the listings.
        $bySubtype = DB::table('scraped_listings')
            ->where('source', '999md')
            ->whereNotNull('type')
            ->selectRaw("type, COALESCE(subtype, '_none') as subtype, COUNT(*) as cnt, MAX(updated_at) as last_scraped_at")
            ->groupBy('type', DB::raw("COALESCE(subtype, '_none')"))
            ->orderBy('type')
            ->orderByDesc('cnt')
            ->get();

        // Daily breakdown per subtype for last 7 days (sparkline data).
        $bySubtypeDailyRaw = DB::table('scraped_listings')
            ->where('source', '999md')
            ->where('created_at', '>=', $weekAgo)
            ->whereNotNull('type')
            ->selectRaw("type, COALESCE(subtype, '_none') as subtype, DATE(created_at) as day, COUNT(*) as cnt")
            ->groupBy('type', DB::raw("COALESCE(subtype, '_none')"), DB::raw('DATE(created_at)'))
            ->orderBy('day')
            ->get();

        $bySubtypeDaily = [];
        foreach ($bySubtypeDailyRaw as $row) {
            $key = $row->type . ':' . $row->subtype;
            if (! isset($bySubtypeDaily[$key])) {
                $bySubtypeDaily[$key] = [];
            }
            $bySubtypeDaily[$key][] = [
                'day' => $row->day,
                'cnt' => (int) $row->cnt,
            ];
        }

        // Coverage: how many listings per type have subtype populated vs NULL.
        // FILTER (WHERE ...) is SQL-standard (PG 9.4+, SQLite 3.30+).
        $coverageRaw = DB::table('scraped_listings')
            ->where('source', '999md')
            ->whereNotNull('type')
            ->selectRaw("type, COUNT(*) as total, COUNT(*) FILTER (WHERE subtype IS NOT NULL) as with_subtype")
            ->groupBy('type')
            ->get();

        $coverage = [];
        foreach ($coverageRaw as $row) {
            $coverage[$row->type] = [
                'total'        => (int) $row->total,
                'with_subtype' => (int) $row->with_subtype,
                'pct'          => $row->total > 0
                    ? round(($row->with_subtype / $row->total) * 100, 1)
                    : 0,
            ];
        }

        $syncLogs = ActivityLog::query()
            ->where(function ($q) {
                $q->where('action', 'like', 'scrape.%')
                  ->orWhere('action', 'like', 'portal_999.%')
                  ->orWhere('description', 'ilike', '%999.md%');
            })
            ->latest()
            ->take(30)
            ->get(['id', 'action', 'description', 'created_at', 'properties']);

        return Inertia::render('SuperAdmin/Portal999/Index', [
            'stats'           => $stats,
            'byType'          => $byType,
            'byCity'          => $byCity,
            'byDay'           => $byDay,
            'byTypeDaily'     => $byTypeDaily,
            'bySubtype'       => $bySubtype,
            'bySubtypeDaily'  => $bySubtypeDaily,
            'coverage'        => $coverage,
            'syncLogs'        => $syncLogs,
        ]);
    }
}
