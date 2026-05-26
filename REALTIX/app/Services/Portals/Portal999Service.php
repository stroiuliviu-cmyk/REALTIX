<?php

namespace App\Services\Portals;

use App\Models\Agency;
use App\Models\Property;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Portal999Service
{
    const BASE_URL = 'https://partners-api.999.md';

    // Feature IDs (confirmed via /categories/270/features endpoint)
    const F_PRICE        = 2;
    const F_AUTHOR       = 795;
    const F_ROOMS        = 241;
    const F_AREA         = 244;
    const F_FUND         = 852;
    const F_FLOOR        = 248;
    const F_FLOORS_TOTAL = 249;
    const F_REGION       = 7;
    const F_LOCALITY     = 8;
    const F_SECTOR       = 9;
    const F_STREET       = 10;
    const F_BUILDING     = 11;
    const F_DESCRIPTION  = 13;
    const F_IMAGES       = 14;
    const F_CONTACTS     = 16;

    const CATEGORY_IMOBILIARE = 270;

    const TYPE_TO_SUBCATEGORY = [
        'apartment'  => 1404,
        'house'      => 1406,
        'cottage'    => 6678,
        'land'       => 1407,
        'garage'     => 1408,
        'commercial' => 1405,
    ];

    const TRANSACTION_TO_OFFER_TYPE = [
        'sale'               => 776,
        'rent'               => 912,
        'inchiriere_zilnica' => 903,
        'new_build'          => 776,
        'exchange'           => 778,
        'buy'                => 777,
    ];

    const ROOMS_MAP = [
        1 => '893', 2 => '894', 3 => '902', 4 => '904', 5 => '20442',
    ];

    const FLOOR_MAP = [
        1 => '918',  2 => '935',  3 => '905',  4 => '929',  5 => '909',
        6 => '955',  7 => '895',  8 => '921',  9 => '934',  10 => '947',
        11 => '970', 12 => '965', 13 => '958', 14 => '913', 15 => '1016',
        16 => '1019',17 => '940', 18 => '1021',19 => '1015',20 => '1681',
        21 => '1679',22 => '12484',23 => '12485',24 => '1661',25 => '1014',
    ];

    const FLOORS_TOTAL_MAP = [
        1 => '956',  2 => '964',  3 => '906',  4 => '936',  5 => '910',
        6 => '919',  7 => '971',  8 => '975',  9 => '896',  10 => '951',
        11 => '948', 12 => '954', 13 => '966', 14 => '959', 15 => '979',
        16 => '914', 17 => '1018',18 => '1017',19 => '982', 20 => '972',
        21 => '963', 22 => '1020',23 => '1680',24 => '941', 25 => '1668',
    ];

    const SECTOR_MAP = [
        'centru'      => '15664',
        'botanica'    => '15665',
        'buiucani'    => '15666',
        'râșcani'     => '15667',
        'riscani'     => '15667',
        'telecentru'  => '15668',
        'ciocana'     => '15669',
        'poșta veche' => '15670',
        'posta veche' => '15670',
        'sculeni'     => '15671',
        'aeroport'    => '15672',
    ];

    const REGION_CHISINAU   = '12900';
    const LOCALITY_CHISINAU = '13859';
    const AUTHOR_AGENCY     = '18894';
    const FUND_SECONDARY    = '19109';
    const FUND_NEW_BUILD    = '19108';

    // ── HTTP client ──────────────────────────────────────────────────────────

    private function apiKey(Agency $agency): string
    {
        return $agency->settings['portal_999md_api_key']
            ?? config('services.portal_999md.api_key')
            ?? '';
    }

    private function baseUrl(): string
    {
        return config('services.portal_999md.base_url') ?? self::BASE_URL;
    }

    private function client(Agency $agency): \Illuminate\Http\Client\PendingRequest
    {
        return Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->apiKey($agency), '')
            ->timeout(30)
            ->acceptJson();
    }

    // ── Discover helpers (call once to configure) ────────────────────────────

    public function getCategories(Agency $agency, string $lang = 'ro'): array
    {
        return $this->client($agency)->get('/categories', ['lang' => $lang])->json() ?? [];
    }

    public function getSubcategories(int $categoryId, Agency $agency, string $lang = 'ro'): array
    {
        return $this->client($agency)->get("/categories/{$categoryId}/subcategories", ['lang' => $lang])->json() ?? [];
    }

    public function getOfferTypes(int $categoryId, int $subcategoryId, Agency $agency, string $lang = 'ro'): array
    {
        return $this->client($agency)
            ->get("/categories/{$categoryId}/subcategories/{$subcategoryId}/offer-types", ['lang' => $lang])
            ->json() ?? [];
    }

    public function getFeatures(int $categoryId, int $subcategoryId, int $offerTypeId, Agency $agency, string $lang = 'ro'): array
    {
        return $this->client($agency)->get('/features', [
            'category_id'    => $categoryId,
            'subcategory_id' => $subcategoryId,
            'offer_type'     => $offerTypeId,
            'lang'           => $lang,
        ])->json() ?? [];
    }

    // ── Image upload ─────────────────────────────────────────────────────────

    public function uploadImage(string $mediaPath, Agency $agency): ?string
    {
        $absolutePath = storage_path('app/public/' . $mediaPath);

        if (! file_exists($absolutePath)) {
            Log::warning("999.md: image not found at {$absolutePath}");
            return null;
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->apiKey($agency), '')
            ->timeout(60)
            ->attach('file', file_get_contents($absolutePath), basename($absolutePath))
            ->post('/images');

        if (! $response->successful()) {
            throw new \RuntimeException('Image upload failed: ' . $response->body());
        }

        return $response->json('image_id');
    }

    // ── Ad CRUD ──────────────────────────────────────────────────────────────

    public function createAd(Property $property, Agency $agency): array
    {
        $property->load('media', 'user');

        $type = $property->type;
        $txn  = $property->transaction_type;

        if (! isset(self::TYPE_TO_SUBCATEGORY[$type])) {
            throw new \RuntimeException("Tipul de proprietate '{$type}' nu este suportat de 999.md");
        }
        if (! isset(self::TRANSACTION_TO_OFFER_TYPE[$txn])) {
            throw new \RuntimeException("Tipul de tranzacție '{$txn}' nu este suportat de 999.md");
        }

        $categoryId    = self::CATEGORY_IMOBILIARE;
        $subcategoryId = self::TYPE_TO_SUBCATEGORY[$type];
        $offerTypeId   = self::TRANSACTION_TO_OFFER_TYPE[$txn];

        // Upload images (max 10 — limita 999.md fără Premium)
        $imageIds = [];
        foreach ($property->media->take(10) as $media) {
            try {
                $id = $this->uploadImage($media->path, $agency);
                if ($id) $imageIds[] = $id;
            } catch (\Exception $e) {
                Log::warning("999.md upload skip media {$media->id}: " . $e->getMessage());
            }
        }

        if (empty($imageIds)) {
            throw new \RuntimeException('Nu s-au putut încărca imaginile pe 999.md. Cel puțin 1 imagine e necesară.');
        }

        $settings = $agency->settings ?? [];
        $payload = [
            'category_id'    => (string) $categoryId,
            'subcategory_id' => (string) $subcategoryId,
            'offer_type'     => (string) $offerTypeId,
            'features'       => $this->buildFeatures($property, $imageIds, $settings),
        ];

        Log::info('999.md createAd payload', ['property_id' => $property->id, 'payload' => $payload]);

        $response = $this->client($agency)->post('/adverts', $payload);

        if (! $response->successful()) {
            $error = $response->body();
            Log::error('999.md createAd failed', ['status' => $response->status(), 'body' => $error]);
            throw new \RuntimeException("createAd failed (HTTP {$response->status()}): {$error}");
        }

        return $response->json();
    }

    public function updateAd(string $externalId, Property $property, Agency $agency): array
    {
        $settings = $agency->settings ?? [];
        $features = $this->buildFeatures($property, [], $settings);

        $response = $this->client($agency)->patch("/adverts/{$externalId}", [
            'features' => $features,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('updateAd failed: ' . $response->body());
        }

        return $response->json();
    }

    public function republishAd(string $externalId, Agency $agency): array
    {
        $response = $this->client($agency)->post("/adverts/{$externalId}/republish");

        if (! $response->successful()) {
            throw new \RuntimeException('republishAd failed: ' . $response->body());
        }

        return $response->json();
    }

    public function getAdStatus(string $externalId, Agency $agency): array
    {
        $response = $this->client($agency)->get("/adverts/{$externalId}");

        if (! $response->successful()) {
            throw new \RuntimeException('getAdStatus failed: ' . $response->body());
        }

        return $response->json();
    }

    public function listAds(Agency $agency, array $params = []): array
    {
        return $this->client($agency)->get('/adverts', $params)->json() ?? [];
    }

    /**
     * Iterate through all pages of /adverts and return the merged list.
     * Stops when the response has no more pages.
     */
    public function listAllAdverts(Agency $agency, string $lang = 'ro', array $states = ['public', 'hidden']): array
    {
        $all      = [];
        $page     = 1;
        $pageSize = 30;

        do {
            $params = [
                'page'      => $page,
                'page_size' => $pageSize,
                'lang'      => $lang,
            ];
            if (! empty($states)) {
                $params['states'] = implode(',', $states);
            }

            $response = $this->client($agency)->get('/adverts', $params);

            if (! $response->successful()) {
                Log::warning("999.md listAllAdverts: HTTP {$response->status()} on page {$page}");
                break;
            }

            $body    = $response->json() ?? [];
            $adverts = $body['adverts'] ?? [];

            if (empty($adverts)) {
                break;
            }

            $all = array_merge($all, $adverts);

            // Stop when fewer than pageSize returned (last page)
            if (count($adverts) < $pageSize) {
                break;
            }

            $page++;

            // Safety: hard cap at 100 pages = 3000 ads
            if ($page > 100) {
                Log::warning('999.md listAllAdverts: hit 100-page safety cap');
                break;
            }
        } while (true);

        return $all;
    }

    /**
     * Get features array for a single advert (price, title, images, etc.)
     */
    public function getAdvertFeatures(string $advertId, Agency $agency, string $lang = 'ro'): array
    {
        $response = $this->client($agency)->get("/adverts/{$advertId}/features", ['lang' => $lang]);

        if (! $response->successful()) {
            Log::warning("999.md getAdvertFeatures #{$advertId}: HTTP {$response->status()}");
            return [];
        }

        return $response->json('features') ?? $response->json() ?? [];
    }

    // ── Feature builder ──────────────────────────────────────────────────────

    private function buildFeatures(Property $property, array $imageIds, array $settings): array
    {
        $currencyMap = ['EUR' => 'eur', 'USD' => 'usd', 'MDL' => 'mdl'];
        $currency    = $currencyMap[$property->currency] ?? 'eur';

        $features = [];

        // Required: Preț
        $features[] = ['id' => (string) self::F_PRICE, 'value' => (int) $property->price, 'unit' => $currency];

        // Required: Author = Agenție
        $features[] = ['id' => (string) self::F_AUTHOR, 'value' => self::AUTHOR_AGENCY];

        // Required pentru apartment / cottage: Număr camere
        if (in_array($property->type, ['apartment', 'cottage']) && $property->rooms) {
            $roomsKey = $property->rooms >= 5 ? 5 : $property->rooms;
            if (isset(self::ROOMS_MAP[$roomsKey])) {
                $features[] = ['id' => (string) self::F_ROOMS, 'value' => self::ROOMS_MAP[$roomsKey]];
            }
        }

        // Required: Suprafață totală
        if ($property->area_total) {
            $features[] = ['id' => (string) self::F_AREA, 'value' => (int) $property->area_total, 'unit' => 'm2'];
        }

        // Required pentru apartment: Fond locativ
        if ($property->type === 'apartment') {
            $isNewBuild = data_get($property->meta, 'is_new_build')
                || $property->transaction_type === 'new_build';
            $fund = $isNewBuild ? self::FUND_NEW_BUILD : self::FUND_SECONDARY;
            $features[] = ['id' => (string) self::F_FUND, 'value' => $fund];
        }

        // Required pentru apartment: Etaj
        if ($property->type === 'apartment' && $property->floor && isset(self::FLOOR_MAP[$property->floor])) {
            $features[] = ['id' => (string) self::F_FLOOR, 'value' => self::FLOOR_MAP[$property->floor]];
        }

        // Required pentru apartment: Număr etaje
        if ($property->type === 'apartment' && $property->floors_total && isset(self::FLOORS_TOTAL_MAP[$property->floors_total])) {
            $features[] = ['id' => (string) self::F_FLOORS_TOTAL, 'value' => self::FLOORS_TOTAL_MAP[$property->floors_total]];
        }

        // Required: Regiune Chișinău (hardcoded pentru moment)
        $features[] = ['id' => (string) self::F_REGION, 'value' => self::REGION_CHISINAU];

        // Required: Localitate Chișinău
        $features[] = ['id' => (string) self::F_LOCALITY, 'value' => self::LOCALITY_CHISINAU];

        // Required: Sector (mapat din district)
        $districtKey = strtolower(trim($property->district ?? ''));
        $sectorId    = self::SECTOR_MAP[$districtKey] ?? self::SECTOR_MAP['centru'];
        $features[]  = ['id' => (string) self::F_SECTOR, 'value' => $sectorId];

        // Required: Stradă + Casă (split din address)
        $address = trim($property->address ?? '');
        [$street, $building] = $this->splitAddress($address);
        $features[] = ['id' => (string) self::F_STREET,   'value' => $street ?: 'Nedeterminat'];
        $features[] = ['id' => (string) self::F_BUILDING, 'value' => $building ?: '0'];

        // Optional: Description
        $description = $property->description_ro ?? $property->description_ru ?? $property->title;
        if ($description) {
            $description = preg_replace('/^https?:\/\/\S+\s*\n+/', '', $description);
            $features[]  = ['id' => (string) self::F_DESCRIPTION, 'value' => trim($description)];
        }

        // Required: Imagini
        if (! empty($imageIds)) {
            $features[] = ['id' => (string) self::F_IMAGES, 'value' => $imageIds];
        }

        // Optional: Contacte (phone)
        $phone = $this->normalizePhone(
            $settings['contact_phone'] ?? $property->user?->phone ?? null
        );
        if ($phone) {
            $features[] = ['id' => (string) self::F_CONTACTS, 'value' => [$phone]];
        }

        return $features;
    }

    private function splitAddress(string $address): array
    {
        if (empty($address)) return ['', ''];
        if (preg_match('/^(.+?)\s+(\d+\w*)$/', $address, $m)) {
            return [trim($m[1]), trim($m[2])];
        }
        return [$address, ''];
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) return null;
        $clean = preg_replace('/[^0-9]/', '', $phone);
        if (empty($clean)) return null;
        if (strlen($clean) === 8) return '373' . $clean;
        if (strlen($clean) === 9 && str_starts_with($clean, '0')) return '373' . substr($clean, 1);
        if (strlen($clean) === 11 && str_starts_with($clean, '373')) return $clean;
        return $clean;
    }
}
