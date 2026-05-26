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

    const REGION_DEFAULT    = '12900';  // Chișinău mun. (fallback când orașul nu e mapat)
    const LOCALITY_CHISINAU = '13859';

    // Mapping orașe Moldovenești → 999.md region IDs.
    // Cheile sunt în lowercase (cu și fără diacritice) pentru match fuzzy.
    const MD_REGION_MAP = [
        // Municipii
        'chișinău'       => '12900', 'chisinau'  => '12900',
        'bălți'          => '12912', 'balti'     => '12912',
        'tiraspol'       => '12885',
        'bender'         => '12882', 'tighina'   => '12882',
        'comrat'         => '12875',
        // Raioane
        'anenii noi'     => '12905',
        'basarabeasca'   => '12901',
        'briceni'        => '12898',
        'cahul'          => '12908',
        'camenca'        => '12874',
        'cantemir'       => '12890',
        'ciadîr-lunga'   => '12871', 'ciadir-lunga'  => '12871',
        'cimișlia'       => '12889', 'cimislia'      => '12889',
        'criuleni'       => '12888',
        'călărași'       => '12907', 'calarasi'      => '12907',
        'căușeni'        => '12903', 'causeni'       => '12903',
        'dnestrovsk'     => '17475',
        'dondușeni'      => '12896', 'donduseni'     => '12896',
        'drochia'        => '12893',
        'dubăsari'       => '12879', 'dubasari'      => '12879',
        'edineț'         => '12895', 'edinet'        => '12895',
        'florești'       => '12911', 'floresti'      => '12911',
        'fălești'        => '12887', 'falesti'       => '12887',
        'glodeni'        => '12904',
        'grigoriopol'    => '12873',
        'hîncești'       => '12876', 'hincesti'      => '12876',
        'ialoveni'       => '12886',
        'leova'          => '12881',
        'nisporeni'      => '12877',
        'ocnița'         => '12902', 'ocnita'        => '12902',
        'orhei'          => '12909',
        'rezina'         => '12891',
        'rîbnița'        => '12883', 'ribnita'       => '12883',
        'rîșcani'        => '12897', 'riscani'       => '12897',
        'slobozia'       => '12884',
        'soroca'         => '12899',
        'strășeni'       => '12910', 'straseni'      => '12910',
        'sîngerei'       => '12906', 'singerei'      => '12906',
        'taraclia'       => '12894',
        'telenești'      => '12892', 'telenesti'     => '12892',
        'ungheni'        => '12870',
        'vulcănești'     => '12878', 'vulcanesti'    => '12878',
        'șoldănești'     => '12880', 'soldanesti'    => '12880',
        'ștefan-vodă'    => '12872', 'stefan-voda'   => '12872',
    ];

    // Agency context for current createAd() call — used by detectLocality
    // to make API calls without changing all build*Features signatures.
    private ?Agency $currentAgency = null;
    const AUTHOR_AGENCY     = '18894';
    const FUND_SECONDARY    = '19109';
    const FUND_NEW_BUILD    = '19108';

    // ── Per-category feature IDs and maps ────────────────────────────────────

    const F_TITLE           = 12;    // House/Vila/Garage — required title
    const F_PARKING_TYPE    = 259;   // Garage
    const F_HOUSE_TYPE      = 1311;  // House
    const F_HOUSE_ROOMS     = 588;   // House/Cottage — rooms ca numeric
    const F_BATHROOMS       = 252;   // House/Cottage
    const F_SANITARY        = 1622;  // House/Cottage
    const F_SEWAGE          = 1623;  // House/Cottage
    const F_GAS             = 1624;  // House/Cottage
    const F_LAND_TYPE       = 258;   // Land
    const F_LAND_AREA       = 245;   // Land area (in ar or ha)
    const F_COMMERCIAL_TYPE = 257;   // Commercial

    // House — Tip casă
    const HOUSE_TYPE_MAP = [
        'casa'      => '23321',
        'duplex'    => '43944',
        'townhouse' => '23323',
    ];

    // House/Cottage — Floors_total cu 4 opțiuni (DIFERIT de apartament)
    const HOUSE_FLOORS_MAP = [
        1 => '1641',  // 1 etaj
        2 => '1643',  // 2 etaje
        3 => '1644',  // 3 etaje
        4 => '1652',  // 4+ etaje
    ];

    // House/Cottage — Grup sanitar
    const BATHROOMS_MAP = [
        0 => '27756',  // Fără
        1 => '900',    // 1
        2 => '950',    // 2
        3 => '967',    // 3
        4 => '27763',  // 4
        5 => '43566',  // 5
    ];

    // House/Cottage — Instalații sanitare / canalizare / gazificare (yes/no)
    const SANITARY_WITH    = '27757';
    const SANITARY_WITHOUT = '27758';
    const SEWAGE_WITH      = '27759';
    const SEWAGE_WITHOUT   = '27760';
    const GAS_WITH         = '27761';
    const GAS_WITHOUT      = '27762';

    // Garage — Tip parcare
    const PARKING_TYPE_MAP = [
        'garaj'        => '1041',
        'parking_spot' => '1042',
        'underground'  => '1043',
    ];

    // Land — Tipul lotului
    const LAND_TYPE_MAP = [
        'constructii' => '1039',
        'agricol'     => '1040',
        'gradina'     => '37019',
        'forestier'   => '37020',
        'industrial'  => '37021',
        'plantatii'   => '37022',
        'lac'         => '24342',
    ];

    // Commercial — Tipul încăperii
    const COMMERCIAL_TYPE_MAP = [
        'birou'           => '1026',
        'comercial'       => '1030',
        'depozit'         => '1027',
        'industrial'      => '1029',
        'alimentatie'     => '1023',
        'sala_conferinta' => '23212',
        'salon_frumusete' => '23213',
        'service_auto'    => '23214',
        'hotel'           => '23215',
        'universal'       => '23216',
        'stomatologie'    => '44493',
        'sport'           => '44494',
    ];

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
        // Cache agency for detectLocality (called from build*Features deeper in stack
        // without having to thread $agency through every method signature).
        $this->currentAgency = $agency;

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
        return match ($property->type) {
            'apartment'  => $this->buildApartmentFeatures($property, $imageIds, $settings),
            'house'      => $this->buildHouseFeatures($property, $imageIds, $settings),
            'cottage'    => $this->buildCottageFeatures($property, $imageIds, $settings),
            'garage'     => $this->buildGarageFeatures($property, $imageIds, $settings),
            'land'       => $this->buildLandFeatures($property, $imageIds, $settings),
            'commercial' => $this->buildCommercialFeatures($property, $imageIds, $settings),
            default      => $this->buildApartmentFeatures($property, $imageIds, $settings),
        };
    }

    private function buildApartmentFeatures(Property $property, array $imageIds, array $settings): array
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

        // Required: Regiune (detectat din property.city)
        $regionId   = $this->detectRegion($property->city);
        $features[] = ['id' => (string) self::F_REGION, 'value' => $regionId];

        // Required: Localitate (lookup dinamic prin /dependent_options pentru non-Chișinău)
        $localityId = $this->detectLocality($property, $regionId, $this->currentAgency);
        $features[] = ['id' => (string) self::F_LOCALITY, 'value' => $localityId ?? self::LOCALITY_CHISINAU];

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

    // ── Type-specific builders (house / cottage / garage / land / commercial) ─

    private function buildHouseFeatures(Property $property, array $imageIds, array $settings): array
    {
        $features = $this->commonFeatures($property, $imageIds, $settings);

        // Title (required pentru house)
        $features[] = ['id' => (string) self::F_TITLE, 'value' => $property->title ?: 'Casă de vânzare'];

        // Tip casă (default: Casă)
        $features[] = ['id' => (string) self::F_HOUSE_TYPE, 'value' => self::HOUSE_TYPE_MAP['casa']];

        // Suprafață totală
        if ($property->area_total) {
            $features[] = ['id' => (string) self::F_AREA, 'value' => (int) $property->area_total, 'unit' => 'm2'];
        }

        // Număr camere (textbox_numeric, NU dropdown)
        if ($property->rooms) {
            $features[] = ['id' => (string) self::F_HOUSE_ROOMS, 'value' => (int) $property->rooms];
        }

        // Număr etaje (4 opțiuni: 1/2/3/4+)
        $floorsKey = $property->floors_total ? min((int) $property->floors_total, 4) : 1;
        if (isset(self::HOUSE_FLOORS_MAP[$floorsKey])) {
            $features[] = ['id' => (string) self::F_FLOORS_TOTAL, 'value' => self::HOUSE_FLOORS_MAP[$floorsKey]];
        }

        // Grup sanitar — default 1
        $bathrooms    = (int) data_get($property->meta, 'bathrooms', 1);
        $bathroomsKey = min($bathrooms, 5);
        $features[]   = ['id' => (string) self::F_BATHROOMS, 'value' => self::BATHROOMS_MAP[$bathroomsKey] ?? self::BATHROOMS_MAP[1]];

        // Instalații sanitare — default CU
        $features[] = ['id' => (string) self::F_SANITARY, 'value' => self::SANITARY_WITH];

        // Canalizare — default CU
        $features[] = ['id' => (string) self::F_SEWAGE, 'value' => self::SEWAGE_WITH];

        // Gazificare — auto-detect din meta.gas sau meta.heating
        $hasGas = (bool) data_get($property->meta, 'gas', false)
            || str_contains(strtolower((string) data_get($property->meta, 'heating', '')), 'gas');
        $features[] = ['id' => (string) self::F_GAS, 'value' => $hasGas ? self::GAS_WITH : self::GAS_WITHOUT];

        return $features;
    }

    private function buildCottageFeatures(Property $property, array $imageIds, array $settings): array
    {
        $features = $this->commonFeatures($property, $imageIds, $settings);

        // Title (required)
        $features[] = ['id' => (string) self::F_TITLE, 'value' => $property->title ?: 'Vilă de vânzare'];

        if ($property->area_total) {
            $features[] = ['id' => (string) self::F_AREA, 'value' => (int) $property->area_total, 'unit' => 'm2'];
        }

        if ($property->rooms) {
            $features[] = ['id' => (string) self::F_HOUSE_ROOMS, 'value' => (int) $property->rooms];
        }

        $floorsKey  = $property->floors_total ? min((int) $property->floors_total, 4) : 1;
        $features[] = ['id' => (string) self::F_FLOORS_TOTAL, 'value' => self::HOUSE_FLOORS_MAP[$floorsKey] ?? self::HOUSE_FLOORS_MAP[1]];

        $bathrooms  = (int) data_get($property->meta, 'bathrooms', 1);
        $features[] = ['id' => (string) self::F_BATHROOMS, 'value' => self::BATHROOMS_MAP[min($bathrooms, 5)] ?? self::BATHROOMS_MAP[1]];

        $features[] = ['id' => (string) self::F_SANITARY, 'value' => self::SANITARY_WITH];
        $features[] = ['id' => (string) self::F_SEWAGE,   'value' => self::SEWAGE_WITH];

        $hasGas     = (bool) data_get($property->meta, 'gas', false);
        $features[] = ['id' => (string) self::F_GAS, 'value' => $hasGas ? self::GAS_WITH : self::GAS_WITHOUT];

        return $features;
    }

    private function buildGarageFeatures(Property $property, array $imageIds, array $settings): array
    {
        // Garaj NU cere autor
        $features = $this->commonFeatures($property, $imageIds, $settings, includeAuthor: false);

        // Title (required)
        $features[] = ['id' => (string) self::F_TITLE, 'value' => $property->title ?: 'Garaj de vânzare'];

        // Tip parcare (default: Garaj)
        $parkingType = data_get($property->meta, 'parking_type', 'garaj');
        $parkingId   = self::PARKING_TYPE_MAP[$parkingType] ?? self::PARKING_TYPE_MAP['garaj'];
        $features[]  = ['id' => (string) self::F_PARKING_TYPE, 'value' => $parkingId];

        return $features;
    }

    private function buildLandFeatures(Property $property, array $imageIds, array $settings): array
    {
        // Land NU are stradă/clădire required, dar are sector
        $features = [];

        $currency   = ['EUR' => 'eur', 'USD' => 'usd', 'MDL' => 'mdl'][$property->currency] ?? 'eur';
        $features[] = ['id' => (string) self::F_PRICE, 'value' => (int) $property->price, 'unit' => $currency];

        // Tip lot (default: construcții)
        $landType   = data_get($property->meta, 'land_type', 'constructii');
        $landId     = self::LAND_TYPE_MAP[$landType] ?? self::LAND_TYPE_MAP['constructii'];
        $features[] = ['id' => (string) self::F_LAND_TYPE, 'value' => $landId];

        // Suprafață teren — în ari (100 m²) sau hectare (10000 m²), NU m²
        if ($property->area_total) {
            $m2 = (float) $property->area_total;
            if ($m2 >= 10000) {
                $features[] = ['id' => (string) self::F_LAND_AREA, 'value' => (int) round($m2 / 10000), 'unit' => 'ha'];
            } else {
                $features[] = ['id' => (string) self::F_LAND_AREA, 'value' => (int) round($m2 / 100), 'unit' => 'ar'];
            }
        }

        // Autor
        $features[] = ['id' => (string) self::F_AUTHOR, 'value' => self::AUTHOR_AGENCY];

        // Locație (regiune detectată din city, localitate lookup dinamic)
        $regionId   = $this->detectRegion($property->city);
        $features[] = ['id' => (string) self::F_REGION, 'value' => $regionId];

        $localityId = $this->detectLocality($property, $regionId, $this->currentAgency);
        $features[] = ['id' => (string) self::F_LOCALITY, 'value' => $localityId ?? self::LOCALITY_CHISINAU];

        $districtKey = strtolower(trim($property->district ?? 'centru'));
        $sectorId    = self::SECTOR_MAP[$districtKey] ?? self::SECTOR_MAP['centru'];
        $features[]  = ['id' => (string) self::F_SECTOR, 'value' => $sectorId];

        // Description
        $description = $property->description_ro ?? $property->description_ru ?? $property->title;
        if ($description) {
            $description = preg_replace('/^https?:\/\/\S+\s*\n+/', '', $description);
            $features[]  = ['id' => (string) self::F_DESCRIPTION, 'value' => trim($description)];
        }

        // Imagini
        if (! empty($imageIds)) {
            $features[] = ['id' => (string) self::F_IMAGES, 'value' => $imageIds];
        }

        // Contacte
        $phone = $this->normalizePhone($settings['contact_phone'] ?? $property->user?->phone ?? null);
        if ($phone) {
            $features[] = ['id' => (string) self::F_CONTACTS, 'value' => [$phone]];
        }

        return $features;
    }

    private function buildCommercialFeatures(Property $property, array $imageIds, array $settings): array
    {
        // Commercial NU cere autor
        $features = $this->commonFeatures($property, $imageIds, $settings, includeAuthor: false);

        if ($property->area_total) {
            $features[] = ['id' => (string) self::F_AREA, 'value' => (int) $property->area_total, 'unit' => 'm2'];
        }

        // Tipul încăperii (default: Spațiu comercial)
        $commType   = data_get($property->meta, 'commercial_type', 'comercial');
        $commId     = self::COMMERCIAL_TYPE_MAP[$commType] ?? self::COMMERCIAL_TYPE_MAP['comercial'];
        $features[] = ['id' => (string) self::F_COMMERCIAL_TYPE, 'value' => $commId];

        return $features;
    }

    /**
     * Common features shared between house/cottage/garage/commercial builders.
     * Land has its own (no street/building, area in ar/ha).
     */
    private function commonFeatures(
        Property $property,
        array $imageIds,
        array $settings,
        bool $includeAuthor = true
    ): array {
        $features = [];

        $currency   = ['EUR' => 'eur', 'USD' => 'usd', 'MDL' => 'mdl'][$property->currency] ?? 'eur';
        $features[] = ['id' => (string) self::F_PRICE, 'value' => (int) $property->price, 'unit' => $currency];

        if ($includeAuthor) {
            $features[] = ['id' => (string) self::F_AUTHOR, 'value' => self::AUTHOR_AGENCY];
        }

        // Locație (regiune detectată din city, localitate lookup dinamic)
        $regionId   = $this->detectRegion($property->city);
        $features[] = ['id' => (string) self::F_REGION, 'value' => $regionId];

        $localityId = $this->detectLocality($property, $regionId, $this->currentAgency);
        $features[] = ['id' => (string) self::F_LOCALITY, 'value' => $localityId ?? self::LOCALITY_CHISINAU];

        $districtKey = strtolower(trim($property->district ?? 'centru'));
        $sectorId    = self::SECTOR_MAP[$districtKey] ?? self::SECTOR_MAP['centru'];
        $features[]  = ['id' => (string) self::F_SECTOR, 'value' => $sectorId];

        // Adresa
        $address             = trim($property->address ?? '');
        [$street, $building] = $this->splitAddress($address);
        $features[]          = ['id' => (string) self::F_STREET,   'value' => $street ?: 'Nedeterminat'];
        $features[]          = ['id' => (string) self::F_BUILDING, 'value' => $building ?: '0'];

        // Description
        $description = $property->description_ro ?? $property->description_ru ?? $property->title;
        if ($description) {
            $description = preg_replace('/^https?:\/\/\S+\s*\n+/', '', $description);
            $features[]  = ['id' => (string) self::F_DESCRIPTION, 'value' => trim($description)];
        }

        // Imagini
        if (! empty($imageIds)) {
            $features[] = ['id' => (string) self::F_IMAGES, 'value' => $imageIds];
        }

        // Contacte
        $phone = $this->normalizePhone($settings['contact_phone'] ?? $property->user?->phone ?? null);
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

    /**
     * Map property.city to 999.md region_id via MD_REGION_MAP.
     * Tries exact lowercase match first, then partial (handles "or. Bălți",
     * "Bălți mun.", "sat. X r-nul Y"). Falls back to Chișinău if no match.
     */
    private function detectRegion(?string $city): string
    {
        if (! $city) return self::REGION_DEFAULT;

        $normalized = mb_strtolower(trim($city));

        // Direct match
        if (isset(self::MD_REGION_MAP[$normalized])) {
            return self::MD_REGION_MAP[$normalized];
        }

        // Partial match (city may contain prefix/suffix like "or. ", " mun.")
        foreach (self::MD_REGION_MAP as $key => $id) {
            if (str_contains($normalized, $key)) {
                return $id;
            }
        }

        return self::REGION_DEFAULT;
    }

    /**
     * Resolve locality_id for a (region, city) pair via /dependent_options API.
     * For Chișinău the locality is hardcoded (saves an API call). For other
     * regions we list the localities under the region and match by name.
     * Returns null if lookup fails — caller should fall back to a default.
     */
    private function detectLocality(Property $property, string $regionId, ?Agency $agency): ?string
    {
        // Chișinău: hardcoded to city center (region == 12900)
        if ($regionId === self::REGION_DEFAULT) {
            return self::LOCALITY_CHISINAU;
        }

        // No agency context (e.g. tinker test without createAd) — skip API call
        if (! $agency) {
            return null;
        }

        try {
            $response = $this->client($agency)->get('/dependent_options', [
                'subcategory_id'        => self::TYPE_TO_SUBCATEGORY[$property->type] ?? 1404,
                'dependency_feature_id' => self::F_REGION,
                'parent_option_id'      => $regionId,
                'lang'                  => 'ro',
            ]);

            if (! $response->successful()) {
                \Log::warning("999.md detectLocality: HTTP {$response->status()} for region {$regionId}");
                return null;
            }

            $options = $response->json('Options') ?? $response->json('options') ?? [];

            $cityLower = mb_strtolower(trim($property->city ?? ''));

            // Exact match (case-insensitive)
            foreach ($options as $opt) {
                if (mb_strtolower($opt['title'] ?? '') === $cityLower) {
                    return (string) $opt['id'];
                }
            }

            // Partial match (city contains option title or vice-versa)
            foreach ($options as $opt) {
                $optLower = mb_strtolower($opt['title'] ?? '');
                if ($optLower !== '' && (str_contains($cityLower, $optLower) || str_contains($optLower, $cityLower))) {
                    return (string) $opt['id'];
                }
            }

            // Fallback: first option in the region (usually county capital)
            if (! empty($options)) {
                return (string) $options[0]['id'];
            }
        } catch (\Throwable $e) {
            \Log::error("999.md detectLocality failed: " . $e->getMessage());
        }

        return null;
    }
}
