<?php

namespace App\Services\Portals;

use App\Models\Agency;
use App\Models\Property;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Portal999Service
{
    const BASE_URL = 'https://partners-api.999.md';

    // Universal feature IDs (from 999.md API docs examples)
    const F_PRICE       = 2;
    const F_TITLE       = 12;
    const F_DESCRIPTION = 13;
    const F_IMAGES      = 14;
    const F_CONTACTS    = 16;

    // Property type → 999.md subcategory key in agency settings
    const TYPE_SETTINGS_KEY = [
        'apartment' => 'p999_subcat_apartment',
        'house'     => 'p999_subcat_house',
        'commercial'=> 'p999_subcat_commercial',
        'land'      => 'p999_subcat_land',
    ];

    const TRANSACTION_SETTINGS_KEY = [
        'sale'       => 'p999_offer_sale',
        'rent'       => 'p999_offer_rent',
        'rent_short' => 'p999_offer_rent_short',
        'new_build'  => 'p999_offer_sale',
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
        $property->load('media', 'user');

        $settings = $agency->settings ?? [];

        $categoryId    = (int) ($settings['p999_category_id'] ?? 0);
        $subcategoryId = (int) ($settings[self::TYPE_SETTINGS_KEY[$property->type] ?? 'p999_subcat_apartment'] ?? 0);
        $offerTypeId   = (int) ($settings[self::TRANSACTION_SETTINGS_KEY[$property->transaction_type] ?? 'p999_offer_sale'] ?? 0);

        if (! $categoryId || ! $subcategoryId || ! $offerTypeId) {
            throw new \RuntimeException('Categoriile 999.md nu sunt configurate în Settings → Portaluri.');
        }

        // Upload images
        $imageIds = [];
        foreach ($property->media->take(20) as $media) {
            try {
                $id = $this->uploadImage($media->path, $agency);
                if ($id) $imageIds[] = $id;
            } catch (\Exception $e) {
                Log::warning("999.md upload skip media {$media->id}: " . $e->getMessage());
            }
        }

        $payload = [
            'category_id'    => $categoryId,
            'subcategory_id' => $subcategoryId,
            'offer_type'     => $offerTypeId,
            'features'       => $this->buildFeatures($property, $imageIds, $settings),
        ];

        $response = $this->client($agency)->post('/adverts', $payload);

        if (! $response->successful()) {
            throw new \RuntimeException('createAd failed: ' . $response->body());
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

        $fPrice = (int) ($settings['p999_feature_price']       ?? self::F_PRICE);
        $fTitle = (int) ($settings['p999_feature_title']       ?? self::F_TITLE);
        $fDesc  = (int) ($settings['p999_feature_description'] ?? self::F_DESCRIPTION);
        $fImg   = (int) ($settings['p999_feature_images']      ?? self::F_IMAGES);
        $fPhone = (int) ($settings['p999_feature_contacts']    ?? self::F_CONTACTS);

        $description = $property->description_ro
            ?? $property->description_ru
            ?? $property->description_en
            ?? $property->title;

        $features = [
            ['id' => (string) $fPrice, 'value' => (int) $property->price, 'unit' => $currency],
            ['id' => (string) $fTitle, 'value' => $property->title],
            ['id' => (string) $fDesc,  'value' => $description],
        ];

        if ($property->user?->phone) {
            $features[] = ['id' => (string) $fPhone, 'value' => [$property->user->phone]];
        }

        if (! empty($imageIds)) {
            $features[] = ['id' => (string) $fImg, 'value' => $imageIds];
        }

        if ($property->latitude && $property->longitude) {
            $fLocation = (int) ($settings['p999_feature_location'] ?? 0);
            if ($fLocation) {
                $features[] = [
                    'id'    => (string) $fLocation,
                    'value' => [
                        'lat'     => (float) $property->latitude,
                        'lon'     => (float) $property->longitude,
                        'bearing' => 0,
                        'pitch'   => 0,
                        'zoom'    => 15,
                    ],
                ];
            }
        }

        return $features;
    }
}
