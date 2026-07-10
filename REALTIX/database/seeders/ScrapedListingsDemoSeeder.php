<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ~3000 external (scraped) listings that mimic the real 999.md / imobiliare.md /
 * piata.md structure, with varied distributions and intentionally dirty geo.
 *
 * Also populates the PRIVATE columns (`phone`, `raw_data` with phone + seller
 * name) so PublicCatalog tests can prove these never surface in the public DTO.
 *
 * Local/dev only. Idempotent: scoped-deletes prior demo rows before inserting.
 */
class ScrapedListingsDemoSeeder extends Seeder
{
    use DemoData;

    private const TARGET = 3000;
    private const BATCH = 500;

    public function run(): void
    {
        $this->guardEnvironment();
        mt_srand(20260709);

        $agencies  = $this->ensureDemoAgencies();
        $agencyIds = array_column($agencies, 'id');

        $deleted = $this->purgeDemoScoped('scraped_listings');
        if ($deleted > 0) {
            $this->command?->info("  ↺ purged {$deleted} existing demo scraped_listings");
        }

        $now      = now();
        $rows     = [];
        $inserted = 0;

        for ($n = 1; $n <= self::TARGET; $n++) {
            $rows[] = $this->makeRow($n, $agencyIds, $now);

            if (count($rows) >= self::BATCH) {
                DB::table('scraped_listings')->insert($rows);
                $inserted += count($rows);
                $rows = [];
            }
        }
        if ($rows !== []) {
            DB::table('scraped_listings')->insert($rows);
            $inserted += count($rows);
        }

        $this->command?->info(
            "  ✓ scraped_listings: inserted {$inserted} demo rows across " . count($agencyIds) . ' agencies'
        );
    }

    /** @param list<int> $agencyIds */
    private function makeRow(int $n, array $agencyIds, \Illuminate\Support\Carbon $now): array
    {
        $source = $this->weighted(['999md' => 55, 'imobiliare_md' => 30, 'piata' => 15]);
        $type = $this->weighted([
            'apartment' => 55, 'house' => 14, 'villa' => 4, 'cottage' => 2,
            'land' => 8, 'garage' => 5, 'commercial' => 8, 'office' => 4,
        ]);
        // sale/rent dominate; a few exchange/buy exist so the query's exclusion
        // (EXCLUDED_DEALS) is testable. new_build/inchiriere_zilnica exercise the
        // dealType + rentPeriod mapping branches.
        $transaction = $this->weighted([
            'sale' => 58, 'rent' => 28, 'new_build' => 5,
            'inchiriere_zilnica' => 3, 'exchange' => 4, 'buy' => 2,
        ]);
        $currency  = $this->weighted(['EUR' => 68, 'MDL' => 22, 'USD' => 10]);
        $ownerType = $this->weighted(['owner' => 45, 'agency' => 55]);

        [$city, $district, $raion] = $this->dirtyLocation();
        $m = $this->metrics($type, $transaction, $currency);

        $externalId = 'demo-' . $n;
        $phone      = $this->chance(90) ? $this->phone() : null;
        $sellerName = $ownerType === 'agency' ? $this->agencyName() : $this->personName();

        // ~12% have no published_at → must never appear in public results.
        $published = $this->chance(88)
            ? (clone $now)->subMinutes(mt_rand(0, 60 * 24 * 120))
            : null;

        return [
            'agency_id'        => $agencyIds[array_rand($agencyIds)],
            'source'           => $source,
            'external_id'      => $externalId,
            'external_url'     => $this->externalUrl($source, $externalId),
            'title'            => $this->title($type, $transaction, $m['rooms'], $m['area']),
            'price'            => $m['price'],
            'price_per_m2'     => $m['price_per_m2'],
            'currency'         => $currency,
            'area'             => $m['area'],
            'rooms'            => $m['rooms'],
            'floor'            => $m['floor'],
            'floors_total'     => $m['floors_total'],
            'type'             => $type,
            'transaction_type' => $transaction,
            'owner_type'       => $ownerType,
            'subtype'          => null,
            'city'             => $city,
            'district'         => $district,
            'raion'            => $raion,
            'address'          => $this->chance(40) ? ('str. ' . $this->streetName() . ' ' . mt_rand(1, 120)) : null,
            'year_built'       => $m['year_built'],
            'condition'        => $m['condition'],
            'building_type'    => $m['building_type'],
            'heating'          => $m['heating'],
            'furnished'        => $m['furnished'],
            'parking'          => $m['parking'],
            'balcony'          => $m['balcony'],
            'elevator'         => $m['elevator'],
            'images'           => json_encode($this->images($externalId)),
            'ai_valuation'     => $this->chance(40) ? $this->oneOf(['cheap', 'average', 'expensive']) : null,
            'description'      => $this->description($type, $city),

            // --- PRIVATE columns: must be stripped by the public DTO ---
            'phone'            => $phone,
            'raw_data'         => json_encode($this->rawData($externalId, $phone, $sellerName, $type)),

            'published_at'     => $published,
            'matched_at'       => null,
            'created_at'       => $published ?? (clone $now)->subDays(mt_rand(0, 200)),
            'updated_at'       => $now,
        ];
    }

    private function externalUrl(string $source, string $externalId): string
    {
        return match ($source) {
            'imobiliare_md' => 'https://imobiliare.md/anunt/' . $externalId,
            'piata'         => 'https://piata.md/ro/' . $externalId,
            default         => 'https://999.md/ro/' . $externalId,
        };
    }

    /** @return list<string> */
    private function images(string $seed): array
    {
        if ($this->chance(10)) {
            return [];
        }
        $out = [];
        $count = mt_rand(1, 8);
        for ($i = 1; $i <= $count; $i++) {
            $out[] = "https://picsum.photos/seed/{$seed}-{$i}/800/600";
        }

        return $out;
    }

    private function description(string $type, string $city): string
    {
        return $this->oneOf([
            'Obiect demo generat pentru testarea catalogului public.',
            'Stare bună, disponibil imediat. Date fictive pentru mediul local.',
            'Ofertă de test — nu reprezintă un anunț real.',
        ]) . " ({$type}, {$city})";
    }

    private function phone(): string
    {
        $prefix = $this->oneOf(['60', '61', '62', '67', '68', '69', '76', '78', '79']);

        return '+373 ' . $prefix . str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function personName(): string
    {
        $first = $this->oneOf(['Ion', 'Andrei', 'Vasile', 'Mihai', 'Elena', 'Maria', 'Victor', 'Natalia', 'Sergiu', 'Dumitru', 'Cristina', 'Oleg']);
        $last  = $this->oneOf(['Popescu', 'Rusu', 'Ciobanu', 'Munteanu', 'Ungureanu', 'Cebotari', 'Guțu', 'Lungu', 'Moraru', 'Balan']);

        return "{$first} {$last}";
    }

    private function agencyName(): string
    {
        return $this->oneOf(['Imobil Grup', 'Casa Ta', 'Prime Estate', 'Nord Imobil', 'Green Estate', 'Real Invest', 'Domus Imobil']);
    }

    /** @return array<string,mixed> */
    private function rawData(string $externalId, ?string $phone, string $sellerName, string $type): array
    {
        return [
            'source_id'    => $externalId,
            'seller_name'  => $sellerName,   // PRIVATE
            'phone'        => $phone,         // PRIVATE
            'contact'      => [               // PRIVATE (nested)
                'name'  => $sellerName,
                'phone' => $phone,
            ],
            'scraped_type' => $type,
            'note'         => 'demo raw payload — must be stripped by the public DTO',
        ];
    }
}
