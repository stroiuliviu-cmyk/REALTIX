<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

use App\Domain\Catalog\Contracts\PublicCatalog;
use App\Domain\Catalog\Geo;
use App\Domain\Catalog\ListingCard;
use App\Domain\Catalog\ListingQuery;

/**
 * Executes the `search_listings` tool: validate → normalize geo → build the
 * Domain ListingQuery → PublicCatalog (via contract) → compact result for the
 * model + full cards for the frontend. Hard-capped at ≤10 by ListingQuery.
 */
final class SearchListingsTool
{
    public function __construct(private readonly PublicCatalog $catalog)
    {
    }

    /** @param array<string,mixed> $input */
    public function __invoke(array $input): ToolResult
    {
        $errors = SchemaValidator::validate(ToolRegistry::schema(ToolRegistry::SEARCH_LISTINGS), $input);
        if ($errors !== []) {
            return ToolResult::fail('Input invalid pentru search_listings: ' . implode(' ', $errors));
        }

        $query = new ListingQuery(
            source: $input['source'] ?? ListingQuery::SOURCE_ANY,
            district: Geo::normalizeDistrict($input['district'] ?? null),
            dealType: $input['deal_type'] ?? null,
            propertyType: $input['property_type'] ?? null,
            sort: $this->sort($input['sort'] ?? null),
            page: $input['page'] ?? 1,
            city: Geo::normalizeCity($input['location'] ?? null),
            priceMin: isset($input['price_min']) ? (float) $input['price_min'] : null,
            priceMax: isset($input['price_max']) ? (float) $input['price_max'] : null,
            currency: $input['currency'] ?? null,
            roomsMin: $input['rooms_min'] ?? null,
            roomsMax: $input['rooms_max'] ?? null,
            areaMin: isset($input['area_min']) ? (float) $input['area_min'] : null,
            areaMax: isset($input['area_max']) ? (float) $input['area_max'] : null,
            ownerType: $input['owner_type'] ?? null,
            site: $input['site'] ?? null,
        );

        $cards = $this->catalog->searchListings($query);

        return ToolResult::ok(
            forModel: [
                'page' => $query->page,
                'count' => count($cards),
                'results' => array_map(fn (ListingCard $c) => $this->compact($c), $cards),
            ],
            cards: $cards,
        );
    }

    /** Tool sort vocabulary → Domain sort (no text ranking yet: relevance ≈ newest). */
    private function sort(?string $sort): string
    {
        return match ($sort) {
            'price_asc' => ListingQuery::SORT_PRICE_ASC,
            'price_desc' => ListingQuery::SORT_PRICE_DESC,
            default => ListingQuery::SORT_NEWEST, // relevance | date_desc | null
        };
    }

    /** Minimal per-listing payload for the model (id/source enough to drill down). */
    private function compact(ListingCard $c): array
    {
        return [
            'id' => $c->id,
            'source' => $c->source,
            'title' => $c->title,
            'dealType' => $c->dealType,
            'price' => $c->price,
            'currency' => $c->currency,
            'city' => $c->city,
            'district' => $c->district,
            'rooms' => $c->rooms,
            'area' => $c->area,
            'url' => $c->url,
            // % vs media pieței pe m² în zonă (aceeași valută); null = fără referință
            // fiabilă. Nu inventa acest procent când lipsește — vezi SystemPrompt.
            'marketDeltaPct' => $c->marketDeltaPct,
        ];
    }
}
