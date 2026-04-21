<?php

namespace App\Jobs;

use App\Models\Property;
use App\Services\AiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class EstimatePropertyPriceJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $propertyId) {}

    public function handle(AiService $ai): void
    {
        $property = Property::find($this->propertyId);
        if (! $property) {
            return;
        }

        $result = $ai->estimatePrice($property->toArray());

        $property->update([
            'ai_valuation' => $result['valuation'] ?? 'average',
            'meta'         => array_merge($property->meta ?? [], [
                'ai_price_min'    => $result['min'] ?? null,
                'ai_price_max'    => $result['max'] ?? null,
                'ai_price_reason' => $result['reason'] ?? null,
            ]),
        ]);
    }
}
