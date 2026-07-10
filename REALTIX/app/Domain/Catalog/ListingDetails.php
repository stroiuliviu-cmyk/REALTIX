<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

use JsonSerializable;

/**
 * Extended PUBLIC detail view of one listing: the ListingCard plus the
 * public-safe descriptive fields (description, floors, condition, amenities).
 * Same privacy rules as the card — never contains phone/raw_data/extra_flags/
 * address/agency_id/user_id/meta. Fields missing for a source stay null
 * (e.g. internal properties have no year_built/condition columns).
 */
final class ListingDetails implements JsonSerializable
{
    public function __construct(
        public readonly ListingCard $card,
        public readonly ?string $description = null,
        public readonly ?int $floor = null,
        public readonly ?int $floorsTotal = null,
        public readonly ?float $areaLiving = null,
        public readonly ?int $yearBuilt = null,
        public readonly ?string $condition = null,      // new|renovated|needs_renovation|good
        public readonly ?string $buildingType = null,   // panel|brick|monolith
        public readonly ?string $heating = null,        // central|autonomous|none
        public readonly ?bool $furnished = null,
        public readonly ?bool $parking = null,
        public readonly ?bool $balcony = null,
        public readonly ?bool $elevator = null,
        public readonly ?bool $petsAllowed = null,
        public readonly ?bool $airConditioning = null,
    ) {
    }

    /** @return array<string,mixed> card fields + the extended public details */
    public function toArray(): array
    {
        return array_merge($this->card->toArray(), [
            'description' => $this->description,
            'floor' => $this->floor,
            'floorsTotal' => $this->floorsTotal,
            'areaLiving' => $this->areaLiving,
            'yearBuilt' => $this->yearBuilt,
            'condition' => $this->condition,
            'buildingType' => $this->buildingType,
            'heating' => $this->heating,
            'furnished' => $this->furnished,
            'parking' => $this->parking,
            'balcony' => $this->balcony,
            'elevator' => $this->elevator,
            'petsAllowed' => $this->petsAllowed,
            'airConditioning' => $this->airConditioning,
        ]);
    }

    /** @return array<string,mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
