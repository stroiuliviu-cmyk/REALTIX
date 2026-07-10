<?php

declare(strict_types=1);

namespace App\Infrastructure\Catalog;

use App\Domain\Catalog\AgencyCard;
use App\Domain\Catalog\Geo;
use App\Models\Agency;
use App\Models\Property;

/**
 * Builds public AgencyCard results. city + specializations are DERIVED from the
 * agency's active public listings (no dedicated columns exist). Never exposes
 * agencies.settings (API keys), billing or contact data.
 */
final class PublicAgencyQuery
{
    private const EXCLUDED_DEALS = ['exchange', 'buy'];

    /** Stored property type → public specialization label (ro). */
    private const TYPE_LABELS = [
        'apartment' => 'Apartamente',
        'house' => 'Case',
        'cottage' => 'Vile',
        'villa' => 'Vile',
        'commercial' => 'Comercial',
        'office' => 'Birouri',
        'land' => 'Terenuri',
        'garage' => 'Garaje',
    ];

    /**
     * @param string|null $city filter on the DERIVED city (most-frequent, normalized)
     * @param string|null $specialization property-type token (apartment|house|villa|…)
     * @return list<AgencyCard>
     */
    public function search(
        ?string $text = null,
        ?string $city = null,
        ?string $specialization = null,
        int $limit = 10,
    ): array {
        $limit = max(1, min($limit, 50));
        $wantCity = Geo::normalizeCity($city);
        $wantLabel = $specialization !== null ? (self::TYPE_LABELS[$specialization] ?? null) : null;

        $agencies = Agency::query()
            ->when(
                $text !== null && trim($text) !== '',
                fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%' . mb_strtolower(trim((string) $text)) . '%'])
            )
            ->select('id', 'name', 'slug', 'logo_path')   // public-only
            ->orderBy('name')
            ->get();

        $cards = [];
        foreach ($agencies as $agency) {
            $base = Property::query()
                ->withoutGlobalScope('agency')
                ->where('agency_id', $agency->id)
                ->where('status', 'active')
                ->whereNotIn('transaction_type', self::EXCLUDED_DEALS);

            $count = (clone $base)->count();
            if ($count === 0) {
                continue; // public directory: only agencies that have public listings
            }

            $agencyCity = (clone $base)
                ->whereNotNull('city')
                ->groupBy('city')
                ->orderByRaw('COUNT(*) DESC')
                ->limit(1)
                ->value('city');

            $types = (clone $base)
                ->whereNotNull('type')
                ->distinct()
                ->pluck('type')
                ->all();

            $card = new AgencyCard(
                id: (string) $agency->id,
                name: (string) $agency->name,
                city: Geo::normalizeCity(is_string($agencyCity) ? $agencyCity : null),
                specializations: $this->specializations($types),
                publicListingsCount: $count,
                url: '/assistant/agency/' . $agency->id,
            );

            // Post-derivation filters (city/specializations only exist as derived values).
            if ($wantCity !== null && ! Geo::isSameCity($card->city, $wantCity)) {
                continue;
            }
            if ($wantLabel !== null && ! in_array($wantLabel, $card->specializations, true)) {
                continue;
            }

            $cards[] = $card;

            if (count($cards) >= $limit) {
                break;
            }
        }

        return $cards;
    }

    /**
     * @param list<string> $types
     * @return list<string>
     */
    private function specializations(array $types): array
    {
        $out = [];
        foreach ($types as $type) {
            $label = self::TYPE_LABELS[$type] ?? null;
            if ($label !== null && ! in_array($label, $out, true)) {
                $out[] = $label;
            }
        }

        return $out;
    }
}
