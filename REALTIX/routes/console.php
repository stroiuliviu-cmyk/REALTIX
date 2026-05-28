<?php

use App\Jobs\BatchMatchingJob;
use App\Jobs\Sync999AdvertsJob;
use App\Models\Agency;
use App\Models\CalendarEvent;
use App\Notifications\CalendarEventReminder;
use App\Notifications\SubscriptionExpiringSoon;
use App\Notifications\TrialExpiringSoon;
use App\Services\ScraperHealthService;
use App\Services\ScraperProcessGuard;
use Illuminate\Console\Command;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;
use Symfony\Component\Process\Process;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Manual trigger: php artisan portal:999:sync
Artisan::command('portal:999:sync {agency? : Agency ID (defaults to first)}', function (?int $agency = null) {
    $agencyId = $agency ?? Agency::value('id');
    if (! $agencyId) {
        $this->error('No agency found.');
        return self::FAILURE;
    }
    Sync999AdvertsJob::dispatch((int) $agencyId);
    $this->info("Sync999AdvertsJob dispatched for agency #{$agencyId}.");
    return self::SUCCESS;
})->purpose('Sync own 999.md adverts via Partners API (only your agency adverts)');

// Public scraping (incremental): php artisan portal:999:scrape
// Default: 2 pages × 6 categories — fetches recently posted ads (~150-200 ads in 2-4 min).
// Skips ads already updated within the last hour to avoid duplicate work.
Artisan::command('portal:999:scrape {--pages=2 : Pages per category, or "all"} {--max-ads= : Hard cap} {--category= : Single category slug} {--agency=1 : Agency ID for new rows} {--skip-recent-hours=1 : Skip ads updated within N hours} {--scope-hours=0 : Only keep ads from last N hours (0=disabled)} {--mode=manual : morning|hourly|manual} {--today-only : Stop when ads older than today} {--download-images : Download images locally} {--fast : Fast bulk mode}', function () {
    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $this->error("Script not found at {$script}");
        return self::FAILURE;
    }

    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=' . $this->option('pages'),
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=' . $this->option('skip-recent-hours'),
        '--mode=' . $this->option('mode'),
    ];
    if ((int) $this->option('scope-hours') > 0) {
        $args[] = '--scope-hours=' . $this->option('scope-hours');
    }
    if ($max = $this->option('max-ads'))      $args[] = '--max-ads=' . $max;
    if ($cat = $this->option('category'))     $args[] = '--category=' . $cat;
    if ($this->option('today-only'))          $args[] = '--today-only';
    if ($this->option('download-images'))     $args[] = '--download-images';
    if ($this->option('fast'))                $args[] = '--fast';

    // GC orphan scraper PIDs from previous failed runs before we spawn.
    // Symfony Process timeout on shell-wrapped spawns leaks the Python child;
    // without this, parallel cron-runs can pile up after a few timeouts.
    $killed = app(ScraperProcessGuard::class)->killOrphans();
    if (! empty($killed)) {
        $this->warn(sprintf('Killed %d orphan scraper(s): %s', count($killed), json_encode($killed)));
    }

    // Direct process spawn (NO shell) — timeout will SIGTERM the Python directly
    // instead of just the intermediate shell wrapper.
    $command = array_merge([$python, $script], $args);
    $this->info('Running: ' . implode(' ', $command));
    $this->newLine();

    $process = new Process($command);
    $process->setTimeout(7200); // 2h hard timeout
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    return $process->getExitCode() === 0 ? self::SUCCESS : self::FAILURE;
})->purpose('INCREMENTAL scrape — recent ads only (default 2 pages, skip recent <1h)');

// Full initial bulk scraping: php artisan portal:999:scrape:full
// Runs ALL pages until end of results. Can take HOURS. Use ONCE on initial setup.
Artisan::command('portal:999:scrape:full {--agency=1}', function () {
    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $this->error("Script not found at {$script}");
        return self::FAILURE;
    }

    $this->warn('⚠ FULL bulk scrape — will iterate all pages until end of results.');
    $this->warn('⚠ This can take 1-3 hours and process thousands of ads.');
    $this->warn('⚠ For incremental updates use `portal:999:scrape` instead.');

    if (! $this->confirm('Continue?', false)) {
        return self::SUCCESS;
    }

    $python = env('PYTHON_BIN', 'python');

    $killed = app(ScraperProcessGuard::class)->killOrphans();
    if (! empty($killed)) {
        $this->warn(sprintf('Killed %d orphan scraper(s): %s', count($killed), json_encode($killed)));
    }

    $command = [
        $python, $script,
        '--pages=all',
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=0',
    ];

    $process = new Process($command);
    $process->setTimeout(0); // no timeout for full bulk
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    return $process->getExitCode() === 0 ? self::SUCCESS : self::FAILURE;
})->purpose('FULL initial bulk — scrape ALL real-estate ads until end of results (1-3 hours)');

/*
|--------------------------------------------------------------------------
| Morning initial sync (06:00 Europe/Chisinau)
|--------------------------------------------------------------------------
| Scrapes ALL listings published during the 23:00-06:00 night window.
| Multi-page, no quantity cap, ~30-75 min runtime. Slow + thorough; the
| nightly catch-up backbone.
*/
Artisan::command('portal:999:scrape:morning {--agency=1}', function () {
    $this->info('═══ Morning initial sync — ' . now()->toDateTimeString() . ' ═══');
    $this->info('Scope: all listings published in the last 7 hours');

    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $this->error("Script not found at {$script}");
        return self::FAILURE;
    }

    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=all',
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=0',
        '--scope-hours=2',
        '--download-images',
        '--mode=morning',
    ];

    $killed = app(ScraperProcessGuard::class)->killOrphans();
    if (! empty($killed)) {
        $this->warn(sprintf('Killed %d orphan scraper(s): %s', count($killed), json_encode($killed)));
    }

    $command = array_merge([$python, $script], $args);
    $this->info('Running: ' . implode(' ', $command));
    $this->newLine();

    $process = new Process($command);
    $process->setTimeout(75 * 60); // 75-minute hard timeout
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    $exit = $process->getExitCode();

    if ($exit === 0) {
        app(ScraperHealthService::class)->markSuccessfulRun();
        $this->info('Morning sync OK');
        return self::SUCCESS;
    }

    if ($exit === 42) {
        $this->warn('SCRAPER BLOCKED by 999.md — pausing schedule for 4 hours');
        Cache::put('scraper_blocked', true, now()->addHours(4));
        return self::FAILURE;
    }

    $failures = (int) Cache::get('scraper_recent_failures', 0);
    Cache::put('scraper_recent_failures', $failures + 1, now()->addHour());
    $this->error("Morning sync failed with exit code: {$exit}");
    return self::FAILURE;
})->purpose('Morning initial sync — scrape all listings from the night window (06:00)');

/*
|--------------------------------------------------------------------------
| Hourly incremental (07:00-22:00 Europe/Chisinau)
|--------------------------------------------------------------------------
| Picks only listings published in the last hour. Fast (≤ 5 min typical),
| 1 page per category with early-exit. Runs at minute 0 of every hour.
*/
Artisan::command('portal:999:scrape:hourly {--agency=1}', function () {
    $this->info('═══ Hourly incremental — ' . now()->toDateTimeString() . ' ═══');

    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $this->error("Script not found at {$script}");
        return self::FAILURE;
    }

    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=1',
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=0',
        '--scope-hours=1',
        '--download-images',
        '--mode=hourly',
    ];

    $killed = app(ScraperProcessGuard::class)->killOrphans();
    if (! empty($killed)) {
        $this->warn(sprintf('Killed %d orphan scraper(s): %s', count($killed), json_encode($killed)));
    }

    $command = array_merge([$python, $script], $args);
    $this->info('Running: ' . implode(' ', $command));
    $this->newLine();

    $process = new Process($command);
    // 1h timeout: at 6 categories × ~100 listings × ~5s = ~50 min worst case
    // for a productive hourly run (see incident 2026-05-27 17:15, run #4
    // killed by Symfony at exactly the old 900 s mark while still touching
    // listings). 1 h gives slack for the slow-detail-fetch tail.
    $process->setTimeout(3600);
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    $exit = $process->getExitCode();

    if ($exit === 0) {
        app(ScraperHealthService::class)->markSuccessfulRun();
        return self::SUCCESS;
    }

    if ($exit === 42) {
        $this->warn('SCRAPER BLOCKED by 999.md — pausing schedule for 2 hours');
        Cache::put('scraper_blocked', true, now()->addHours(2));
        return self::FAILURE;
    }

    $failures = (int) Cache::get('scraper_recent_failures', 0);
    Cache::put('scraper_recent_failures', $failures + 1, now()->addHour());
    return self::FAILURE;
})->purpose('Hourly incremental — scrape listings from the last hour (07:00-22:00)');

/*
| ─────────────────────────────────────────────────────────────────────
|  Hourly parallel pair (groups A + B) — `portal:999:scrape:hourly-{a,b}`
| ─────────────────────────────────────────────────────────────────────
|
|  Splits the 6 categories across two concurrent Python processes so a
|  single hourly tick can finish all categories before the next one fires.
|  Group A (heavier): apartment, house, commercial. Group B (lighter):
|  cottage, land, garage. Each writes to its own heartbeat file and tags
|  scraper_runs.mode as "hourly_a" / "hourly_b".
|
|  Critical: each group's killOrphans call is scoped to its own --group=
|  argv so A's startup never kills B's still-running PID at the next tick.
*/

$runHourlyGroup = function ($cmd, string $group, string $label, string $categories) {
    $cmd->info("═══ Hourly {$label} — " . now()->toDateTimeString() . ' ═══');

    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $cmd->error("Script not found at {$script}");
        return Command::FAILURE;
    }

    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=1',
        '--agency=' . $cmd->option('agency'),
        '--skip-recent-hours=0',
        '--scope-hours=1',
        '--download-images',
        '--mode=hourly',
        "--group={$group}",
        "--categories={$categories}",
    ];

    // Group-scoped orphan kill — only matches PIDs whose argv has --group={group}.
    $killed = app(ScraperProcessGuard::class)->killOrphans(600, $group);
    if (! empty($killed)) {
        $cmd->warn(sprintf('Killed %d orphan(s) group %s: %s', count($killed), strtoupper($group), json_encode($killed)));
    }

    $command = array_merge([$python, $script], $args);
    $cmd->info('Running: ' . implode(' ', $command));
    $cmd->newLine();

    $process = new Process($command);
    $process->setTimeout(3600);
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    $exit = $process->getExitCode();

    if ($exit === 0) {
        app(ScraperHealthService::class)->markSuccessfulRun();
        return Command::SUCCESS;
    }

    if ($exit === 42) {
        $cmd->warn('SCRAPER BLOCKED by 999.md — pausing schedule for 2 hours');
        Cache::put('scraper_blocked', true, now()->addHours(2));
        return Command::FAILURE;
    }

    $failures = (int) Cache::get('scraper_recent_failures', 0);
    Cache::put('scraper_recent_failures', $failures + 1, now()->addHour());
    return Command::FAILURE;
};

Artisan::command('portal:999:scrape:hourly-a {--agency=1}', function () use ($runHourlyGroup) {
    return $runHourlyGroup($this, 'a', 'A (apartment/house/commercial)',
        'apartments-and-rooms,house-and-garden,commercial-real-estate');
})->purpose('Hourly group A — apartment, house, commercial (parallel to group B)');

Artisan::command('portal:999:scrape:hourly-b {--agency=1}', function () use ($runHourlyGroup) {
    return $runHourlyGroup($this, 'b', 'B (cottage/land/garage)',
        'cottage,land,garages-and-parking');
})->purpose('Hourly group B — cottage, land, garage (parallel to group A)');

// Auto-sync every 5 hours for every agency that has a 999.md API key configured
// (or relies on the platform-wide PORTAL_999MD_API_KEY in .env).
Schedule::call(function () {
    $platformKey = config('services.portal_999md.api_key');

    Agency::query()
        ->lazy(50)
        ->each(function ($agency) use ($platformKey) {
            $hasOwnKey = ! empty($agency->settings['portal_999md_api_key'] ?? null);
            if ($hasOwnKey || $platformKey) {
                Sync999AdvertsJob::dispatch($agency->id);
            }
        });
})->cron('0 */5 * * *')->name('999md-sync')->withoutOverlapping();

// ═════════════════════════════════════════════════════════════════════
// 999.md scraping strategy (Europe/Chisinau)
// ─────────────────────────────────────────────────────────────────────
//   06:00         → INITIAL SYNC — all listings published during the
//                   23:00-06:00 night window (--pages=all, 7h scope)
//   07:00..22:00  → INCREMENTAL — listings published in the last hour
//   23:00..05:59  → PAUSE (no scraper runs at all)
// ─────────────────────────────────────────────────────────────────────
$canRunScraper = fn () => ! app(ScraperHealthService::class)->isBlocked();

Schedule::command('portal:999:scrape:morning')
    ->cron('0 6 * * *')
    ->timezone('Europe/Chisinau')
    ->when($canRunScraper)
    ->name('999md-morning-initial-sync')
    ->withoutOverlapping(75)
    ->onOneServer()
    ->runInBackground()
    ->emailOutputOnFailure(env('MAIL_FROM_ADDRESS'));

// Parallel hourly pair. Both fire at minute 0; their --group argv keeps the
// orphan-kill paths from cross-killing each other. The legacy single-process
// 'portal:999:scrape:hourly' artisan command stays available for manual use
// but its Schedule entry has been replaced by these two.
Schedule::command('portal:999:scrape:hourly-a')
    ->cron('0 7-22 * * *')
    ->timezone('Europe/Chisinau')
    ->when($canRunScraper)
    ->name('999md-hourly-a')
    ->withoutOverlapping(15)
    ->onOneServer()
    ->runInBackground();

Schedule::command('portal:999:scrape:hourly-b')
    ->cron('0 7-22 * * *')
    ->timezone('Europe/Chisinau')
    ->when($canRunScraper)
    ->name('999md-hourly-b')
    ->withoutOverlapping(15)
    ->onOneServer()
    ->runInBackground();

// Watchdog — kills stale scraper processes (heartbeat older than 15 min)
Schedule::command('scraper:watchdog')
    ->everyTenMinutes()
    ->name('scraper-watchdog');

// Stale-run cleanup — finalizes scraper_runs rows whose worker was SIGKILL'd
// or died before atexit ran. Catches anything the watchdog/orphan-kill paths
// missed, so the dashboard never shows a ghost "active run".
Schedule::command('scraper:cleanup-stale-runs')
    ->everyFifteenMinutes()
    ->name('scraper-cleanup-stale-runs');

// Batch matching — runs at 06:30, 07:30, ..., 22:30 Chisinau time.
// Picks up fresh scraped_listings (matched_at IS NULL) and dispatches
// per-user notifications for any saved searches that match.
Schedule::job(new BatchMatchingJob())
    ->cron('30 6-22 * * *')
    ->timezone('Europe/Chisinau')
    ->name('batch-matching')
    ->onOneServer();

// AI valuation refresh — 10 min after each hourly scrape.
Schedule::command('ai:valuate-scraped')
    ->cron('10 * * * *')
    ->name('ai-valuation')
    ->withoutOverlapping();

// Calendar event reminders — fires 30 min before event starts.
// Runs every 5 minutes and notifies once via the `reminder_sent_at` flag in event meta.
Schedule::call(function () {
    $now = now();
    CalendarEvent::query()
        ->whereBetween('starts_at', [$now->copy()->addMinutes(25), $now->copy()->addMinutes(35)])
        ->whereNull('reminder_sent_at')
        ->with('user')
        ->lazy(100)
        ->each(function ($event) {
            if ($event->user) {
                $event->user->notify(new CalendarEventReminder($event));
                $event->update(['reminder_sent_at' => now()]);
            }
        });
})->everyFiveMinutes()->name('calendar-reminders')->withoutOverlapping();

// Trial expiring soon — runs daily at 10:00.
// Notifies admins of agencies whose trial_ends_at falls in the next 3 days
// and that haven't yet subscribed (no Stripe customer). Deduplicated by checking
// the notifications table for the last 23 hours.
Schedule::call(function () {
    Agency::query()
        ->whereNotNull('trial_ends_at')
        ->whereBetween('trial_ends_at', [now(), now()->addDays(3)])
        ->whereNull('stripe_id')
        ->with('users')
        ->lazy(50)
        ->each(function ($agency) {
            $alreadyNotified = \DB::table('notifications')
                ->where('type', TrialExpiringSoon::class)
                ->whereJsonContains('data->agency_id', $agency->id)
                ->where('created_at', '>=', now()->subHours(23))
                ->exists();
            if ($alreadyNotified) {
                return;
            }

            $daysLeft = (int) ceil(now()->diffInHours($agency->trial_ends_at, false) / 24);
            $agency->users->each(function ($user) use ($agency, $daysLeft) {
                if ($user->isAdmin()) {
                    $user->notify(new TrialExpiringSoon($agency, max(1, $daysLeft)));
                }
            });
        });
})->dailyAt('10:00')->name('trial-expiring-warn')->withoutOverlapping();

// Subscription expiring soon — checks every morning at 09:00.
// Notifies all admins of agencies whose subscription_ends_at falls in the 7-day window.
Schedule::call(function () {
    Agency::query()
        ->whereNotNull('subscription_ends_at')
        ->whereBetween('subscription_ends_at', [now(), now()->addDays(7)])
        ->with('users')
        ->lazy(50)
        ->each(function ($agency) {
            $daysLeft = (int) ceil(now()->diffInHours($agency->subscription_ends_at, false) / 24);
            $agency->users->each(function ($user) use ($agency, $daysLeft) {
                if ($user->isAdmin()) {
                    $user->notify(new SubscriptionExpiringSoon($agency, max(1, $daysLeft)));
                }
            });
        });
})->dailyAt('09:00')->name('subscription-expiring-warn')->withoutOverlapping();

// Compute AI valuation (cheap/average/expensive) per scraped listing.
// Compares each ad's price/m² to the median of similar ads (same type, transaction_type, city).
// cheap   = >12% below median
// expensive = >12% above median
// average = within ±12% (or sample too small to decide)
Artisan::command('ai:valuate-scraped {--all : Re-valuate everything, not just new}', function () {
    $rebuild = (bool) $this->option('all');

    $base = \App\Models\ScrapedListing::query()
        ->whereNotNull('price')->where('price', '>', 0)
        ->whereNotNull('area')->where('area', '>', 0);

    if (! $rebuild) {
        $base->whereNull('ai_valuation');
    }

    // Pre-compute median price/m² for each (type, transaction_type, city) bucket
    $rows = \Illuminate\Support\Facades\DB::table('scraped_listings')
        ->select('type', 'transaction_type', 'city')
        ->selectRaw('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price * 1.0 / area) as median_ppm, COUNT(*) as sample_size')
        ->whereNotNull('price')->where('price', '>', 0)
        ->whereNotNull('area')->where('area', '>', 0)
        ->groupBy('type', 'transaction_type', 'city')
        ->havingRaw('COUNT(*) >= 3')
        ->get();

    $medians = [];
    foreach ($rows as $row) {
        $key = "{$row->type}|{$row->transaction_type}|{$row->city}";
        $medians[$key] = (float) $row->median_ppm;
    }

    $this->info('Computed medians for ' . count($medians) . ' buckets');

    $stats = ['cheap' => 0, 'average' => 0, 'expensive' => 0, 'unknown' => 0];

    $base->chunk(200, function ($listings) use ($medians, &$stats) {
        foreach ($listings as $l) {
            $key = "{$l->type}|{$l->transaction_type}|{$l->city}";
            $median = $medians[$key] ?? null;
            if (! $median) {
                $stats['unknown']++;
                continue;
            }
            $pricePerM2 = $l->price / $l->area;
            $diff = ($pricePerM2 - $median) / $median;

            $valuation = match (true) {
                $diff < -0.12 => 'cheap',
                $diff > 0.12  => 'expensive',
                default       => 'average',
            };

            $l->update(['ai_valuation' => $valuation]);
            $stats[$valuation]++;
        }
    });

    $this->newLine();
    $this->info('Valuation done:');
    foreach ($stats as $k => $v) {
        $this->line("  {$k}: {$v}");
    }

    return self::SUCCESS;
})->purpose('Compute AI price valuation for scraped listings (cheap/average/expensive)');

// Process scheduled autopost requests: when scheduled_at <= now, mark as approved
// and dispatch the publishing jobs.
Schedule::call(function () {
    \App\Models\AutoPostRequest::query()
        ->where('status', \App\Models\AutoPostRequest::STATUS_SCHEDULED)
        ->whereNotNull('scheduled_at')
        ->where('scheduled_at', '<=', now())
        ->lazy(50)
        ->each(function ($autoPost) {
            $autoPost->update(['status' => \App\Models\AutoPostRequest::STATUS_APPROVED]);

            $platforms = $autoPost->getPlatformsList();

            if (in_array('999md', $platforms, true)) {
                \App\Jobs\PublishTo999Job::dispatch($autoPost);
            }

            $other = array_diff($platforms, ['999md']);
            if (! empty($other)) {
                $results = $autoPost->platform_results ?? [];
                foreach ($other as $platform) {
                    $results[$platform] = ['status' => 'posted', 'url' => '#scheduled', 'error' => null];
                }
                $autoPost->update(['platform_results' => $results]);
            }
        });
})->everyMinute()->name('autopost-scheduler')->withoutOverlapping();
