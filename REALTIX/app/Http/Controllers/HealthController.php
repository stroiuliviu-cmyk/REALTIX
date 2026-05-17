<?php

namespace App\Http\Controllers;

use App\Models\ScrapedListing;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $checks = [
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'checks' => [],
        ];

        // 1. Database
        try {
            DB::connection()->getPdo();
            $checks['checks']['database'] = 'ok';
        } catch (Throwable $e) {
            $checks['checks']['database'] = 'down';
            $checks['status'] = 'down';
        }

        // 2. Queue (jobs pending)
        try {
            $pending = DB::table('jobs')->count();
            $failed = DB::table('failed_jobs')->count();
            $checks['checks']['queue'] = [
                'status' => $failed > 10 ? 'degraded' : 'ok',
                'pending' => $pending,
                'failed' => $failed,
            ];
            if ($failed > 10 && $checks['status'] === 'ok') {
                $checks['status'] = 'degraded';
            }
        } catch (Throwable $e) {
            $checks['checks']['queue'] = 'unknown';
        }

        // 3. Scraper last run
        try {
            $lastListing = ScrapedListing::where('source', '999md')
                ->latest('created_at')
                ->first();

            $checks['checks']['scraper'] = [
                'last_run' => $lastListing?->created_at?->toIso8601String(),
                'minutes_ago' => $lastListing
                    ? now()->diffInMinutes($lastListing->created_at)
                    : null,
            ];
        } catch (Throwable $e) {
            $checks['checks']['scraper'] = 'unknown';
        }

        // 4. Scraped today
        try {
            $checks['checks']['scraped_today'] = ScrapedListing::whereDate('created_at', today())
                ->count();
        } catch (Throwable $e) {
            $checks['checks']['scraped_today'] = 0;
        }

        // 5. Disk space
        try {
            $bytesFree = disk_free_space(storage_path());
            $bytesTotal = disk_total_space(storage_path());
            $percentUsed = round((($bytesTotal - $bytesFree) / $bytesTotal) * 100, 1);

            $checks['checks']['disk'] = [
                'status' => $percentUsed > 90 ? 'critical' : ($percentUsed > 75 ? 'warning' : 'ok'),
                'percent_used' => $percentUsed,
                'free_gb' => round($bytesFree / 1024 / 1024 / 1024, 2),
            ];

            if ($percentUsed > 90 && $checks['status'] !== 'down') {
                $checks['status'] = 'degraded';
            }
        } catch (Throwable $e) {
            $checks['checks']['disk'] = 'unknown';
        }

        $statusCode = match ($checks['status']) {
            'ok' => 200,
            'degraded' => 200,
            'down' => 503,
            default => 200,
        };

        return response()->json($checks, $statusCode);
    }
}
