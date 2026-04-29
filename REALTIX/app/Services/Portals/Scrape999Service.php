<?php

namespace App\Services\Portals;

use App\Models\Agency;
use App\Models\ScrapedListing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Scrape999Service
{
    // Categorii imobiliare pe 999.md
    const CATEGORIES = [
        ['url' => 'https://999.md/ro/imobiliare/apartamente-chisianu',    'type' => 'apartment', 'transaction_type' => 'sale'],
        ['url' => 'https://999.md/ro/imobiliare/apartamente-chisianu-chirie', 'type' => 'apartment', 'transaction_type' => 'rent'],
        ['url' => 'https://999.md/ro/imobiliare/case-si-vile',             'type' => 'house',     'transaction_type' => 'sale'],
        ['url' => 'https://999.md/ro/imobiliare/spatii-comerciale',        'type' => 'commercial','transaction_type' => 'sale'],
        ['url' => 'https://999.md/ro/imobiliare/terenuri',                 'type' => 'land',      'transaction_type' => 'sale'],
    ];

    private function httpClient(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'ro-RO,ro;q=0.9,ru;q=0.8',
            'Accept-Encoding' => 'gzip, deflate',
        ])->timeout(30);
    }

    /**
     * Fetch și salvează anunțuri din toate categoriile. Returnează numărul de anunțuri noi.
     */
    public function syncAll(Agency $agency, int $pagesPerCategory = 2): int
    {
        $total = 0;
        foreach (self::CATEGORIES as $cat) {
            for ($page = 1; $page <= $pagesPerCategory; $page++) {
                try {
                    $listings = $this->fetchPage($cat['url'], $page, $cat['type'], $cat['transaction_type']);
                    $total += $this->saveListings($agency, $listings);
                    if (empty($listings)) break; // pagina goală = stop
                    sleep(1); // respectă rate limiting
                } catch (\Throwable $e) {
                    Log::warning("Scrape999 error fetching {$cat['url']} page {$page}: " . $e->getMessage());
                    break;
                }
            }
        }
        return $total;
    }

    /**
     * Fetch o pagină de anunțuri de pe 999.md.
     */
    public function fetchPage(string $baseUrl, int $page = 1, string $type = 'apartment', string $transactionType = 'sale'): array
    {
        $url = $page > 1 ? $baseUrl . '?page=' . $page : $baseUrl;

        $response = $this->httpClient()->get($url);

        if (! $response->successful()) {
            Log::warning("Scrape999: HTTP {$response->status()} for {$url}");
            return [];
        }

        $html = $response->body();

        // Încearcă JSON embed (Next.js __NEXT_DATA__ sau similar)
        $fromJson = $this->extractFromJson($html, $type, $transactionType);
        if (! empty($fromJson)) {
            return $fromJson;
        }

        // Fallback: parse HTML
        return $this->extractFromHtml($html, $type, $transactionType);
    }

    /**
     * Extrage listinguri din JSON-ul embedded în pagină (script tags).
     */
    private function extractFromJson(string $html, string $type, string $transactionType): array
    {
        $listings = [];

        // Caută __NEXT_DATA__ (Next.js)
        if (preg_match('/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s', $html, $m)) {
            $data = json_decode($m[1], true);
            $adverts = $data['props']['pageProps']['adverts']
                ?? $data['props']['pageProps']['listings']
                ?? $data['props']['pageProps']['items']
                ?? [];

            foreach ($adverts as $item) {
                $parsed = $this->parseJsonItem($item, $type, $transactionType);
                if ($parsed) $listings[] = $parsed;
            }
        }

        // Caută orice script cu array de anunțuri
        if (empty($listings)) {
            preg_match_all('/<script[^>]*>(.*?)<\/script>/s', $html, $scripts);
            foreach ($scripts[1] as $script) {
                if (str_contains($script, '"adverts"') || str_contains($script, '"listings"')) {
                    if (preg_match('/"adverts"\s*:\s*(\[.*?\])/s', $script, $m)) {
                        $items = json_decode($m[1], true) ?? [];
                        foreach ($items as $item) {
                            $parsed = $this->parseJsonItem($item, $type, $transactionType);
                            if ($parsed) $listings[] = $parsed;
                        }
                    }
                }
            }
        }

        return $listings;
    }

    /**
     * Extrage listinguri din HTML cu DOMDocument.
     */
    private function extractFromHtml(string $html, string $type, string $transactionType): array
    {
        $listings = [];

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();

        $xpath = new \DOMXPath($doc);

        // Caută articole cu anunțuri (selectori comuni pe 999.md)
        $selectors = [
            '//article[contains(@class,"advert")]',
            '//div[contains(@class,"advert-item")]',
            '//li[contains(@class,"advert")]',
            '//div[contains(@class,"listing-item")]',
        ];

        $nodes = null;
        foreach ($selectors as $sel) {
            $nodes = $xpath->query($sel);
            if ($nodes && $nodes->length > 0) break;
        }

        if (! $nodes || $nodes->length === 0) {
            return [];
        }

        foreach ($nodes as $node) {
            try {
                $parsed = $this->parseHtmlNode($node, $xpath, $type, $transactionType);
                if ($parsed) $listings[] = $parsed;
            } catch (\Throwable $e) {
                // skip invalid node
            }
        }

        return $listings;
    }

    /**
     * Parsează un item JSON de la 999.md.
     */
    private function parseJsonItem(array $item, string $type, string $transactionType): ?array
    {
        $id = (string) ($item['id'] ?? $item['advert_id'] ?? '');
        if (! $id) return null;

        $price = $this->extractPrice($item['price'] ?? $item['price_value'] ?? null);
        $priceUnit = strtoupper($item['price_unit'] ?? $item['currency'] ?? 'EUR');
        $currency = in_array($priceUnit, ['EUR', 'USD', 'MDL']) ? $priceUnit : 'EUR';

        // Extrge features (999.md stochează date ca features)
        $features = $item['features'] ?? [];
        $area     = null;
        $rooms    = null;
        foreach ($features as $f) {
            $title = strtolower($f['title'] ?? '');
            if (str_contains($title, 'suprafat') || str_contains($title, 'площад')) {
                $area = (float) preg_replace('/[^\d.]/', '', $f['value'] ?? '');
            }
            if (str_contains($title, 'camer') || str_contains($title, 'комнат')) {
                $rooms = (int) preg_replace('/\D/', '', $f['value'] ?? '');
            }
        }

        return [
            'external_id'      => $id,
            'external_url'     => "https://999.md/ro/anunturi/{$id}",
            'title'            => $item['title'] ?? $item['name'] ?? 'Anunț 999.md',
            'price'            => $price,
            'currency'         => $currency,
            'area'             => $area,
            'rooms'            => $rooms,
            'city'             => $item['city'] ?? $item['location']['city'] ?? 'Chișinău',
            'district'         => $item['district'] ?? $item['location']['district'] ?? null,
            'images'           => $this->extractImages($item),
            'phone'            => $item['phone'] ?? null,
            'owner_type'       => isset($item['user_type']) && $item['user_type'] === 'agency' ? 'agency' : 'owner',
            'published_at'     => isset($item['posted']) ? date('Y-m-d H:i:s', strtotime($item['posted'])) : now()->toDateTimeString(),
            'type'             => $type,
            'transaction_type' => $transactionType,
            'raw_data'         => $item,
        ];
    }

    /**
     * Parsează un nod HTML DOM.
     */
    private function parseHtmlNode(\DOMNode $node, \DOMXPath $xpath, string $type, string $transactionType): ?array
    {
        // Extrage ID din link
        $linkNode = $xpath->query('.//a[@href]', $node)->item(0);
        $href = $linkNode?->getAttribute('href') ?? '';

        preg_match('/\/(\d+)(?:$|\?)/', $href, $idMatch);
        $externalId = $idMatch[1] ?? null;
        if (! $externalId) return null;

        $externalUrl = str_starts_with($href, 'http') ? $href : 'https://999.md' . $href;

        // Titlu
        $titleNode = $xpath->query('.//*[contains(@class,"title") or contains(@class,"name")]', $node)->item(0);
        $title = trim($titleNode?->textContent ?? 'Anunț 999.md');

        // Preț
        $priceNode = $xpath->query('.//*[contains(@class,"price")]', $node)->item(0);
        $priceText = $priceNode?->textContent ?? '';
        $price = $this->extractPrice($priceText);
        $currency = str_contains($priceText, '€') ? 'EUR' : (str_contains($priceText, '$') ? 'USD' : 'MDL');

        // Imagine
        $imgNode = $xpath->query('.//img', $node)->item(0);
        $imgSrc  = $imgNode?->getAttribute('src') ?? $imgNode?->getAttribute('data-src') ?? null;
        $images  = $imgSrc ? [$imgSrc] : [];

        // Locație (oraș, sector)
        $locNode = $xpath->query('.//*[contains(@class,"location") or contains(@class,"address")]', $node)->item(0);
        $locText = trim($locNode?->textContent ?? '');
        [$city, $district] = $this->parseLocation($locText);

        return [
            'external_id'      => $externalId,
            'external_url'     => $externalUrl,
            'title'            => $title,
            'price'            => $price,
            'currency'         => $currency,
            'area'             => null,
            'rooms'            => null,
            'city'             => $city,
            'district'         => $district,
            'images'           => $images,
            'phone'            => null,
            'owner_type'       => null,
            'published_at'     => now()->toDateTimeString(),
            'type'             => $type,
            'transaction_type' => $transactionType,
            'raw_data'         => [],
        ];
    }

    /**
     * Salvează listinguri în baza de date (upsert pe external_id).
     * Returnează numărul de înregistrări noi.
     */
    public function saveListings(Agency $agency, array $listings): int
    {
        $new = 0;

        foreach ($listings as $data) {
            if (empty($data['external_id'])) continue;

            $exists = ScrapedListing::where('source', '999md')
                ->where('external_id', $data['external_id'])
                ->exists();

            if (! $exists) {
                ScrapedListing::create(array_merge($data, [
                    'source'    => '999md',
                    'agency_id' => $agency->id,
                ]));
                $new++;
            }
        }

        return $new;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function extractPrice(mixed $value): ?float
    {
        if (is_numeric($value)) return (float) $value;
        $cleaned = preg_replace('/[^\d.]/', '', (string) $value);
        return $cleaned !== '' ? (float) $cleaned : null;
    }

    private function extractImages(array $item): array
    {
        $images = $item['images'] ?? $item['photos'] ?? [];
        if (is_array($images)) {
            return array_values(array_filter(array_map(fn($img) =>
                is_string($img) ? $img : ($img['url'] ?? $img['src'] ?? null),
            $images)));
        }
        return [];
    }

    private function parseLocation(string $text): array
    {
        $parts = array_map('trim', explode(',', $text));
        $city  = $parts[0] ?? 'Chișinău';
        $dist  = $parts[1] ?? null;
        return [$city ?: 'Chișinău', $dist];
    }
}
