<?php

namespace App\Console\Commands;

use App\Models\ScraperRun;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Verifies the Python scraper is alive by checking the heartbeat file it
 * writes once per minute. If the heartbeat is older than 15 minutes we
 * consider the process stuck, kill it by PID and bump the failures counter
 * so the scheduler stops poking the same dead horse.
 */
class ScraperWatchdog extends Command
{
    protected $signature = 'scraper:watchdog';
    protected $description = 'Verify scraper heartbeat and kill stale processes';

    /** Heartbeat older than this is considered stuck. */
    private const STALE_AFTER_MINUTES = 15;

    public function handle(): int
    {
        $heartbeatPath = storage_path('app/scraper_heartbeat.txt');

        if (! file_exists($heartbeatPath)) {
            $this->info('No active scraper run — skipping');
            return self::SUCCESS;
        }

        $contents = trim((string) @file_get_contents($heartbeatPath));
        if ($contents === '') {
            $this->warn('Empty heartbeat file — removing');
            @unlink($heartbeatPath);
            return self::SUCCESS;
        }

        // Accept two formats:
        //   1. JSON (current): {"timestamp": "<ISO>", "pid": <int>, "run_id": ..., "category": ...}
        //   2. Legacy:         "<ISO8601>|<PID>"  (kept for backward-compat with older scraper builds)
        $timestamp = null;
        $pid       = null;
        if (str_starts_with($contents, '{')) {
            $decoded = json_decode($contents, true);
            if (is_array($decoded)) {
                $timestamp = $decoded['timestamp'] ?? null;
                $pid       = $decoded['pid'] ?? null;
            }
        }
        if ($timestamp === null) {
            [$timestamp, $pid] = array_pad(explode('|', $contents, 2), 2, null);
        }

        if (! $timestamp) {
            $this->warn('Invalid heartbeat file — removing');
            @unlink($heartbeatPath);
            return self::FAILURE;
        }

        try {
            $heartbeatAt = Carbon::parse($timestamp);
        } catch (\Throwable $e) {
            $this->warn("Unparseable heartbeat timestamp '{$timestamp}' — removing");
            @unlink($heartbeatPath);
            return self::FAILURE;
        }

        $ageMin = (int) $heartbeatAt->diffInMinutes(now());

        if ($ageMin <= self::STALE_AFTER_MINUTES) {
            $this->info("Heartbeat OK ({$ageMin} min old, PID {$pid})");
            return self::SUCCESS;
        }

        $this->error("Stale heartbeat ({$ageMin} min old) — killing PID {$pid}");

        if ($pid && is_numeric($pid)) {
            $this->killProcess((int) $pid);
        }

        @unlink($heartbeatPath);

        // Count this as a failure so repeated stuck runs eventually pause the schedule.
        $failures = (int) Cache::get('scraper_recent_failures', 0);
        Cache::put('scraper_recent_failures', $failures + 1, now()->addHour());

        return self::FAILURE;
    }

    /**
     * Pre-mark the matching scraper_runs row as 'killed' *before* signalling
     * the process. If we end up sending SIGKILL, Python's atexit handler
     * never runs and the row would otherwise stay stuck on 'running' forever
     * (this is Bug B from the 16:13 incident — orphan-killed runs leaving
     * stale rows that confused the dashboard's "active run" panel).
     *
     * Linux: SIGTERM, poll up to 5 s, then SIGKILL.
     * Windows: taskkill /F (no graceful path) — kept for dev-on-Windows.
     */
    private function killProcess(int $pid): void
    {
        $this->preMarkRunAsKilled($pid);

        if (PHP_OS_FAMILY === 'Windows') {
            @exec(sprintf('taskkill /F /PID %d 2>&1', $pid));
            $this->info("Killed PID {$pid} (taskkill)");
            return;
        }

        @shell_exec("kill -TERM {$pid} 2>/dev/null");

        $waited = 0;
        while ($waited < 5) {
            if (! @posix_kill($pid, 0)) {
                $this->info("PID {$pid} exited gracefully after SIGTERM");
                return;
            }
            sleep(1);
            $waited++;
        }

        @shell_exec("kill -9 {$pid} 2>/dev/null");
        $this->info("Killed PID {$pid} (SIGKILL after 5s grace)");
    }

    /**
     * Best-effort pre-kill update of the scraper_runs row tied to this PID.
     * Wrapped in try/catch — the table may not exist on fresh checkouts and
     * we never want a failed bookkeeping write to block the actual kill.
     */
    private function preMarkRunAsKilled(int $pid): void
    {
        try {
            $run = ScraperRun::where('pid', $pid)
                ->where('status', 'running')
                ->latest('started_at')
                ->first();

            if (! $run) {
                return;
            }

            $duration = $run->started_at
                ? (int) $run->started_at->diffInSeconds(now())
                : null;

            $run->update([
                'status'           => 'killed',
                'ended_at'         => now(),
                'duration_seconds' => $duration,
                'error_message'    => 'Killed by watchdog (heartbeat stale > '
                                      . self::STALE_AFTER_MINUTES . ' min)',
            ]);
            $this->info("Pre-marked scraper_runs #{$run->id} as 'killed'");
        } catch (\Throwable $e) {
            $this->warn('Failed to pre-mark run row: ' . $e->getMessage());
        }
    }
}
