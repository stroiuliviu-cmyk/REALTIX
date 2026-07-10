<?php

declare(strict_types=1);

namespace App\Infrastructure\Catalog;

use App\Domain\Catalog\Geo;
use App\Domain\Catalog\ListingCard;
use App\Domain\Catalog\ListingDetails;
use App\Domain\Catalog\ListingQuery;
use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

/**
 * Builds public ListingCard results from the catalog.
 *
 * Safety rules (Faza 1):
 *  - Internal: drop the BelongsToAgency global scope (cross-agency public search),
 *    only status='active', SELECT an explicit public whitelist (never agency_id,
 *    user_id, meta, source, scraped_listing_id, external_id, lat/long).
 *  - External: only rows with published_at, SELECT an explicit public whitelist
 *    (never raw_data, phone, extra_flags, agency_id, matched_at).
 *  - Both: exclude transaction_type exchange/buy.
 *  - city/district normalized towards the canonical Moldova vocabulary on output.
 *
 * Price intelligence (marketDeltaPct): computed LIVE, never read from the stored
 * `ai_valuation` column (that's a categorical label only — 'cheap'/'average'/
 * 'expensive' — with no persisted numeric estimate for scraped_listings, and a
 * private/LLM-guessed one for a small properties subset; see marketDeltaMedians()).
 * The reference is the median price/m² of a (type, transaction_type, city,
 * currency) bucket, pooled across BOTH properties and scraped_listings (same real
 * market), computed via a portable Eloquent unionAll + PHP median — NOT Postgres'
 * PERCENTILE_CONT — because the test suite runs on SQLite (see phpunit.xml).
 *
 * @phpstan-type MarketBucket array{median: float, count: int}
 */
final class PublicListingQuery
{
    /** transaction_type values never shown as results. */
    private const EXCLUDED_DEALS = ['exchange', 'buy'];

    /** Minimum comparable listings in a bucket before we trust its median. */
    private const MIN_BUCKET_SAMPLE = 5;

    /** |marketDeltaPct| above this is treated as a degenerate bucket, not shown. */
    private const MAX_ABS_DELTA_PCT = 60;

    /** Public whitelist for internal properties (NO private columns). */
    private const INTERNAL_COLUMNS = [
        'id', 'title', 'type', 'transaction_type', 'price', 'currency',
        'area_total', 'rooms', 'city', 'district', 'status', 'created_at',
    ];

    /** Public whitelist for external scraped listings (NO raw_data/phone/etc.). */
    private const EXTERNAL_COLUMNS = [
        'id', 'source', 'external_url', 'title', 'type', 'transaction_type',
        'price', 'currency', 'area', 'price_per_m2', 'rooms', 'city', 'district',
        'owner_type', 'images', 'published_at', 'created_at',
    ];

    /** Extra public-safe columns selected only for the details view. */
    private const INTERNAL_DETAIL_COLUMNS = [
        'description_ro', 'description_ru', 'description_en',
        'floor', 'floors_total', 'area_living',
    ];

    /** Extra public-safe columns for external details (still NO address/phone/raw_data). */
    private const EXTERNAL_DETAIL_COLUMNS = [
        'description', 'floor', 'floors_total', 'year_built',
        'condition', 'building_type', 'heating',
        'furnished', 'parking', 'balcony', 'elevator', 'pets_allowed', 'air_conditioning',
    ];

    /** Public site name (tool vocabulary) → stored source token. */
    private const SITE_TO_SOURCE = [
        '999.md' => '999md',
        'imobiliare.md' => 'imobiliare_md',
        'piata.md' => 'piata',
    ];

    /** @return list<ListingCard> */
    public function search(ListingQuery $query): array
    {
        $fetch = $query->offset() + $query->limit();

        $internalRows = ($query->wantsInternal() && $query->appliesToInternal())
            ? $this->internal($query, $fetch)
            : collect();
        $externalRows = $query->wantsExternal()
            ? $this->external($query, $fetch)
            : collect();

        // ONE batched median lookup for every distinct bucket in this page —
        // never per-row, so query cost doesn't grow with the number of cards.
        $buckets = [];
        foreach ($internalRows as $row) {
            $t = $this->bucketTuple($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area_total);
            if ($t !== null) {
                $buckets[] = $t;
            }
        }
        foreach ($externalRows as $row) {
            $t = $this->bucketTuple($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area);
            if ($t !== null) {
                $buckets[] = $t;
            }
        }
        $medians = $this->marketDeltaMedians($buckets);

        $cards = [];
        foreach ($internalRows as $row) {
            $cards[] = $this->mapInternal($row, $medians);
        }
        foreach ($externalRows as $row) {
            $cards[] = $this->mapExternal($row, $medians);
        }

        $cards = $this->sort($cards, $query->sort);

        return array_values(array_slice($cards, $query->offset(), $query->limit()));
    }

    /**
     * Extended public details for one listing — same visibility rules as
     * search (active / published / no excluded deals), same whitelists plus
     * the public-safe detail columns. Null when not found or not public.
     */
    public function find(string $source, string $id): ?ListingDetails
    {
        if (! ctype_digit($id)) {
            return null;
        }

        return $source === 'internal'
            ? $this->findInternal((int) $id)
            : $this->findExternal((int) $id);
    }

    private function findInternal(int $id): ?ListingDetails
    {
        $row = Property::query()
            ->withoutGlobalScope('agency')
            ->where('status', 'active')
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->whereKey($id)
            ->with(['media' => fn ($m) => $m
                ->select('id', 'property_id', 'path', 'thumb_path', 'is_cover', 'sort_order')
                ->orderByDesc('is_cover')->orderBy('sort_order')])
            ->select(array_merge(self::INTERNAL_COLUMNS, self::INTERNAL_DETAIL_COLUMNS))
            ->first();

        if ($row === null) {
            return null;
        }

        $tuple = $this->bucketTuple($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area_total);
        $medians = $this->marketDeltaMedians($tuple !== null ? [$tuple] : []);

        return new ListingDetails(
            card: $this->mapInternal($row, $medians),
            description: $row->description,     // locale accessor (ro fallback)
            floor: $row->floor !== null ? (int) $row->floor : null,
            floorsTotal: $row->floors_total !== null ? (int) $row->floors_total : null,
            areaLiving: $row->area_living !== null ? (float) $row->area_living : null,
        );
    }

    private function findExternal(int $id): ?ListingDetails
    {
        $row = ScrapedListing::query()
            ->whereNotNull('published_at')
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->whereKey($id)
            ->select(array_merge(self::EXTERNAL_COLUMNS, self::EXTERNAL_DETAIL_COLUMNS))
            ->first();

        if ($row === null) {
            return null;
        }

        $tuple = $this->bucketTuple($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area);
        $medians = $this->marketDeltaMedians($tuple !== null ? [$tuple] : []);

        return new ListingDetails(
            card: $this->mapExternal($row, $medians),
            description: $row->description,
            floor: $row->floor !== null ? (int) $row->floor : null,
            floorsTotal: $row->floors_total !== null ? (int) $row->floors_total : null,
            yearBuilt: $row->year_built !== null ? (int) $row->year_built : null,
            condition: $row->condition,
            buildingType: $row->building_type,
            heating: $row->heating,
            furnished: $row->furnished,
            parking: $row->parking,
            balcony: $row->balcony,
            elevator: $row->elevator,
            petsAllowed: $row->pets_allowed,
            airConditioning: $row->air_conditioning,
        );
    }

    /** @return \Illuminate\Support\Collection<int,Property> */
    private function internal(ListingQuery $query, int $fetch)
    {
        return Property::query()
            ->withoutGlobalScope('agency')          // cross-agency public search
            ->where('status', 'active')
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->where(fn (Builder $q) => $this->applyFilters($q, $query, 'area_total'))
            ->with(['media' => fn ($m) => $m
                ->select('id', 'property_id', 'path', 'thumb_path', 'is_cover', 'sort_order')
                ->orderByDesc('is_cover')->orderBy('sort_order')])
            ->select(self::INTERNAL_COLUMNS)
            ->orderByDesc('created_at')
            ->limit($fetch)
            ->get();
    }

    /** @return \Illuminate\Support\Collection<int,ScrapedListing> */
    private function external(ListingQuery $query, int $fetch)
    {
        return ScrapedListing::query()
            ->whereNotNull('published_at')          // "non-published" never appears
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->when($query->ownerType !== null, fn (Builder $q) => $q->where('owner_type', $query->ownerType))
            ->when(
                $query->site !== null && isset(self::SITE_TO_SOURCE[$query->site]),
                fn (Builder $q) => $q->where('source', self::SITE_TO_SOURCE[$query->site])
            )
            ->where(fn (Builder $q) => $this->applyFilters($q, $query, 'area'))
            ->select(self::EXTERNAL_COLUMNS)
            ->orderByDesc('published_at')
            ->limit($fetch)
            ->get();
    }

    /** @param string $areaColumn 'area_total' (internal) | 'area' (external) */
    private function applyFilters(Builder $q, ListingQuery $query, string $areaColumn): void
    {
        if ($query->district !== null && trim($query->district) !== '') {
            // Expanded needles so canonical input also matches dirty stored
            // variants (Riscani / Рышкановка / …).
            $needles = Geo::districtNeedles($query->district);
            $q->where(function (Builder $w) use ($needles) {
                foreach ($needles as $n) {
                    $w->orWhereRaw('LOWER(district) LIKE ?', ['%' . $n . '%']);
                }
            });
        }
        if ($query->city !== null && trim($query->city) !== '') {
            $needles = Geo::cityNeedles($query->city);
            $q->where(function (Builder $w) use ($needles) {
                foreach ($needles as $n) {
                    $w->orWhereRaw('LOWER(city) LIKE ?', ['%' . $n . '%']);
                }
            });
        }
        if ($query->rooms !== null) {
            $q->where('rooms', $query->rooms);
        }
        if ($query->roomsMin !== null) {
            $q->where('rooms', '>=', $query->roomsMin);
        }
        if ($query->roomsMax !== null) {
            $q->where('rooms', '<=', $query->roomsMax);
        }
        if ($query->areaMin !== null) {
            $q->where($areaColumn, '>=', $query->areaMin);
        }
        if ($query->areaMax !== null) {
            $q->where($areaColumn, '<=', $query->areaMax);
        }
        // Prices are compared in ONE currency, never converted: an explicit
        // currency filters by itself; a price bound without currency implies EUR.
        $currency = $query->currency
            ?? (($query->priceMin !== null || $query->priceMax !== null) ? 'EUR' : null);
        if ($currency !== null) {
            $q->where('currency', $currency);
        }
        if ($query->priceMin !== null) {
            $q->where('price', '>=', $query->priceMin);
        }
        if ($query->priceMax !== null) {
            $q->where('price', '<=', $query->priceMax);
        }
        if ($query->dealType !== null) {
            $q->whereIn('transaction_type', $this->dealTypeToTransactions($query->dealType));
        }
        if ($query->propertyType !== null) {
            $q->whereIn('type', $this->propertyTypeToStored($query->propertyType));
        }
        if ($query->text !== null && trim($query->text) !== '') {
            $needle = '%' . mb_strtolower(trim($query->text)) . '%';
            $q->where(function (Builder $w) use ($needle) {
                $w->whereRaw('LOWER(title) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(district) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(city) LIKE ?', [$needle]);
            });
        }
    }

    /** @param array<string,MarketBucket> $medians */
    private function mapInternal(Property $row, array $medians = []): ListingCard
    {
        $media = $row->media ?? collect();
        $photos = $media
            ->map(fn ($m) => $this->mediaUrl($m->path))
            ->filter()
            ->values()
            ->all();
        $cover = $media->firstWhere('is_cover', true) ?? $media->first();

        return new ListingCard(
            id: (string) $row->id,
            source: 'internal',
            title: (string) $row->title,
            dealType: $this->dealType($row->transaction_type),
            propertyType: $this->propertyType($row->type),
            price: $row->price !== null ? (float) $row->price : null,
            currency: $row->currency ?: 'EUR',
            city: Geo::normalizeCity($row->city) ?? 'Chișinău',
            district: Geo::normalizeDistrict($row->district),
            rooms: $row->rooms !== null ? (int) $row->rooms : null,
            area: $row->area_total !== null ? (float) $row->area_total : null,
            pricePerM2: $this->perM2($row->price, $row->area_total),
            rentPeriod: $this->rentPeriod($row->transaction_type),
            ownerType: 'agency',                    // internal listings = agency inventory
            sourceSite: null,
            externalUrl: null,
            photoCount: $media->count(),
            photoUrl: $cover ? ($this->mediaUrl($cover->path) ?: null) : null,
            photos: $photos,
            url: '/assistant/listing/internal/' . $row->id,
            isExternal: false,
            unavailable: false,
            postedAt: optional($row->created_at)?->toIso8601String(),
            marketDeltaPct: $this->marketDeltaFor($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area_total, $medians),
        );
    }

    /** @param array<string,MarketBucket> $medians */
    private function mapExternal(ScrapedListing $row, array $medians = []): ListingCard
    {
        // Rezolvă fiecare imagine la un URL utilizabil, la fel ca mapInternal:
        // căile locale ale scraper-ului (scraped/{id}/NN.jpg) primesc prefixul
        // discului public (/storage/…), iar URL-urile CDN externe (https://…) trec
        // neschimbate. Fără asta, calea relativă e randată brut de frontend → 404.
        $images = [];
        if (is_array($row->images)) {
            foreach ($row->images as $u) {
                if (is_string($u) && $u !== '' && ($url = $this->mediaUrl($u)) !== '') {
                    $images[] = $url;
                }
            }
        }

        return new ListingCard(
            id: (string) $row->id,
            source: 'external',
            title: (string) $row->title,
            dealType: $this->dealType($row->transaction_type),
            propertyType: $this->propertyType($row->type),
            price: $row->price !== null ? (float) $row->price : null,
            currency: $row->currency ?: 'EUR',
            city: Geo::normalizeCity($row->city) ?? 'Chișinău',
            district: Geo::normalizeDistrict($row->district),
            rooms: $row->rooms !== null ? (int) $row->rooms : null,
            area: $row->area !== null ? (float) $row->area : null,
            pricePerM2: $row->price_per_m2 !== null
                ? (int) round((float) $row->price_per_m2)
                : $this->perM2($row->price, $row->area),
            rentPeriod: $this->rentPeriod($row->transaction_type),
            ownerType: $row->owner_type ?: null,
            sourceSite: $this->sourceSite($row->source),
            externalUrl: $row->external_url,
            photoCount: count($images),
            photoUrl: $images[0] ?? null,
            photos: $images,
            url: '/assistant/listing/external/' . $row->id,
            isExternal: true,
            unavailable: false,
            postedAt: optional($row->published_at)?->toIso8601String()
                ?? optional($row->created_at)?->toIso8601String(),
            marketDeltaPct: $this->marketDeltaFor($row->type, $row->transaction_type, $row->city, $row->currency, $row->price, $row->area, $medians),
        );
    }

    /**
     * Bucket key components for a row, or null when the row can never anchor/join
     * a market comparison (missing type/transaction_type/city/currency, or no
     * usable price/area). Kept separate from marketDeltaFor() so search() can
     * collect the DISTINCT set of buckets to fetch before mapping any row.
     *
     * @return array{0:string,1:string,2:string,3:string}|null
     */
    private function bucketTuple(?string $type, ?string $tx, ?string $city, ?string $currency, mixed $price, mixed $area): ?array
    {
        if ($type === null || $type === '' || $tx === null || $tx === ''
            || $city === null || $city === '' || $currency === null || $currency === '') {
            return null;
        }
        $p = $price !== null ? (float) $price : 0.0;
        $a = $area !== null ? (float) $area : 0.0;
        if ($p <= 0 || $a <= 0) {
            return null;
        }

        return [$type, $tx, $city, $currency];
    }

    /**
     * Median price/m² per (type, transaction_type, city, currency) bucket, pooled
     * across properties + scraped_listings — the SAME real market, so a listing's
     * fair reference isn't split by source. ONE combined query (Eloquent unionAll)
     * regardless of how many buckets are requested; buckets under MIN_BUCKET_SAMPLE
     * are simply absent from the result (no exception — callers treat "missing" as
     * "no reliable reference"). Deliberately NOT Postgres' PERCENTILE_CONT (used by
     * the `ai:valuate-scraped` command): the test suite runs on SQLite, and median-
     * in-PHP over a handful of buckets is cheap at this catalog's scale (~40k rows).
     *
     * @param list<array{0:string,1:string,2:string,3:string}> $buckets
     * @return array<string,MarketBucket>
     */
    private function marketDeltaMedians(array $buckets): array
    {
        if ($buckets === []) {
            return [];
        }

        $unique = [];
        foreach ($buckets as $b) {
            $unique[implode('|', $b)] = $b;
        }
        $buckets = array_values($unique);

        $matchesAnyBucket = function (Builder $q) use ($buckets): void {
            $q->where(function (Builder $w) use ($buckets) {
                foreach ($buckets as [$type, $tx, $city, $currency]) {
                    $w->orWhere(function (Builder $b) use ($type, $tx, $city, $currency) {
                        $b->where('type', $type)
                            ->where('transaction_type', $tx)
                            ->where('city', $city)
                            ->where('currency', $currency);
                    });
                }
            });
        };

        $propertyRows = Property::query()
            ->withoutGlobalScope('agency')
            ->selectRaw('type, transaction_type, city, currency, (price * 1.0) / area_total as ppm')
            ->where('status', 'active')
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->where('price', '>', 0)->where('area_total', '>', 0)
            ->where($matchesAnyBucket);

        $scrapedRows = ScrapedListing::query()
            ->selectRaw('type, transaction_type, city, currency, (price * 1.0) / area as ppm')
            ->whereNotNull('published_at')
            ->whereNotIn('transaction_type', self::EXCLUDED_DEALS)
            ->where('price', '>', 0)->where('area', '>', 0)
            ->where($matchesAnyBucket);

        $rows = $propertyRows->unionAll($scrapedRows)->get();

        $grouped = [];
        foreach ($rows as $r) {
            $key = "{$r->type}|{$r->transaction_type}|{$r->city}|{$r->currency}";
            $grouped[$key][] = (float) $r->ppm;
        }

        $medians = [];
        foreach ($grouped as $key => $values) {
            if (count($values) < self::MIN_BUCKET_SAMPLE) {
                continue;
            }
            sort($values);
            $medians[$key] = ['median' => $this->median($values), 'count' => count($values)];
        }

        return $medians;
    }

    /** @param list<float> $sorted ascending */
    private function median(array $sorted): float
    {
        $n = count($sorted);
        $mid = intdiv($n, 2);

        return $n % 2 === 0 ? ($sorted[$mid - 1] + $sorted[$mid]) / 2 : $sorted[$mid];
    }

    /**
     * @param array<string,MarketBucket> $medians
     */
    private function marketDeltaFor(?string $type, ?string $tx, ?string $city, ?string $currency, mixed $price, mixed $area, array $medians): ?int
    {
        $tuple = $this->bucketTuple($type, $tx, $city, $currency, $price, $area);
        if ($tuple === null) {
            return null;
        }
        $bucket = $medians[implode('|', $tuple)] ?? null;
        if ($bucket === null || $bucket['median'] <= 0) {
            return null;
        }

        $ppm = ((float) $price) / ((float) $area);
        $delta = (int) round((($ppm - $bucket['median']) / $bucket['median']) * 100);

        return abs($delta) <= self::MAX_ABS_DELTA_PCT ? $delta : null;
    }

    /** @param list<ListingCard> $cards @return list<ListingCard> */
    private function sort(array $cards, string $sort): array
    {
        usort($cards, match ($sort) {
            ListingQuery::SORT_PRICE_ASC => fn (ListingCard $a, ListingCard $b) => ($a->price ?? PHP_FLOAT_MAX) <=> ($b->price ?? PHP_FLOAT_MAX),
            ListingQuery::SORT_PRICE_DESC => fn (ListingCard $a, ListingCard $b) => ($b->price ?? -1.0) <=> ($a->price ?? -1.0),
            default => fn (ListingCard $a, ListingCard $b) => strcmp((string) $b->postedAt, (string) $a->postedAt),
        });

        return $cards;
    }

    private function mediaUrl(?string $path): string
    {
        if ($path === null || $path === '') {
            return '';
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }

    private function perM2(mixed $price, mixed $area): ?int
    {
        $p = $price !== null ? (float) $price : 0.0;
        $a = $area !== null ? (float) $area : 0.0;

        return ($p > 0 && $a > 0) ? (int) round($p / $a) : null;
    }

    private function dealType(?string $transaction): string
    {
        return in_array($transaction, ['rent', 'inchiriere_zilnica'], true) ? 'rent' : 'sale';
    }

    private function rentPeriod(?string $transaction): ?string
    {
        return match ($transaction) {
            'inchiriere_zilnica' => 'day',
            'rent' => 'month',
            default => null,
        };
    }

    /** @return list<string> */
    private function dealTypeToTransactions(string $dealType): array
    {
        return $dealType === 'rent'
            ? ['rent', 'inchiriere_zilnica']
            : ['sale', 'new_build'];
    }

    /** @return list<string> */
    private function propertyTypeToStored(string $propertyType): array
    {
        return $propertyType === 'villa' ? ['villa', 'cottage'] : [$propertyType];
    }

    private function propertyType(?string $type): string
    {
        return match ($type) {
            'apartment' => 'apartment',
            'house' => 'house',
            'cottage', 'villa' => 'villa',
            'commercial' => 'commercial',
            'office' => 'office',
            'land' => 'land',
            'garage' => 'garage',
            default => 'apartment',
        };
    }

    private function sourceSite(?string $source): ?string
    {
        return match ($source) {
            '999md' => '999.md',
            'imobiliare_md' => 'imobiliare.md',
            'piata' => 'piata.md',
            default => null,
        };
    }
}
