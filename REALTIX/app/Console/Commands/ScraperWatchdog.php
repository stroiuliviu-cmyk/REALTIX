<?php

namespace App\Console\Commands;

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

        // Heartbeat format: "<ISO8601 timestamp>|<PID>"
        [$timestamp, $pid] = array_pad(explode('|', $contents, 2), 2, null);

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
     * Best-effort SIGKILL on the worker PID. Linux uses `kill -9`; Windows
     * relies on `taskkill /F /PID`. We intentionally do not throw on
     * failure — the next watchdog tick will see the same stale heartbeat
     * and try again.
     */
    private function killProcess(int $pid): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $cmd = sprintf('taskkill /F /PID %d 2>&1', $pid);
        } else {
            $cmd = sprintf('kill -9 %d 2>&1', $pid);
        }

        $output = [];
        $code   = 0;
        @exec($cmd, $output, $code);

        if ($code !== 0) {
            $this->warn("Kill returned code {$code}: " . implode("\n", $output));
        } else {
            $this->info("Killed PID {$pid}");
        }
    }
}
