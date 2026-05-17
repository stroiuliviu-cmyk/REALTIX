# Forge Daemons pentru REALTIX

## Queue Worker

Configurează în Forge UI: Site → Daemons → Add

Command: `php8.3 /home/forge/realtix.md/artisan queue:work --sleep=3 --tries=3 --max-time=3600 --timeout=300`
User: `forge`
Directory: `/home/forge/realtix.md`
Processes: 2

## Scheduler

Forge UI: Site → Scheduler → Enable
(Va adăuga automat cron: `* * * * * cd /home/forge/realtix.md && php artisan schedule:run >> /dev/null 2>&1`)

## Optional: Sentry alerts pentru failed jobs

În `routes/console.php` adaugă:

```php
Schedule::call(function () {
    $failedCount = DB::table('failed_jobs')->count();
    if ($failedCount > 5) {
        \Sentry\captureMessage("REALTIX: {$failedCount} failed jobs in queue", \Sentry\Severity::warning());
    }
})->everyTenMinutes()->name('failed-jobs-alert');
```
