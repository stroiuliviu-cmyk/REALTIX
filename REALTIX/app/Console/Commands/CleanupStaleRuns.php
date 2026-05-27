<?php

namespace App\Console\Commands;

use App\Models\ScraperRun;
use Illuminate\Console\Command;

/**
 * Safety net for scraper_runs rows that never got finalized — e.g. the
 * worker was SIGKILL'd before Python's atexit could fire, or the DB
 * connection died mid-finalize. Marks any row stuck in 'running' beyond
 * --max-minutes as 'killed', provided the original PID is no longer alive.
 */
class CleanupStaleRuns extends Command
{
    protected $signature = 'scraper:cleanup-stale-runs
                            {--max-minutes=30 : Mark runs stuck in running for this long as killed}';

    protected $description = 'Mark scraper_runs rows stuck in "running" status as "killed"';

    public function handle(): int
    {
        $maxMinutes = (int) $this->option('max-minutes');
        $cutoff     = now()->subMinutes($maxMinutes);

        $stale = ScraperRun::where('status', 'running')
            ->where('started_at', '<', $cutoff)
            ->get();

        if ($stale->isEmpty()) {
            $this->info('No stale runs to cleanup.');
            return self::SUCCESS;
        }

        $marked = 0;
        foreach ($stale as $run) {
            // Don't mark a still-running process — that's a long sync, not a
            // ghost. The watchdog will deal with it via the heartbeat path
            // if it actually goes stale.
            if ($run->pid && $this->isPidAlive((int) $run->pid)) {
                $this->warn("Run #{$run->id} (PID {$run->pid}) still alive — skipping");
                continue;
            }

            $duration = $run->started_at
                ? (int) $run->started_at->diffInSeconds(now())
                : null;

            $run->update([
                'status'           => 'killed',
                'ended_at'         => now(),
                'duration_seconds' => $duration,
                'error_message'    => "Stale run cleanup — PID dead, was 'running' for {$duration}s",
            ]);

            $this->info("Marked run #{$run->id} (PID {$run->pid}) as 'killed' after {$duration}s");
            $marked++;
        }

        $this->info("Total marked: {$marked} stale runs");
        return self::SUCCESS;
    }

    private function isPidAlive(int $pid): bool
    {
        if (PHP_OS_FAMILY === 'Windows') {
            return false;
        }
        if (! function_exists('posix_kill')) {
            return false;
        }
        return @posix_kill($pid, 0);
    }
}
