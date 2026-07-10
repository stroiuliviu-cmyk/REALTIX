<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Group seeder for the Assistant / PublicCatalog local test dataset.
 *
 *   php artisan db:seed --class=AssistantDemoSeeder
 *
 * Creates a fixed set of demo agencies + users, then ~3000 external scraped
 * listings and ~200 internal properties across them. Local/dev only and
 * idempotent — safe to re-run; it replaces its own demo data without touching
 * anything else in the database.
 */
class AssistantDemoSeeder extends Seeder
{
    use DemoData;

    public function run(): void
    {
        $this->guardEnvironment();

        $out = $this->command?->getOutput();
        $out?->writeln('<info>AssistantDemoSeeder</info> — local catalog test data (env: ' . app()->environment() . ')');

        // Shared demo agencies + users first, so both sub-seeders fan out over
        // the same set (idempotent by slug/email).
        $agencies = $this->ensureDemoAgencies();
        $this->command?->info('  ✓ agencies: ' . count($agencies) . ' demo agencies + users ready');

        $this->call([
            ScrapedListingsDemoSeeder::class,
            PropertiesDemoSeeder::class,
        ]);

        $this->report();
    }

    /** Print the demo row counts per table. */
    private function report(): void
    {
        $ids = $this->demoAgencyIds();

        $rows = [
            ['agencies',         count($ids)],
            ['users (demo)',     DB::table('users')->where('email', 'like', 'demo+%')->count()],
            ['scraped_listings', DB::table('scraped_listings')->whereIn('agency_id', $ids)->count()],
            ['properties',       DB::table('properties')->whereIn('agency_id', $ids)->count()],
        ];

        $out = $this->command?->getOutput();
        $out?->writeln('');
        $out?->writeln('<info>Demo data summary (demo-scoped rows)</info>');
        $this->command?->table(['table', 'rows'], $rows);
    }
}
