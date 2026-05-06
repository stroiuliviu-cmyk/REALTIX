<?php

namespace App\Jobs;

use App\Models\Agency;
use App\Models\ScrapedListing;
use App\Services\Portals\Portal999Service;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Pull real-estate adverts from 999.md Partners API and upsert them into ScrapedListing.
 *
 * NOTE: Partners API returns ONLY the adverts owned by the API key holder.
 * Non-real-estate categories (Transport, Diverse, etc.) are filtered out.
 */
class Sync999AdvertsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 600;

    public function __construct(
        public ?int $agencyId = null,
    ) {}

    public function handle(Portal999Service $service): void
    {
        $agency = $this->agencyId
            ? Agency::find($this->agencyId)
            : Agency::first();

        if (! $agency) {
            Log::warning('Sync999AdvertsJob: no agency available');
            return;
        }

        $hasKey = ($agency->settings['portal_999md_api_key'] ?? null)
               || config('services.portal_999md.api_key');

        if (! $hasKey) {
            Log::warning('Sync999AdvertsJob: no API key configured');
            return;
        }

        try {
            $adverts = $service->listAllAdverts($agency, 'ro', ['public', 'hidden']);
        } catch (\Throwable $e) {
            Log::error('Sync999AdvertsJob: listAllAdverts failed: ' . $e->getMessage());
            return;
        }

        $synced  = 0;
        $skipped = 0;

        foreach ($adverts as $ad) {
            $externalId = (string) ($ad['id'] ?? '');
            if ($externalId === '') {
                continue;
            }

            // Filter: keep only real-estate ads
            $catUrl = $ad['categories']['category']['url'] ?? '';
            $catId  = (string) ($ad['categories']['category']['id'] ?? '');
            if ($catUrl !== 'real-estate' && $catId !== '270') {
                $skipped++;
                continue;
            }

            try {
                $mapped = $this->mapToListing($ad);

                ScrapedListing::updateOrCreate(
                    ['source' => '999md', 'external_id' => $externalId],
                    array_merge($mapped, ['agency_id' => $agency->id])
                );

                $synced++;
            } catch (\Throwable $e) {
                Log::warning("Sync999AdvertsJob: ad #{$externalId} failed: " . $e->getMessage());
            }
        }

        Log::info("Sync999AdvertsJob agency #{$agency->id}: {$synced} synced, {$skipped} skipped (non-real-estate), " . count($adverts) . " total returned");
    }

    /**
     * Map a 999.md /adverts response item directly to ScrapedListing fields.
     * The list response already includes price, images, contacts, location —
     * so we don't need to call /features separately.
     */
    private function mapToListing(array $ad): array
    {
        // ── Price + currency. The /adverts response shape is {id, value, unit}.
        $price    = null;
        $currency = 'EUR';
        if (is_array($ad['price'] ?? null)) {
            $price = isset($ad['price']['value']) ? (float) $ad['price']['value'] : null;
            $unit  = strtoupper($ad['price']['unit'] ?? 'EUR');
            $currency = in_array($unit, ['EUR', 'USD', 'MDL'], true) ? $unit : 'EUR';
        } elseif (is_numeric($ad['price'] ?? null)) {
            $price = (float) $ad['price'];
        }

        // ── Images: API returns {id: 14, value: [filenames]} — prefix with Simpals CDN
        $images   = [];
        $cdnBase  = 'https://i.simpalsmedia.com/999.md/board/';
        $imgBlock = $ad['images'] ?? null;
        $imgList  = is_array($imgBlock) ? ($imgBlock['value'] ?? $imgBlock) : [];
        if (is_array($imgList)) {
            foreach ($imgList as $img) {
                if (is_string($img)) {
                    // Strip ?metadata=... suffix
                    $clean = strtok($img, '?');
                    $images[] = str_starts_with($clean, 'http') ? $clean : ($cdnBase . $clean);
                } elseif (is_array($img)) {
                    $url = $img['url'] ?? $img['original'] ?? $img['src'] ?? null;
                    if ($url) {
                        $images[] = str_starts_with($url, 'http') ? $url : ($cdnBase . $url);
                    }
                }
            }
        }

        // ── Contacts: API returns {id: 16, value: {phone_numbers: [...]}}
        $phone = null;
        $contactsBlock = $ad['contacts'] ?? null;
        if (is_array($contactsBlock)) {
            $numbers = $contactsBlock['value']['phone_numbers']
                ?? $contactsBlock['phone_numbers']
                ?? null;
            if (is_array($numbers) && ! empty($numbers)) {
                $first = $numbers[0] ?? null;
                $phone = is_array($first) ? ($first['value'] ?? null) : (string) $first;
            }
        }

        // ── Location
        $location = $ad['location'] ?? [];
        $city = $location['location_location'] ?? $location['location_region'] ?? 'Chișinău';
        $district = $location['location_sector'] ?? null;
        if (! $city) $city = 'Chișinău';

        // ── Type / transaction from subcategory
        $subUrl = $ad['categories']['subcategory']['url'] ?? null;
        [$type, $transactionType] = $this->detectTypeFromSubcategoryUrl($subUrl, $ad['offer_type'] ?? null);

        // ── Owner type (Partners API ads are always agency-owned)
        $ownerType = 'agency';

        return [
            'external_url'     => "https://999.md/ro/{$ad['id']}",
            'title'            => $ad['title'] ?? 'Anunț 999.md',
            'price'            => $price,
            'currency'         => $currency,
            'area'             => null,
            'rooms'            => null,
            'city'             => $city,
            'district'         => $district,
            'images'           => array_values(array_filter($images)),
            'phone'            => $phone,
            'owner_type'       => $ownerType,
            'published_at'     => isset($ad['posted'])
                ? \Illuminate\Support\Carbon::parse($ad['posted'])
                : now(),
            'type'             => $type,
            'transaction_type' => $transactionType,
            'raw_data'         => [
                'state'         => $ad['state'] ?? null,
                'views_counter' => $ad['views_counter'] ?? 0,
                'expire'        => $ad['expire'] ?? null,
                'offer_type'    => $ad['offer_type'] ?? null,
                'subcategory'   => $ad['categories']['subcategory'] ?? null,
                'category'      => $ad['categories']['category'] ?? null,
                'location'      => $location,
            ],
        ];
    }

    private function detectTypeFromSubcategoryUrl(?string $url, $offerType = null): array
    {
        $type = 'apartment';
        $url  = strtolower((string) $url);

        if (str_contains($url, 'house') || str_contains($url, 'cottage')) {
            $type = 'house';
        } elseif (str_contains($url, 'commercial')) {
            $type = 'commercial';
        } elseif (str_contains($url, 'land')) {
            $type = 'land';
        }

        // Heuristic: 777 (Închiriez) and 778 (Iau în chirie) typically mean rent
        $rentOfferTypes = [777, 778];
        $transactionType = in_array((int) $offerType, $rentOfferTypes, true)
            ? 'rent'
            : 'sale';

        return [$type, $transactionType];
    }
}
