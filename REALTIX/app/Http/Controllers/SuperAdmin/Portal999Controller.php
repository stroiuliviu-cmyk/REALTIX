<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ScrapedListing;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class Portal999Controller extends Controller
{
    public function triggerSync(Request $request, AuditLogger $audit): RedirectResponse
    {
        try {
            Artisan::queue('portal:999:scrape', [
                '--pages'           => 2,
                '--skip-recent'     => 1,
                '--today-only'      => true,
                '--download-images' => true,
            ]);
            $audit->record('portal_999.manual_sync', null, 'Manual 999.md sync triggered');
            return back()->with('success', '🔄 Sync 999.md pornit în background. Verifică logs în câteva minute.');
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'Eroare la pornirea sync: ' . $e->getMessage());
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
                    'commercial' => 0,
                    'land'       => 0,
                ];
            }
            $byTypeDaily[$row->day][$row->type] = (int) $row->cnt;
        }
        $byTypeDaily = array_values($byTypeDaily);

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
            'stats'        => $stats,
            'byType'       => $byType,
            'byCity'       => $byCity,
            'byDay'        => $byDay,
            'byTypeDaily'  => $byTypeDaily,
            'syncLogs'     => $syncLogs,
        ]);
    }
}
