<?php

namespace App\Services;

/**
 * Kills orphan Python scraper processes that survived a previous timeout.
 *
 * Background: Laravel's Symfony Process::fromShellCommandline() launches
 * `sh -c "python ..."`. On timeout, the SIGTERM goes to the shell wrapper,
 * not the Python child. The Python keeps running forever while Laravel
 * thinks the job finished — leaking processes that pile up over days.
 *
 * Use this guard before every spawn to GC any older-than-N-minute scraper
 * PIDs (legitimate fresh ones spawned by parallel Schedule entries are
 * preserved by the age threshold).
 */
class ScraperProcessGuard
{
    /**
     * Kill scraper_999.py processes older than $olderThanSeconds. Returns
     * the list of [pid, age_sec, method] tuples we killed (for logging).
     *
     * When $groupFilter is given (e.g. 'a' or 'b'), we only match scrapers
     * whose argv contains "--group={filter}". This is critical for the
     * hourly_a/hourly_b parallel pair: without it, A's cron would happily
     * kill B's still-running PID at the next hour tick. The wide Firefox
     * pkill is also skipped in this mode for the same reason — we cannot
     * tell which Firefox belongs to which group.
     */
    public function killOrphans(int $olderThanSeconds = 600, ?string $groupFilter = null): array
    {
        $pids = [];
        if ($groupFilter !== null && $groupFilter !== '') {
            // Match only scrapers whose argv carries this --group flag.
            $safe = preg_replace('/[^a-z0-9_-]/i', '', $groupFilter);
            @exec("pgrep -f 'scraper_999\\.py.*--group={$safe}' 2>/dev/null", $pids);
        } else {
            @exec("pgrep -f 'scraper_999\\.py' 2>/dev/null", $pids);
        }

        $killed = [];
        foreach ($pids as $pid) {
            $pid = (int) trim($pid);
            if ($pid <= 0) {
                continue;
            }

            $age = $this->getProcessAge($pid);
            // Skip recently-spawned processes (likely our own about-to-run cron
            // or a parallel one that hasn't completed yet).
            if ($age > 0 && $age < $olderThanSeconds) {
                continue;
            }

            // SIGTERM first so Python's atexit (which finalizes the
            // scraper_runs row) gets a chance to run. We then poll up to
            // 5 seconds before falling back to SIGKILL — the prior 2 s was
            // too short and frequently left rows stuck on 'running'.
            @shell_exec("kill -TERM {$pid} 2>/dev/null");

            $waited = 0;
            $exited = false;
            while ($waited < 5) {
                if (! $this->isAlive($pid)) {
                    $exited = true;
                    break;
                }
                sleep(1);
                $waited++;
            }

            if ($exited) {
                $killed[] = ['pid' => $pid, 'age_sec' => $age, 'method' => 'SIGTERM_graceful'];
            } else {
                @shell_exec("kill -9 {$pid} 2>/dev/null");
                $killed[] = ['pid' => $pid, 'age_sec' => $age, 'method' => 'SIGKILL_after_grace'];
            }
        }

        // Wide Firefox/geckodriver reap is unsafe under parallel groups —
        // it would kill the sibling group's still-running browser. Only do
        // it for legacy / non-grouped runs, and only when we actually killed
        // a scraper PID (no kills → no cleanup needed).
        if (! empty($killed) && ($groupFilter === null || $groupFilter === '')) {
            @shell_exec("pkill -9 -f 'firefox.*--marionette' 2>/dev/null");
            @shell_exec("pkill -9 -f geckodriver 2>/dev/null");
        }

        return $killed;
    }

    /**
     * Return all currently running scraper_999.py PIDs without killing anything.
     * Used by controllers to refuse spawning a parallel run when one is already
     * in flight (e.g. the super-admin "Trigger manual sync" button).
     */
    public function getRunningPids(): array
    {
        $pids = [];
        @exec("pgrep -f 'scraper_999\\.py' 2>/dev/null", $pids);

        $out = [];
        foreach ($pids as $pid) {
            $pid = (int) trim($pid);
            if ($pid > 0) {
                $out[] = $pid;
            }
        }
        return $out;
    }

    /** Process age in seconds (etimes), or 0 if PID is gone / ps not available. */
    private function getProcessAge(int $pid): int
    {
        $output = @shell_exec("ps -o etimes= -p {$pid} 2>/dev/null");
        return $output ? (int) trim($output) : 0;
    }

    /** Cheap signal-0 probe to check if PID still exists. */
    private function isAlive(int $pid): bool
    {
        if (! function_exists('posix_kill')) {
            // posix extension missing — assume alive to force the SIGKILL path.
            return true;
        }
        return @posix_kill($pid, 0);
    }
}
