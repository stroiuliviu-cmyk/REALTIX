<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ScrapedListing;

class ReclassifyMisclassifiedListings extends Command
{
    protected $signature = 'scraped:reclassify {--dry-run : Show changes without applying}';
    protected $description = 'Detect and reclassify scraped_listings where type contradicts the title';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $this->info($dryRun ? 'DRY RUN — no changes will be made' : 'APPLYING changes');

        $rules = [
            // Title regex => new type
            'apartament|apartamente|квартир|квартира'  => 'apartment',
            'teren|teren agricol|teren pentru|участок' => 'land',
            'cas[aă]|villa|вилл|дом'                   => 'house',
            'comercial|spațiu comercial|офис|магазин'  => 'commercial',
        ];

        $changed = 0;
        $skipped = 0;
        $details = [];

        $listings = ScrapedListing::where('source', '999md')->get();

        foreach ($listings as $l) {
            $title   = mb_strtolower((string) $l->title);
            $oldType = $l->type;
            $newType = null;

            // Check each rule, first match wins
            foreach ($rules as $pattern => $type) {
                if (preg_match("/({$pattern})/iu", $title)) {
                    $newType = $type;
                    break;
                }
            }

            // Skip if no match or already correct
            if (! $newType || $newType === $oldType) {
                $skipped++;
                continue;
            }

            $details[] = [
                'id'       => $l->id,
                'old_type' => $oldType,
                'new_type' => $newType,
                'title'    => mb_substr($l->title, 0, 60),
            ];

            if (! $dryRun) {
                $l->type = $newType;
                $l->save();
            }
            $changed++;
        }

        $this->info("Total listings: " . $listings->count());
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
