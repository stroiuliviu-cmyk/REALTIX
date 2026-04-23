<?php

namespace App\Jobs;

use App\Models\Property;
use App\Services\AiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class EstimatePropertyPriceJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(
        public readonly int $propertyId,
        public readonly int $userId = 0,
    ) {}

    public function handle(AiService $ai): void
    {
        $property = Property::find($this->propertyId);
        if (! $property) {
            return;
        }

        $agencyId = $property->agency_id;

        $typeMap = [
            'apartment'  => 'Apartament', 'house'       => 'Casă',
            'commercial' => 'Spațiu comercial', 'land'  => 'Teren',
        ];
        $txMap = [
            'sale'       => 'vânzare', 'rent'       => 'chirie',
            'rent_short' => 'chirie scurtă', 'new_build' => 'construcție nouă',
        ];

        $prompt = "Ești evaluator imobiliar expert pentru piața din Moldova (Chișinău și regiuni). "
            . "Analizează proprietatea și estimează prețul de piață realist.\n\n"
            . 'Tip: '      . ($typeMap[$property->type]             ?? $property->type)             . "\n"
            . 'Operație: ' . ($txMap[$property->transaction_type]   ?? $property->transaction_type) . "\n"
            . 'Locație: '  . $property->city . ($property->district ? ", {$property->district}" : '') . "\n"
            . ($property->area_total ? "Suprafață: {$property->area_total} m²\n" : '')
            . ($property->rooms      ? "Camere: {$property->rooms}\n"                : '')
            . ($property->floor      ? "Etaj: {$property->floor}\n"                  : '')
            . ($property->price      ? "Prețul solicitat: {$property->price} {$property->currency}\n" : '')
            . "\nRăspunde EXCLUSIV în JSON valid (fără text extra, fără markdown):\n"
            . '{"min":50000,"max":65000,"currency":"EUR","valuation":"cheap","reason":"Scurt motiv.",'
            . '"confidence":85,"regional_avg":62000,"deviation_pct":-6}'
            . "\n\nNOTE: valuation = cheap (sub piață), average (la piață), expensive (peste piață).";

        $raw     = $ai->complete($prompt, 'estimate_price', $this->userId, $agencyId);
        preg_match('/\{.*\}/s', $raw, $matches);
        $decoded = json_decode($matches[0] ?? $raw, true);

        if (! is_array($decoded)) {
            return;
        }

        $property->update([
            'ai_valuation' => in_array($decoded['valuation'] ?? '', ['cheap', 'average', 'expensive'])
                ? $decoded['valuation'] : 'average',
            'meta' => array_merge($property->meta ?? [], [
                'ai_price_min'     => $decoded['min']           ?? null,
                'ai_price_max'     => $decoded['max']           ?? null,
                'ai_price_reason'  => $decoded['reason']        ?? null,
                'ai_confidence'    => $decoded['confidence']    ?? null,
                'ai_regional_avg'  => $decoded['regional_avg']  ?? null,
                'ai_deviation_pct' => $decoded['deviation_pct'] ?? 0,
            ]),
        ]);
    }

    public function failed(Throwable $e): void
    {
        logger()->error("EstimatePropertyPriceJob failed for property {$this->propertyId}: {$e->getMessage()}");
    }
}
