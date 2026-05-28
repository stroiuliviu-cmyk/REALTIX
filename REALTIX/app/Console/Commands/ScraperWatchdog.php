<?php

namespace App\Console\Commands;

use App\Models\ScraperRun;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Verifies the Python scraper(s) are alive by checking their heartbeat files.
 * Three candidates are checked each tick:
 *   - scraper_heartbeat_a.txt   (parallel group A)
 *   - scraper_heartbeat_b.txt   (parallel group B)
 *   - scraper_heartbeat.txt     (legacy / non-grouped runs: morning, manual)
 *
 * A heartbeat older than STALE_AFTER_MINUTES is considered stuck; we pre-mark
 * the matching scraper_runs row, signal the PID (SIGTERM → 5 s grace → SIGKILL),
 * and increment a failure counter so repeated stuck runs eventually pause the
 * schedule.
 */
class ScraperWatchdog extends Command
{
    protected $signature = 'scraper:watchdog';
    protected $description = 'Verify scraper heartbeat(s) and kill stale processes';

    /** Heartbeat older than this is considered stuck. */
    private const STALE_AFTER_MINUTES = 15;

    public function handle(): int
    {
        $candidates = [
            ['path' => storage_path('app/scraper_heartbeat_a.txt'), 'group' => 'a'],
            ['path' => storage_path('app/scraper_heartbeat_b.txt'), 'group' => 'b'],
            ['path' => storage_path('app/scraper_heartbeat.txt'),   'group' => null],
        ];

        $found    = 0;
        $staleHit = 0;

        foreach ($candidates as $c) {
            if (! file_exists($c['path'])) {
                continue;
            }
            $found++;
            if ($this->processHeartbeat($c['path'], $c['group'])) {
                $staleHit++;
            }
        }

        if ($found === 0) {
            $this->info('No active scraper run — skipping');
            return self::SUCCESS;
        }

        if ($staleHit > 0) {
            $failures = (int) Cache::get('scraper_recent_failures', 0);
            Cache::put('scraper_recent_failures', $failures + $staleHit, now()->addHour());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * Parse one heartbeat file, decide if it's stale, and kill the PID if so.
     * Returns true when a stale heartbeat was acted upon (caller uses this to
     * tally failures).
     */
    private function processHeartbeat(string $path, ?string $group): bool
    {
        $contents = trim((string) @file_get_contents($path));
        if ($contents === '') {
            $this->warn('Empty heartbeat file — removing');
            @unlink($path);
            return false;
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
            @unlink($path);
            // Treat unparseable as a stale-equivalent so the failures counter
            // moves and the scheduler can react.
            return true;
        }

        try {
            $heartbeatAt = Carbon::parse($timestamp);
        } catch (\Throwable $e) {
            $this->warn("Unparseable heartbeat timestamp '{$timestamp}' — removing");
            @unlink($path);
            return true;
        }

        $ageMin = (int) $heartbeatAt->diffInMinutes(now());
        $label  = $group ? " [group {$group}]" : '';

        if ($ageMin <= self::STALE_AFTER_MINUTES) {
            $this->info("Heartbeat OK ({$ageMin} min old, PID {$pid}){$label}");
            return false;
        }

        $this->error("Stale heartbeat ({$ageMin} min old) — killing PID {$pid}{$label}");

        if ($pid && is_numeric($pid)) {
            $this->killProcess((int) $pid);
        }

        @unlink($path);
        return true;
    }

    /**
     * Pre-mark the matching scraper_runs row as 'killed' *before* signalling
     * the process. If we end up sending SIGKILL, Python's atexit handler
     * never runs and the row would otherwise stay stuck on 'running' forever.
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
