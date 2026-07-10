<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

use JsonSerializable;

/**
 * Public, contact-free representation of a listing (internal property OR external
 * scraped listing). Mirrors the front-end `ListingCard` type. Never contains
 * private/contact fields (phone, raw_data, agency_id, user_id, meta, …).
 *
 * @phpstan-type Source 'internal'|'external'
 */
final class ListingCard implements JsonSerializable
{
    /**
     * @param list<string> $photos
     */
    public function __construct(
        public readonly string $id,
        public readonly string $source,        // internal|external
        public readonly string $title,
        public readonly string $dealType,      // sale|rent
        public readonly string $propertyType,  // apartment|house|villa|commercial|land|office|garage
        public readonly ?float $price,
        public readonly string $currency,      // EUR|MDL|USD
        public readonly string $city,
        public readonly ?string $district,
        public readonly ?int $rooms,
        public readonly ?float $area,
        public readonly ?int $pricePerM2,
        public readonly ?string $rentPeriod,   // month|day|null
        public readonly ?string $ownerType,    // owner|agency|null
        public readonly ?string $sourceSite,   // 999.md|imobiliare.md|piata.md|null
        public readonly ?string $externalUrl,
        public readonly int $photoCount,
        public readonly ?string $photoUrl,
        public readonly array $photos,
        public readonly string $url,
        public readonly bool $isExternal,
        public readonly bool $unavailable,
        public readonly ?string $postedAt,
        /**
         * Diferența % față de medianul preț/m² al pieței (bucket: tip+tranzacție+
         * oraș+valută, internal+external unificat). Pozitiv = peste piață,
         * negativ = sub piață. Null când bucket-ul are <5 comparabile, |delta|
         * depășește pragul de siguranță, sau lipsește preț/suprafață/valută.
         */
        public readonly ?int $marketDeltaPct = null,
    ) {
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'source' => $this->source,
            'title' => $this->title,
            'dealType' => $this->dealType,
            'propertyType' => $this->propertyType,
            'price' => $this->price,
            'currency' => $this->currency,
            'city' => $this->city,
            'district' => $this->district,
            'rooms' => $this->rooms,
            'area' => $this->area,
            'pricePerM2' => $this->pricePerM2,
            'rentPeriod' => $this->rentPeriod,
            'ownerType' => $this->ownerType,
            'sourceSite' => $this->sourceSite,
            'externalUrl' => $this->externalUrl,
            'photoCount' => $this->photoCount,
            'photoUrl' => $this->photoUrl,
            'photos' => $this->photos,
            'url' => $this->url,
            'isExternal' => $this->isExternal,
            'unavailable' => $this->unavailable,
            'postedAt' => $this->postedAt,
            'marketDeltaPct' => $this->marketDeltaPct,
        ];
    }

    /** @return array<string,mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
