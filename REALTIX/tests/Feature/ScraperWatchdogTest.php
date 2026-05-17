<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ScraperWatchdogTest extends TestCase
{
    private string $heartbeatPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->heartbeatPath = storage_path('app/scraper_heartbeat.txt');
        @unlink($this->heartbeatPath);
        Cache::forget('scraper_recent_failures');
    }

    protected function tearDown(): void
    {
        @unlink($this->heartbeatPath);
        parent::tearDown();
    }

    public function test_watchdog_is_a_noop_when_heartbeat_file_is_missing(): void
    {
        $this->assertFalse(file_exists($this->heartbeatPath));

        $this->artisan('scraper:watchdog')
            ->expectsOutputToContain('No active scraper run')
            ->assertExitCode(0);

        $this->assertSame(0, (int) Cache::get('scraper_recent_failures', 0));
    }

    public function test_watchdog_passes_when_heartbeat_is_fresh(): void
    {
        $this->writeHeartbeat(now()->subMinutes(2), pid: 99999);

        $this->artisan('scraper:watchdog')
            ->expectsOutputToContain('Heartbeat OK')
            ->assertExitCode(0);

        $this->assertTrue(file_exists($this->heartbeatPath), 'Fresh heartbeat must be kept');
        $this->assertSame(0, (int) Cache::get('scraper_recent_failures', 0));
    }

    public function test_watchdog_kills_and_clears_when_heartbeat_is_stale(): void
    {
        // Use a PID that definitely doesn't exist so the kill call is harmless.
        $this->writeHeartbeat(now()->subMinutes(30), pid: 999999);

        $this->artisan('scraper:watchdog')
            ->expectsOutputToContain('Stale heartbeat')
            ->assertExitCode(1);

        $this->assertFalse(file_exists($this->heartbeatPath), 'Stale heartbeat file must be removed');
        $this->assertSame(1, (int) Cache::get('scraper_recent_failures', 0));
    }

    public function test_watchdog_handles_corrupt_heartbeat_gracefully(): void
    {
        @mkdir(dirname($this->heartbeatPath), 0775, true);
        file_put_contents($this->heartbeatPath, 'not a valid heartbeat at all');

        $this->artisan('scraper:watchdog')->assertExitCode(1);
        $this->assertFalse(file_exists($this->heartbeatPath));
    }

    private function writeHeartbeat(\DateTimeInterface $when, int $pid): void
    {
        @mkdir(dirname($this->heartbeatPath), 0775, true);
        file_put_contents(
            $this->heartbeatPath,
            $when->format(\DateTime::ATOM) . '|' . $pid,
        );
    }
}
