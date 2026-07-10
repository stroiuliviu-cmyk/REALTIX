<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

use Throwable;

/**
 * Routes a {name, input} tool call (as produced by the model) to its executor.
 * Never lets an exception escape: unknown tools, invalid input and runtime
 * failures all come back as ToolResult::fail() with a message the model can
 * read and act on. This is the single entry point the future ChatService uses.
 */
final class ToolDispatcher
{
    public function __construct(
        private readonly SearchListingsTool $searchListings,
        private readonly GetListingDetailsTool $getListingDetails,
        private readonly SearchAgenciesTool $searchAgencies,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function run(string $name, array $input): ToolResult
    {
        try {
            return match ($name) {
                ToolRegistry::SEARCH_LISTINGS => ($this->searchListings)($input),
                ToolRegistry::GET_LISTING_DETAILS => ($this->getListingDetails)($input),
                ToolRegistry::SEARCH_AGENCIES => ($this->searchAgencies)($input),
                default => ToolResult::fail(
                    "Unealtă necunoscută: '{$name}'. Unelte disponibile: " . implode(', ', ToolRegistry::names()) . '.'
                ),
            };
        } catch (Throwable $e) {
            report($e);

            return ToolResult::fail("Execuția uneltei '{$name}' a eșuat: " . $e->getMessage());
        }
    }
}
