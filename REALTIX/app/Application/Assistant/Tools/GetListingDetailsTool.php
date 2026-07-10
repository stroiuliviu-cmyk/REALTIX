<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

use App\Domain\Catalog\Contracts\PublicCatalog;

/**
 * Executes the `get_listing_details` tool: validate → PublicCatalog::getListing
 * (same public-visibility rules as search) → extended public details. The
 * model payload omits the photos array (URLs are long and useless to the LLM);
 * the frontend gets the full DTO via `cards`.
 */
final class GetListingDetailsTool
{
    public function __construct(private readonly PublicCatalog $catalog)
    {
    }

    /** @param array<string,mixed> $input */
    public function __invoke(array $input): ToolResult
    {
        $errors = SchemaValidator::validate(ToolRegistry::schema(ToolRegistry::GET_LISTING_DETAILS), $input);
        if ($errors !== []) {
            return ToolResult::fail('Input invalid pentru get_listing_details: ' . implode(' ', $errors));
        }

        $details = $this->catalog->getListing($input['source'], $input['listing_id']);
        if ($details === null) {
            return ToolResult::fail(
                "Anunțul {$input['source']}/{$input['listing_id']} nu există sau nu (mai) este public. "
                . 'Folosește exact id-ul și source-ul dintr-un rezultat search_listings.'
            );
        }

        $forModel = $details->toArray();
        unset($forModel['photos']);

        return ToolResult::ok(forModel: $forModel, cards: [$details]);
    }
}
