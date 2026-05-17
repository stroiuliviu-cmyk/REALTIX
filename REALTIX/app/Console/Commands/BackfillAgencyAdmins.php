<?php

namespace App\Console\Commands;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Ensures every agency has an `admin`-role user. For agencies whose owner
 * registered before the auto-assign was in place, this picks the OLDEST user
 * in the agency and grants them admin. Idempotent — agencies with at least
 * one admin are skipped.
 */
class BackfillAgencyAdmins extends Command
{
    protected $signature = 'realtix:backfill-agency-admins {--dry-run : Print what would change without writing}';
    protected $description = 'Assign admin role to the first user of any agency that has no admin yet';

    public function handle(): int
    {
        $dry      = (bool) $this->option('dry-run');
        $promoted = 0;
        $skipped  = 0;

        foreach (Agency::orderBy('id')->get() as $agency) {
            $hasAdmin = User::where('agency_id', $agency->id)->role('admin')->exists();
            if ($hasAdmin) {
                $skipped++;
                continue;
            }

            $oldest = User::where('agency_id', $agency->id)->orderBy('created_at')->first();
            if (! $oldest) {
                $this->line("· Agency #{$agency->id} ({$agency->name}): no users — skipping");
                continue;
            }

            $this->info(($dry ? '[dry-run] ' : '') . "✓ Agency #{$agency->id} ({$agency->name}) → promote user #{$oldest->id} ({$oldest->email}) to admin");
            if (! $dry) {
                $oldest->assignRole('admin');
            }
            $promoted++;
        }

        $this->newLine();
        $this->info("Done. Promoted: {$promoted}, skipped (already had admin): {$skipped}.");
        if ($dry) $this->warn('Dry-run — no changes were written.');
        return Command::SUCCESS;
    }
}
