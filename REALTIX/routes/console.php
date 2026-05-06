<?php

use App\Jobs\Sync999AdvertsJob;
use App\Models\Agency;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

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
Artisan::command('portal:999:scrape {--pages=2 : Pages per category, or "all"} {--max-ads= : Hard cap} {--category= : Single category slug} {--agency=1 : Agency ID for new rows} {--skip-recent=1 : Skip ads updated within N hours} {--today-only : Stop when ads older than today} {--download-images : Download images locally} {--fast : Fast bulk mode}', function () {
    $script = base_path('python_scraper/scraper_999.py');
    if (! file_exists($script)) {
        $this->error("Script not found at {$script}");
        return self::FAILURE;
    }

    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=' . $this->option('pages'),
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=' . $this->option('skip-recent'),
    ];
    if ($max = $this->option('max-ads'))      $args[] = '--max-ads=' . $max;
    if ($cat = $this->option('category'))     $args[] = '--category=' . $cat;
    if ($this->option('today-only'))          $args[] = '--today-only';
    if ($this->option('download-images'))     $args[] = '--download-images';
    if ($this->option('fast'))                $args[] = '--fast';

    $cmd = $python . ' ' . escapeshellarg($script) . ' ' . implode(' ', $args);
    $this->info("Running: {$cmd}");
    $this->newLine();

    $process = \Symfony\Component\Process\Process::fromShellCommandline($cmd);
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
    $cmd = sprintf(
        '%s %s --pages=all --agency=%d --skip-recent-hours=0',
        $python,
        escapeshellarg($script),
        $this->option('agency'),
    );

    $process = \Symfony\Component\Process\Process::fromShellCommandline($cmd);
    $process->setTimeout(0); // no timeout for full bulk
    $process->run(function ($type, $buffer) {
        echo $buffer;
    });

    return $process->getExitCode() === 0 ? self::SUCCESS : self::FAILURE;
})->purpose('FULL initial bulk — scrape ALL real-estate ads until end of results (1-3 hours)');

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

// Public 999.md TODAY-ONLY incremental scraping every 30 minutes.
// Walks page 1 of each category, stops as soon as 5 ads in a row are older than 00:00 today.
// Downloads all images locally to storage/app/public/scraped/{id}/ and skips ads updated <1h.
Schedule::command('portal:999:scrape --pages=2 --skip-recent=1 --today-only --download-images')
    ->cron('*/30 * * * *')
    ->name('999md-today-scrape')
    ->withoutOverlapping(40)
    ->runInBackground();

// AI valuation refresh — 5 min after scrape (cron offset)
Schedule::command('ai:valuate-scraped')
    ->cron('5,35 * * * *')
    ->name('ai-valuation')
    ->withoutOverlapping();

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
        ->selectRaw('GROUP_CONCAT(price * 1.0 / area) as ppms')
        ->whereNotNull('price')->where('price', '>', 0)
        ->whereNotNull('area')->where('area', '>', 0)
        ->groupBy('type', 'transaction_type', 'city')
        ->get();

    $medians = [];
    foreach ($rows as $row) {
        $values = array_map('floatval', explode(',', $row->ppms));
        if (count($values) < 3) continue;  // need at least 3 to be reliable
        sort($values);
        $key = "{$row->type}|{$row->transaction_type}|{$row->city}";
        $mid = (int) (count($values) / 2);
        $medians[$key] = count($values) % 2 === 0
            ? ($values[$mid - 1] + $values[$mid]) / 2
            : $values[$mid];
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
