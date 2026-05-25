<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ScrapedListing;

class ReclassifyMisclassifiedListings extends Command
{
    protected $signature = 'scraped:reclassify {--dry-run : Show changes without applying}';
    protected $description = 'Reclassify listings posted to wrong 999.md category (garages-and-parking)';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $this->info($dryRun ? 'DRY RUN — no changes will be made' : 'APPLYING changes');

        // Only fix listings from garages-and-parking that obviously aren't garages
        // (users post apartments/lands there for extra visibility)
        $candidates = ScrapedListing::query()
            ->where('source', '999md')
            ->where(function ($q) {
                $q->whereRaw("raw_data->>'category_slug' = ?", ['garages-and-parking']);
            })
            ->get();

        $this->info("Found {$candidates->count()} listings from garages-and-parking category");

        $changed = 0;
        $skipped = 0;
        $details = [];

        foreach ($candidates as $l) {
            $title  = trim((string) $l->title);
            $titleLower = mb_strtolower($title);
            $oldType = $l->type;
            $newType = null;

            // Match by prefix only (first word)
            if (preg_match('/^apartament/iu', $titleLower)) {
                $newType = 'apartment';
            } elseif (preg_match('/^teren/iu', $titleLower)) {
                $newType = 'land';
            }
            // Anything else (garaj, parcare, auto, etc.) stays as commercial

            if (! $newType || $newType === $oldType) {
                $skipped++;
                continue;
            }

            $details[] = [
                'id'       => $l->id,
                'old_type' => $oldType,
                'new_type' => $newType,
                'title'    => mb_substr($title, 0, 60),
            ];

            if (! $dryRun) {
                $l->type = $newType;
                $l->save();
            }
            $changed++;
        }

        $this->newLine();
        $this->info("Skipped (no rule match or already correct): {$skipped}");
        $this->info(($dryRun ? "Would change: " : "Changed: ") . $changed);

        if (! empty($details)) {
            $this->newLine();
            $this->table(['ID', 'Old Type', 'New Type', 'Title'],
                array_map(fn($d) => [$d['id'], $d['old_type'], $d['new_type'], $d['title']], $details)
            );
        }

        return self::SUCCESS;
    }
}
