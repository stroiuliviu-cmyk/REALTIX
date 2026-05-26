<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ScrapedListing;

class ReclassifyMisclassifiedListings extends Command
{
    protected $signature = 'scraped:reclassify {--dry-run : Show changes without applying}';
    protected $description = 'Reclassify scraped_listings whose type contradicts their title or source category';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $this->info($dryRun ? 'DRY RUN — no changes will be made' : 'APPLYING changes');

        $totalChanged = 0;
        $totalChanged += $this->phaseGaragesMiscategorized($dryRun);
        $totalChanged += $this->phaseHouseToCottage($dryRun);
        $totalChanged += $this->phaseCommercialToGarage($dryRun);

        $this->newLine();
        $this->info("=== TOTAL: " . ($dryRun ? 'would change ' : 'changed ') . $totalChanged . ' rows across 3 phases ===');

        return self::SUCCESS;
    }

    /**
     * PHASE 1 (original): listings posted in garages-and-parking category but with
     * a title that starts with "Apartament" or "Teren" (users miscategorize for
     * visibility). Reassigns those to apartment/land.
     */
    private function phaseGaragesMiscategorized(bool $dryRun): int
    {
        $this->newLine();
        $this->info('── PHASE 1: garages-and-parking → apartment/land (by title prefix) ──');

        $candidates = ScrapedListing::query()
            ->where('source', '999md')
            ->whereRaw("raw_data->>'category_slug' = ?", ['garages-and-parking'])
            ->get();

        $this->info("  Inspecting {$candidates->count()} listings from garages-and-parking");

        return $this->applyRule(
            $candidates,
            function ($l) {
                $titleLower = mb_strtolower(trim((string) $l->title));
                if (preg_match('/^apartament/iu', $titleLower)) return 'apartment';
                if (preg_match('/^teren/iu', $titleLower))      return 'land';
                return null;
            },
            $dryRun,
        );
    }

    /**
     * PHASE 2 (new): house listings whose title contains vilă/cabană →
     * reassign to 'cottage' (separate 999.md subcategory 6678).
     */
    private function phaseHouseToCottage(bool $dryRun): int
    {
        $this->newLine();
        $this->info('── PHASE 2: house → cottage (by title vilă/cabană) ──');

        $candidates = ScrapedListing::query()
            ->where('source', '999md')
            ->where('type', 'house')
            ->where(function ($q) {
                $q->whereRaw('LOWER(title) LIKE ?', ['%vila%'])
                  ->orWhereRaw('LOWER(title) LIKE ?', ['%vilă%'])
                  ->orWhereRaw('LOWER(title) LIKE ?', ['%cabana%'])
                  ->orWhereRaw('LOWER(title) LIKE ?', ['%cabană%']);
            })
            ->get();

        $this->info("  Inspecting {$candidates->count()} house listings with vilă/cabană in title");

        return $this->applyRule(
            $candidates,
            fn () => 'cottage',
            $dryRun,
        );
    }

    /**
     * PHASE 3 (new): commercial listings that were scraped from the
     * garages-and-parking category — they should be type='garage' now that
     * we have a dedicated 999.md subcategory mapping (1408).
     */
    private function phaseCommercialToGarage(bool $dryRun): int
    {
        $this->newLine();
        $this->info('── PHASE 3: commercial → garage (by raw_data category) ──');

        $candidates = ScrapedListing::query()
            ->where('source', '999md')
            ->where('type', 'commercial')
            ->whereRaw("raw_data->>'category_slug' = ?", ['garages-and-parking'])
            ->get();

        $this->info("  Inspecting {$candidates->count()} commercial listings from garages-and-parking");

        return $this->applyRule(
            $candidates,
            fn () => 'garage',
            $dryRun,
        );
    }

    /**
     * Apply a reclassification rule to a collection of listings.
     * $rule(listing) → new type or null to skip.
     */
    private function applyRule($candidates, callable $rule, bool $dryRun): int
    {
        $changed = 0;
        $skipped = 0;
        $details = [];

        foreach ($candidates as $l) {
            $oldType = $l->type;
            $newType = $rule($l);

            if (! $newType || $newType === $oldType) {
                $skipped++;
                continue;
            }

            $details[] = [
                'id'       => $l->id,
                'old_type' => $oldType,
                'new_type' => $newType,
                'title'    => mb_substr((string) $l->title, 0, 60),
            ];

            if (! $dryRun) {
                $l->type = $newType;
                $l->save();
            }
            $changed++;
        }

        $this->info("  Skipped (already correct / no match): {$skipped}");
        $this->info("  " . ($dryRun ? 'Would change: ' : 'Changed: ') . $changed);

        if (! empty($details)) {
            $this->table(
                ['ID', 'Old Type', 'New Type', 'Title'],
                array_map(fn ($d) => [$d['id'], $d['old_type'], $d['new_type'], $d['title']], $details),
            );
        }

        return $changed;
    }
}
