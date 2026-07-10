<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

use JsonSerializable;

/**
 * Uniform result of a tool execution.
 *
 *  - `forModel`: the COMPACT payload serialized back to the LLM (minimal
 *    fields — keeps the token cost low and leaves no room for private data).
 *  - `cards`:   the full public DTOs (ListingCard/ListingDetails/AgencyCard)
 *    for the frontend to render richly.
 *  - failures are values, not exceptions: `ok=false` + a clear message the
 *    model can read and correct itself against.
 */
final class ToolResult implements JsonSerializable
{
    /**
     * @param array<string,mixed> $forModel
     * @param list<object> $cards
     */
    private function __construct(
        public readonly bool $ok,
        public readonly array $forModel,
        public readonly array $cards,
        public readonly ?string $error,
    ) {
    }

    /** @param array<string,mixed> $forModel @param list<object> $cards */
    public static function ok(array $forModel, array $cards = []): self
    {
        return new self(true, $forModel, $cards, null);
    }

    public static function fail(string $error): self
    {
        return new self(false, [], [], $error);
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'ok' => $this->ok,
            'error' => $this->error,
            'for_model' => $this->forModel,
            'cards' => array_map(
                fn (object $c) => method_exists($c, 'toArray') ? $c->toArray() : (array) $c,
                $this->cards,
            ),
        ];
    }

    /** @return array<string,mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
