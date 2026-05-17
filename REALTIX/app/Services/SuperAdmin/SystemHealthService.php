<?php

namespace App\Services\SuperAdmin;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class SystemHealthService
{
    public function snapshot(): array
    {
        return Cache::remember('super_admin.system_health', 30, function () {
            return [
                'app'      => $this->appStatus(),
                'database' => $this->databaseStatus(),
                'redis'    => $this->redisStatus(),
                'queue'    => $this->queueStatus(),
                'storage'  => $this->storageStatus(),
                'php'      => $this->phpStatus(),
                'computed_at' => now()->toIso8601String(),
            ];
        });
    }

    private function appStatus(): array
    {
        return [
            'env'       => app()->environment(),
            'debug'     => config('app.debug'),
            'maintenance' => app()->isDownForMaintenance(),
            'version'   => app()->version(),
            'timezone'  => config('app.timezone'),
        ];
    }

    private function databaseStatus(): array
    {
        try {
            $start = microtime(true);
            DB::select('select 1');
            $latency = round((microtime(true) - $start) * 1000, 1);

            $driver = DB::connection()->getDriverName();
            $data = ['driver' => $driver, 'latency_ms' => $latency, 'status' => 'healthy'];

            if ($driver === 'pgsql') {
                $size = DB::select("SELECT pg_size_pretty(pg_database_size(current_database())) as size")[0]->size ?? null;
                $conns = DB::select("SELECT count(*) as c FROM pg_stat_activity WHERE datname = current_database()")[0]->c ?? null;
                $data['db_size']     = $size;
                $data['connections'] = (int) $conns;
            }
            return $data;
        } catch (\Throwable $e) {
            return ['status' => 'critical', 'error' => $e->getMessage()];
        }
    }

    private function redisStatus(): array
    {
        try {
            $start = microtime(true);
            $pong = Redis::ping();
            $latency = round((microtime(true) - $start) * 1000, 1);
            $info = Redis::info();

            return [
                'status'          => 'healthy',
                'latency_ms'      => $latency,
                'used_memory'     => $info['used_memory_human'] ?? null,
                'connected_clients' => (int) ($info['connected_clients'] ?? 0),
                'uptime_days'     => isset($info['uptime_in_days']) ? (int) $info['uptime_in_days'] : null,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unavailable', 'error' => substr($e->getMessage(), 0, 200)];
        }
    }

    private function queueStatus(): array
    {
        try {
            $pendingJobs = DB::table('jobs')->count();
            $failedJobs  = DB::table('failed_jobs')->count();
            $oldestPending = DB::table('jobs')->min('available_at');
            $oldestAge = $oldestPending ? now()->diffInMinutes(\Carbon\Carbon::createFromTimestamp($oldestPending)) : null;

            return [
                'status'             => $failedJobs > 10 ? 'warning' : ($failedJobs > 0 ? 'info' : 'healthy'),
                'pending'            => (int) $pendingJobs,
                'failed'             => (int) $failedJobs,
                'oldest_pending_min' => $oldestAge,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'critical', 'error' => $e->getMessage()];
        }
    }

    private function storageStatus(): array
    {
        $path = storage_path('app');
        $free = @disk_free_space($path);
        $total = @disk_total_space($path);
        if (! $free || ! $total) {
            return ['status' => 'unknown'];
        }
        $usedPct = round((($total - $free) / $total) * 100, 1);
        return [
            'status'   => $usedPct > 90 ? 'critical' : ($usedPct > 75 ? 'warning' : 'healthy'),
            'used_pct' => $usedPct,
            'free_gb'  => round($free / 1024 / 1024 / 1024, 1),
            'total_gb' => round($total / 1024 / 1024 / 1024, 1),
        ];
    }

    private function phpStatus(): array
    {
        return [
            'version'           => PHP_VERSION,
            'memory_limit'      => ini_get('memory_limit'),
            'memory_usage_mb'   => round(memory_get_usage(true) / 1024 / 1024, 1),
            'memory_peak_mb'    => round(memory_get_peak_usage(true) / 1024 / 1024, 1),
            'max_execution'     => (int) ini_get('max_execution_time'),
            'opcache_enabled'   => function_exists('opcache_get_status') && @opcache_get_status() !== false,
        ];
    }
}
