<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

/**
 * Verifies that the cron expressions registered in routes/console.php match
 * the strategy: morning sync at 06:00, hourly incremental 07:00-22:00,
 * watchdog every 10 min, batch matching at minute 30 between 06 and 22.
 * The 23:00-05:59 window must have no 999md scraper events scheduled.
 */
class ScraperScheduleTest extends TestCase
{
    /** @return array<Event> */
    private function events(): array
    {
        return app(Schedule::class)->events();
    }

    /** Find a scheduled event by its `->name(...)` label. */
    private function findByName(string $name): ?Event
    {
        foreach ($this->events() as $event) {
            if ($event->description === $name) {
                return $event;
            }
        }
        return null;
    }

    public function test_morning_initial_sync_runs_at_six_am_chisinau(): void
    {
        $event = $this->findByName('999md-morning-initial-sync');

        $this->assertNotNull($event, 'Morning sync schedule is missing');
        $this->assertSame('0 6 * * *', $event->expression);
        $this->assertSame('Europe/Chisinau', $event->timezone);
    }

    public function test_hourly_incremental_runs_seven_to_twentytwo(): void
    {
        $event = $this->findByName('999md-hourly-incremental');

        $this->assertNotNull($event, 'Hourly incremental schedule is missing');
        $this->assertSame('0 7-22 * * *', $event->expression);
        $this->assertSame('Europe/Chisinau', $event->timezone);
    }

    public function test_no_scraper_event_runs_between_23_and_06(): void
    {
        $nightHours = [23, 0, 1, 2, 3, 4, 5];

        // Only the public-scraper events — `999md-sync` is the Partners API
        // sync (own-ads), not the public scraper, and is unaffected by the
        // 23-06 quiet window.
        $scraperNames = [
            '999md-morning-initial-sync',
            '999md-hourly-incremental',
            'batch-matching',
        ];

        foreach ($this->events() as $event) {
            $name = (string) $event->description;
            if (! in_array($name, $scraperNames, true)) {
                continue;
            }
            foreach ($nightHours as $hour) {
                $this->assertFalse(
                    $this->cronMatchesHour($event->expression, $hour),
                    "Scraper event '{$name}' must NOT run at {$hour}:00 (got expression {$event->expression})"
                );
            }
        }
    }

    public function test_watchdog_runs_every_ten_minutes(): void
    {
        $event = $this->findByName('scraper-watchdog');

        $this->assertNotNull($event, 'Watchdog schedule is missing');
        $this->assertSame('*/10 * * * *', $event->expression);
    }

    public function test_batch_matching_runs_at_half_past_each_active_hour(): void
    {
        $event = $this->findByName('batch-matching');

        $this->assertNotNull($event, 'Batch matching schedule is missing');
        $this->assertSame('30 6-22 * * *', $event->expression);
        $this->assertSame('Europe/Chisinau', $event->timezone);
    }

    /**
     * Cheap subset of cron — only checks if the given hour is included in the
     * hour field of the expression. Enough to assert that 23/00..05 are
     * never present in any scraper event.
     */
    private function cronMatchesHour(string $expression, int $hour): bool
    {
        $parts = preg_split('/\s+/', trim($expression));
        if (count($parts) < 5) {
            return false;
        }
        $hourField = $parts[1];

        if ($hourField === '*') {
            return true;
        }

        foreach (explode(',', $hourField) as $segment) {
            // Handle "*/N"
            if (str_starts_with($segment, '*/')) {
                $step = (int) substr($segment, 2);
                if ($step > 0 && $hour % $step === 0) {
                    return true;
                }
                continue;
            }
            // Handle ranges "A-B" (optionally "A-B/N")
            if (str_contains($segment, '-')) {
                [$range, $stepPart] = array_pad(explode('/', $segment, 2), 2, null);
                [$start, $end] = array_map('intval', explode('-', $range));
                $step = $stepPart !== null ? (int) $stepPart : 1;
                for ($h = $start; $h <= $end; $h += $step) {
                    if ($h === $hour) {
                        return true;
                    }
                }
                continue;
            }
            if ((int) $segment === $hour) {
                return true;
            }
        }

        return false;
    }
}
