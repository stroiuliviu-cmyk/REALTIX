<?php

namespace Database\Seeders\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Shared helpers for the Assistant catalog demo seeders.
 *
 * Design notes:
 *  - Env guard: demo data is generated ONLY in local/development.
 *  - Idempotency is scoped: we DELETE demo-owned rows (agencies with the
 *    `demo-` slug prefix) rather than TRUNCATE. On Postgres, Laravel's
 *    ->truncate() emits `TRUNCATE ... RESTART IDENTITY CASCADE`; truncating
 *    `agencies` / `properties` / `scraped_listings` would cascade-wipe the
 *    entire relational graph (users, deals, subscriptions, media, …), not
 *    just the demo dataset. Scoped delete keeps unrelated dev data intact.
 */
trait DemoData
{
    /** All demo agencies share this slug prefix — the marker for scoped cleanup. */
    protected string $demoAgencySlugPrefix = 'demo-';

    /** Fixed demo agencies (stable slugs → stable ids across re-runs). */
    protected array $demoAgencyDefs = [
        ['slug' => 'demo-imobil-grup',         'name' => 'Imobil Grup',        'plan' => 'pro'],
        ['slug' => 'demo-casa-ta',             'name' => 'Casa Ta Imobil',     'plan' => 'medium'],
        ['slug' => 'demo-prime-estate',        'name' => 'Prime Estate',       'plan' => 'medium'],
        ['slug' => 'demo-chisinau-properties', 'name' => 'Chișinău Properties','plan' => 'starter'],
        ['slug' => 'demo-nord-imobil',         'name' => 'Nord Imobil',        'plan' => 'starter'],
        ['slug' => 'demo-green-estate',        'name' => 'Green Estate',       'plan' => 'medium'],
    ];

    /** Abort unless we're on a local/development environment. */
    protected function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'development'])) {
            throw new \RuntimeException(
                'Assistant demo seeders are restricted to local/development. Current env: '
                . app()->environment() . '. Refusing to run.'
            );
        }
    }

    /**
     * Ensure demo agencies + one demo user each exist (idempotent by slug/email).
     *
     * @return list<array{id:int,user_id:int,name:string,slug:string}>
     */
    protected function ensureDemoAgencies(): array
    {
        $out = [];
        foreach ($this->demoAgencyDefs as $i => $def) {
            $agencyId = (int) (DB::table('agencies')->where('slug', $def['slug'])->value('id') ?? 0);
            if ($agencyId === 0) {
                $agencyId = (int) DB::table('agencies')->insertGetId([
                    'name'              => $def['name'],
                    'slug'              => $def['slug'],
                    'subscription_plan' => $def['plan'],
                    'settings'          => json_encode(['demo' => true]),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            $email = 'demo+agent' . ($i + 1) . '@realtix.local';
            $userId = (int) (DB::table('users')->where('email', $email)->value('id') ?? 0);
            if ($userId === 0) {
                $userId = (int) DB::table('users')->insertGetId([
                    'agency_id'         => $agencyId,
                    'name'              => 'Agent ' . $def['name'],
                    'email'             => $email,
                    'password'          => bcrypt('password'),
                    'email_verified_at' => now(),
                    'locale'            => 'ro',
                    'is_active'         => true,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            $out[] = ['id' => $agencyId, 'user_id' => $userId, 'name' => $def['name'], 'slug' => $def['slug']];
        }

        return $out;
    }

    /** Ids of every demo agency currently present. */
    protected function demoAgencyIds(): array
    {
        return DB::table('agencies')
            ->where('slug', 'like', $this->demoAgencySlugPrefix . '%')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** Scoped idempotent cleanup: delete demo-owned rows from $table. */
    protected function purgeDemoScoped(string $table): int
    {
        $ids = $this->demoAgencyIds();
        if ($ids === []) {
            return 0;
        }

        return DB::table($table)->whereIn('agency_id', $ids)->delete();
    }

    // ---- Random-generation helpers (shared by both data seeders) ----

    /**
     * Weighted pick. e.g. weighted(['sale' => 60, 'rent' => 30]) → 'sale'|'rent'.
     *
     * @param array<string,int> $weights
     */
    protected function weighted(array $weights): string
    {
        $r = mt_rand(1, array_sum($weights));
        $acc = 0;
        foreach ($weights as $key => $w) {
            $acc += $w;
            if ($r <= $acc) {
                return (string) $key;
            }
        }

        return (string) array_key_first($weights);
    }

    /** @param array<int,mixed> $values */
    protected function oneOf(array $values): mixed
    {
        return $values[array_rand($values)];
    }

    protected function chance(int $percent): bool
    {
        return mt_rand(1, 100) <= $percent;
    }

    /**
     * Intentionally "dirty" city/district/raion (mixed spellings, transliterations,
     * Cyrillic) so Geo normalization has real work to do.
     *
     * @return array{0:string,1:?string,2:?string} [city, district, raion]
     */
    protected function dirtyLocation(): array
    {
        if ($this->chance(80)) {
            $city = $this->oneOf([
                'Chișinău', 'Chisinau', 'chisinau', 'Chișinau', 'Kishinev',
                'kishinev', 'Кишинев', 'Кишинёв', 'mun. Chișinău',
            ]);
            $district = $this->oneOf([
                'Botanica', 'botanica', 'Ботаника',
                'Râșcani', 'Riscani', 'Rîșcani', 'Рышкановка',
                'Centru', 'centru', 'центр',
                'Ciocana', 'чеканы', 'Buiucani', 'буюканы',
                'Telecentru', 'телецентр', 'Poșta Veche', 'posta veche',
                'Aeroport', 'Sculeni',
            ]);

            return [$city, $district, null];
        }

        $pairs = [
            ['Bălți', 'Bălți'], ['Balti', 'Bălți'], ['Orhei', 'Orhei'],
            ['Ungheni', 'Ungheni'], ['Cahul', 'Cahul'], ['Strășeni', 'Strășeni'],
            ['Ialoveni', 'Ialoveni'],
        ];
        $p = $pairs[array_rand($pairs)];

        return [$p[0], $this->chance(40) ? $p[1] . ' centru' : null, $p[1]];
    }

    /**
     * Price/area/rooms and characteristics correlated by property type.
     *
     * @return array{rooms:?int,area:int,floor:?int,floors_total:?int,year_built:?int,condition:?string,building_type:?string,heating:?string,furnished:?bool,parking:?bool,balcony:?bool,elevator:?bool,price:float,price_per_m2:?float}
     */
    protected function metrics(string $type, string $transaction, string $currency): array
    {
        $fx = ['EUR' => 1.0, 'USD' => 1.08, 'MDL' => 19.6][$currency] ?? 1.0;

        $rooms = $floor = $floorsTotal = $yearBuilt = null;
        $condition = $buildingType = $heating = null;
        $furnished = $parking = $balcony = $elevator = null;

        switch ($type) {
            case 'apartment':
                $rooms = mt_rand(1, 4);
                $area = mt_rand(28, 130);
                $floorsTotal = mt_rand(2, 16);
                $floor = mt_rand(1, $floorsTotal);
                $eurPerM2Sale = mt_rand(700, 1400);
                break;
            case 'house':
                $rooms = mt_rand(3, 6);
                $area = mt_rand(90, 320);
                $floorsTotal = mt_rand(1, 3);
                $eurPerM2Sale = mt_rand(500, 1000);
                break;
            case 'villa':
            case 'cottage':
                $rooms = mt_rand(4, 8);
                $area = mt_rand(150, 450);
                $floorsTotal = mt_rand(2, 3);
                $eurPerM2Sale = mt_rand(600, 1200);
                break;
            case 'land':
                $area = mt_rand(300, 2500);
                $eurPerM2Sale = mt_rand(30, 200);
                break;
            case 'garage':
                $area = mt_rand(12, 35);
                $eurPerM2Sale = mt_rand(150, 400);
                break;
            case 'commercial':
                $area = mt_rand(40, 600);
                $eurPerM2Sale = mt_rand(600, 1500);
                break;
            case 'office':
            default:
                $area = mt_rand(25, 300);
                $eurPerM2Sale = mt_rand(600, 1400);
                break;
        }

        if (in_array($transaction, ['rent', 'inchiriere_zilnica'], true)) {
            if ($transaction === 'inchiriere_zilnica') {
                $priceEur = mt_rand(20, 90);                        // per day
            } elseif (in_array($type, ['commercial', 'office'], true)) {
                $priceEur = (int) round($area * mt_rand(6, 16));    // monthly
            } else {
                $priceEur = mt_rand(180, 800);                      // monthly
            }
        } else {
            $priceEur = (int) round($area * $eurPerM2Sale);
        }

        $price = round($priceEur * $fx, 2);

        if (in_array($type, ['apartment', 'house', 'villa', 'cottage'], true)) {
            $yearBuilt    = mt_rand(1960, 2025);
            $condition    = $this->oneOf(['new', 'renovated', 'needs_renovation', 'good']);
            $buildingType = $this->oneOf(['panel', 'brick', 'monolith']);
            $heating      = $this->oneOf(['central', 'autonomous', 'none']);
            $furnished    = $this->chance(50);
            $parking      = $this->chance(40);
            $balcony      = $type === 'apartment' ? $this->chance(70) : null;
            $elevator     = $type === 'apartment' ? ($floorsTotal >= 5 ? $this->chance(80) : false) : null;
        }

        $pricePerM2 = null;
        if ($area > 0 && ! in_array($type, ['land', 'garage'], true) && $this->chance(70)) {
            $pricePerM2 = round($price / $area, 2);
        }

        return [
            'rooms'        => $rooms,
            'area'         => $area,
            'floor'        => $floor,
            'floors_total' => $floorsTotal,
            'year_built'   => $yearBuilt,
            'condition'    => $condition,
            'building_type'=> $buildingType,
            'heating'      => $heating,
            'furnished'    => $furnished,
            'parking'      => $parking,
            'balcony'      => $balcony,
            'elevator'     => $elevator,
            'price'        => $price,
            'price_per_m2' => $pricePerM2,
        ];
    }

    protected function title(string $type, string $transaction, ?int $rooms, int $area): string
    {
        $base = match ($type) {
            'apartment'  => 'Apartament' . ($rooms ? " cu {$rooms} camere" : ''),
            'house'      => 'Casă individuală',
            'villa'      => 'Vilă',
            'cottage'    => 'Casă de vacanță',
            'land'       => 'Teren',
            'garage'     => 'Garaj',
            'commercial' => 'Spațiu comercial',
            'office'     => 'Oficiu',
            default      => 'Imobil',
        };

        $suffix = match ($transaction) {
            'rent'               => ' în chirie',
            'inchiriere_zilnica' => ' în chirie zilnică',
            'exchange'           => ' — schimb',
            'buy'                => ' — cumpăr',
            'new_build'          => ' în bloc nou',
            default              => ' spre vânzare',
        };

        return $base . ', ' . $area . ' m²' . $suffix;
    }

    protected function streetName(): string
    {
        return $this->oneOf([
            'Ștefan cel Mare', 'Dacia', 'Mircea cel Bătrân', 'Alba Iulia', 'Ismail',
            'Decebal', 'Traian', 'Vasile Alecsandri', 'Independenței', 'Calea Ieșilor',
        ]);
    }
}
