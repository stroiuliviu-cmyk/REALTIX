<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

use JsonSerializable;

/**
 * Public representation of an agency. Mirrors the front-end `AgencyCard` type.
 * Never contains private fields (settings/API keys, billing, contact data).
 */
final class AgencyCard implements JsonSerializable
{
    /**
     * @param list<string> $specializations
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly ?string $city,
        public readonly array $specializations,
        public readonly int $publicListingsCount,
        public readonly string $url,
    ) {
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'city' => $this->city,
            'specializations' => $this->specializations,
            'publicListingsCount' => $this->publicListingsCount,
            'url' => $this->url,
        ];
    }

    /** @return array<string,mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
