<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ScrapedListing;
use App\Models\ScraperRun;
use App\Services\ScraperProcessGuard;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

        // Live "listings touched" feed — last 30 listings updated in the past
        // 10 minutes. is_new is derived from created_at ≈ updated_at (UPSERT
        // INSERT path) vs ≠ (UPDATE path) so the dashboard can colour them.
        $recentlyTouched = ScrapedListing::query()
            ->where('source', '999md')
            ->where('updated_at', '>=', now()->subMinutes(10))
            ->orderByDesc('updated_at')
            ->limit(30)
            ->get(['id', 'external_id', 'external_url', 'title', 'price', 'currency',
                   'type', 'subtype', 'updated_at', 'created_at'])
            ->map(fn ($l) => [
                'id'           => $l->id,
                'external_id'  => $l->external_id,
                'external_url' => $l->external_url,
                'title'        => mb_substr($l->title ?? '', 0, 60),
                'price'        => $l->price,
                'currency'     => $l->currency,
                'type'         => $l->type,
                'subtype'      => $l->subtype,
                'updated_at'   => $l->updated_at?->toIso8601String(),
                'is_new'       => $l->created_at && $l->updated_at
                                  && $l->created_at->diffInSeconds($l->updated_at) < 5,
            ]);

        $syncLogs = ActivityLog::query()
            ->where(function ($q) {
                $q->where('action', 'like', 'scrape.%')
                  ->orWhere('action', 'like', 'portal_999.%')
                  ->orWhere('description', 'ilike', '%999.md%');
            })
            ->latest()
            ->take(30)
            ->get(['id', 'action', 'description', 'created_at', 'properties']);

        // Run-tracking data (scraper_runs table). Wrapped in a defensive
        // check so a missing migration in a fresh checkout doesn't 500 the
        // dashboard — the section just renders empty until migrate runs.
        $recentRuns = collect();
        $runsAgg    = ['count_24h' => 0, 'success_24h' => 0, 'failed_24h' => 0,
                       'avg_duration_sec' => null, 'total_new_24h' => 0, 'total_updated_24h' => 0];
        $activeRun  = null;

        if (Schema::hasTable('scraper_runs')) {
            $recentRuns = ScraperRun::orderByDesc('started_at')
                ->limit(20)
                ->get()
                ->map(fn ($run) => [
                    'id'               => $run->id,
                    'mode'             => $run->mode,
                    'pid'              => $run->pid,
                    'started_at'       => $run->started_at?->toIso8601String(),
                    'ended_at'         => $run->ended_at?->toIso8601String(),
                    'duration_human'   => $run->durationHuman(),
                    'duration_seconds' => $run->duration_seconds,
                    'status'           => $run->status,
                    'exit_code'        => $run->exit_code,
                    'total_processed'  => $run->total_processed,
                    'total_new'        => $run->total_new,
                    'total_updated'    => $run->total_updated,
                    'total_skipped'    => $run->total_skipped,
                    'total_failed'     => $run->total_failed,
                    'category_stats'   => $run->category_stats ?? [],
                    'current_category' => $run->current_category,
                    'error_message'    => $run->error_message,
                    'is_active'        => $run->isActive(),
                ]);

            $last24h = ScraperRun::where('started_at', '>=', now()->subDay())->get();
            $runsAgg = [
                'count_24h'         => $last24h->count(),
                'success_24h'       => $last24h->where('status', 'success')->count(),
                'failed_24h'        => $last24h->whereIn('status', ['failed', 'killed', 'timeout'])->count(),
                'avg_duration_sec'  => $last24h->where('status', 'success')->avg('duration_seconds'),
                'total_new_24h'     => (int) $last24h->sum('total_new'),
                'total_updated_24h' => (int) $last24h->sum('total_updated'),
            ];

            $active = ScraperRun::where('status', 'running')
                ->orderByDesc('started_at')
                ->first();
            if ($active) {
                $activeRun = [
                    'id'               => $active->id,
                    'pid'              => $active->pid,
                    'mode'             => $active->mode,
                    'started_at'       => $active->started_at?->toIso8601String(),
                    'current_category' => $active->current_category,
                    'total_processed'  => $active->total_processed,
                    'total_new'        => $active->total_new,
                    'total_updated'    => $active->total_updated,
                    'total_skipped'    => $active->total_skipped,
                    'total_failed'     => $active->total_failed,
                    'category_stats'   => $active->category_stats ?? [],
                ];
            }
        }

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
            'recentRuns'      => $recentRuns,
            'runsAgg'         => $runsAgg,
            'activeRun'       => $activeRun,
            'recentlyTouched' => $recentlyTouched,
        ]);
    }
}
