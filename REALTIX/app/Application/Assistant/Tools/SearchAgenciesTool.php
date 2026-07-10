<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

use App\Domain\Catalog\AgencyCard;
use App\Domain\Catalog\Contracts\PublicCatalog;

/**
 * Executes the `search_agencies` tool: validate → PublicCatalog::searchAgencies
 * (directory of agencies WITH public listings; city/specializations are derived
 * from their active inventory).
 */
final class SearchAgenciesTool
{
    public function __construct(private readonly PublicCatalog $catalog)
    {
    }

    /** @param array<string,mixed> $input */
    public function __invoke(array $input): ToolResult
    {
        $errors = SchemaValidator::validate(ToolRegistry::schema(ToolRegistry::SEARCH_AGENCIES), $input);
        if ($errors !== []) {
            return ToolResult::fail('Input invalid pentru search_agencies: ' . implode(' ', $errors));
        }

        $cards = $this->catalog->searchAgencies(
            text: $input['query'] ?? null,
            city: $input['city'] ?? null,          // normalized inside the catalog
            specialization: $input['specialization'] ?? null,
        );

        return ToolResult::ok(
            forModel: [
                'count' => count($cards),
                'results' => array_map(fn (AgencyCard $c) => $c->toArray(), $cards),
            ],
            cards: $cards,
        );
    }
}
