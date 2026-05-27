<?php

namespace App\Console\Commands;

use App\Models\ScrapedListing;
use Illuminate\Console\Command;

/**
 * Re-derive subtype + extra_flags for existing listings from their title /
 * rooms / description. Source-of-truth for the derivation logic is mirrored
 * EXACTLY by Python derive_subtype_and_flags() in scraper_999.py — keep both
 * in sync when adding keywords.
 */
class ReclassifySubtypes extends Command
{
    protected $signature = 'scraper:reclassify-subtypes
                            {--dry-run : Show what would change without writing}
                            {--type= : Only reclassify one type (apartment, land, garage, commercial)}
                            {--limit=0 : Stop after N rows (0=all)}';

    protected $description = 'Re-derive subtype + extra_flags from title/rooms/description for existing listings';

    public function handle(): int
    {
        $query = ScrapedListing::query()->where('source', '999md');

        if ($type = $this->option('type')) {
            $query->where('type', $type);
        }

        $isDryRun = (bool) $this->option('dry-run');
        $limit    = (int) $this->option('limit');
        $stopAfter = $limit > 0 ? $limit : PHP_INT_MAX;

        $stats = ['processed' => 0, 'changed' => 0, 'unchanged' => 0];

        $query->chunk(500, function ($listings) use (&$stats, $isDryRun, $stopAfter) {
            foreach ($listings as $listing) {
                if ($stats['processed'] >= $stopAfter) {
                    return false;
                }
                $stats['processed']++;

                // Prefer the direct description column (already in fillable);
                // fall back to raw_data.description for old rows scraped before
                // the column existed.
                $description = $listing->description ?? data_get($listing->raw_data, 'description', '') ?? '';

                [$newSubtype, $newFlags] = $this->deriveSubtypeAndFlags(
                    (string) $listing->type,
                    $listing->rooms,
                    (string) ($listing->title ?? ''),
                    (string) $description,
                );

                $oldSubtype = $listing->subtype;
                $oldFlags   = $listing->extra_flags ?? [];
                $newFlagsCmp = $newFlags ?: [];

                if ($oldSubtype === $newSubtype && $oldFlags == $newFlagsCmp) {
                    $stats['unchanged']++;
                    continue;
                }

                $stats['changed']++;

                if ($isDryRun) {
                    $this->line("  #{$listing->id} [{$listing->type}] '{$oldSubtype}' → '{$newSubtype}'");
                } else {
                    $listing->subtype     = $newSubtype;
                    $listing->extra_flags = $newFlags ?: null;
                    $listing->save();
                }
            }
        });

        $this->newLine();
        $this->info("Processed: {$stats['processed']}");
        $this->info("Changed:   {$stats['changed']}");
        $this->info("Unchanged: {$stats['unchanged']}");

        if ($isDryRun) {
            $this->warn('DRY RUN — no changes saved.');
        }

        return self::SUCCESS;
    }

    /**
     * MUST stay in sync with Python derive_subtype_and_flags() in
     * python_scraper/scraper_999.py. Any keyword change here needs a
     * mirror edit there and vice versa.
     */
    private function deriveSubtypeAndFlags(string $type, $rooms, string $title, string $description): array
    {
        $titleLower = mb_strtolower($title);
        $descLower  = mb_strtolower($description);
        $combined   = $titleLower . ' ' . $descLower;
        $extraFlags = [];
        $subtype    = null;

        if ($type === 'apartment') {
            if ($rooms !== null) {
                $r = (int) $rooms;
                if      ($r === 1) $subtype = '1_camera';
                elseif  ($r === 2) $subtype = '2_camere';
                elseif  ($r === 3) $subtype = '3_camere';
                elseif  ($r >= 4)  $subtype = '4plus';
            }

            $newBuildKeywords = [
                'bloc nou', 'bloc-nou', 'новостройка',
                'complex rezidential', 'complex residential',
                'imobil nou', 'construcție nouă', 'construcția nouă',
                'construcție 202', 'construcția 202',
            ];
            foreach ($newBuildKeywords as $kw) {
                if (str_contains($combined, $kw)) {
                    $extraFlags['new_build'] = true;
                    break;
                }
            }
        } elseif ($type === 'land') {
            if (str_contains($titleLower, 'agricol') || str_contains($titleLower, 'agrigol')
                || str_contains($titleLower, 'сельскохозяйств')) {
                $subtype = 'agricol';
            } elseif (str_contains($titleLower, 'lângă lac') || str_contains($titleLower, 'iaz')
                || str_contains($titleLower, ' lac') || str_contains($titleLower, 'озер')) {
                $subtype = 'lac';
            } elseif (str_contains($titleLower, 'construcți') || str_contains($titleLower, 'constructi')
                || str_contains($titleLower, 'под строительство')) {
                $subtype = 'constructii';
            } else {
                $subtype = 'constructii';
            }
        } elseif ($type === 'garage') {
            if (str_contains($titleLower, 'subteran') || str_contains($titleLower, 'подземн')) {
                $subtype = 'subterana';
            } elseif (str_contains($titleLower, 'parcare') || str_contains($titleLower, 'parking')
                || str_contains($titleLower, 'паркинг')) {
                $subtype = 'loc_parcare';
            } else {
                $subtype = 'garaj';
            }
        } elseif ($type === 'commercial') {
            if (str_contains($titleLower, 'depozit') || str_contains($titleLower, 'склад')
                || str_contains($titleLower, 'warehouse')) {
                $subtype = 'depozit';
            } elseif (str_contains($titleLower, 'industrial') || str_contains($titleLower, 'производств')) {
                $subtype = 'industrial';
            } elseif (str_contains($titleLower, 'birou') || str_contains($titleLower, 'офис')
                || str_contains($titleLower, 'office') || str_contains($titleLower, 'oficiu')) {
                $subtype = 'birou';
            } else {
                $subtype = 'comercial';
            }
        }

        return [$subtype, $extraFlags];
    }
}
