<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ~200 internal agency listings (properties), distributed across the demo
 * agencies, with a mix of active/inactive status and a few exchange/buy deals
 * so the public catalog's status + transaction_type exclusions are testable.
 *
 * `meta` carries a private note to prove internal JSON never reaches the DTO.
 * Local/dev only. Idempotent: scoped-deletes prior demo rows before inserting.
 */
class PropertiesDemoSeeder extends Seeder
{
    use DemoData;

    private const TARGET = 200;

    public function run(): void
    {
        $this->guardEnvironment();
        mt_srand(424242);

        $agencies = $this->ensureDemoAgencies();

        $deleted = $this->purgeDemoScoped('properties');
        if ($deleted > 0) {
            $this->command?->info("  ↺ purged {$deleted} existing demo properties");
        }

        $now  = now();
        $rows = [];
        for ($n = 1; $n <= self::TARGET; $n++) {
            $rows[] = $this->makeRow($agencies[array_rand($agencies)], $now);
        }
        DB::table('properties')->insert($rows);

        $this->command?->info(
            '  ✓ properties: inserted ' . count($rows) . ' demo rows (active/inactive) across ' . count($agencies) . ' agencies'
        );
    }

    /** @param array{id:int,user_id:int,name:string,slug:string} $agency */
    private function makeRow(array $agency, \Illuminate\Support\Carbon $now): array
    {
        $type = $this->weighted([
            'apartment' => 55, 'house' => 15, 'villa' => 5, 'cottage' => 2,
            'land' => 7, 'garage' => 4, 'commercial' => 8, 'office' => 4,
        ]);
        $transaction = $this->weighted(['sale' => 60, 'rent' => 30, 'exchange' => 6, 'buy' => 4]);
        $currency    = $this->weighted(['EUR' => 70, 'MDL' => 20, 'USD' => 10]);
        $status      = $this->weighted(['active' => 70, 'inactive' => 30]);

        [$city, $district, $raion] = $this->dirtyLocation();
        $m = $this->metrics($type, $transaction, $currency);

        return [
            'agency_id'          => $agency['id'],
            'user_id'            => $agency['user_id'],
            'source'             => 'manual',
            'scraped_listing_id' => null,
            'title'              => $this->title($type, $transaction, $m['rooms'], $m['area']),
            'description_ro'     => 'Obiect intern demo pentru testarea catalogului. Date fictive.',
            'description_ru'     => null,
            'description_en'     => null,
            'type'               => $type,
            'subtype'            => null,
            'transaction_type'   => $transaction,
            'price'              => $m['price'],
            'currency'           => $currency,
            'area_total'         => $m['area'],
            'area_living'        => $m['area'] > 0 ? round($m['area'] * 0.75, 2) : null,
            'rooms'              => $m['rooms'],
            'floor'              => $m['floor'],
            'floors_total'       => $m['floors_total'],
            'address'            => 'str. ' . $this->streetName() . ' ' . mt_rand(1, 120),
            'city'               => $city,
            'district'           => $district,
            'raion'              => $raion,
            'latitude'           => round(46.9 + (mt_rand(-500, 500) / 10000), 7),
            'longitude'          => round(28.85 + (mt_rand(-500, 500) / 10000), 7),
            'status'             => $status,
            'ai_valuation'       => $this->chance(45) ? $this->oneOf(['cheap', 'average', 'expensive']) : null,
            'views_count'        => mt_rand(0, 2500),
            // PRIVATE: internal meta must never reach the public DTO.
            'meta'               => json_encode(['demo' => true, 'internal_note' => 'private meta — not exposed by DTO']),
            'created_at'         => (clone $now)->subDays(mt_rand(0, 180)),
            'updated_at'         => $now,
        ];
    }
}
