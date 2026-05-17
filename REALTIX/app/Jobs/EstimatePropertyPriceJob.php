<?php

namespace App\Jobs;

use App\Models\Property;
use App\Models\User;
use App\Notifications\AiValuationChanged;
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
            'inchiriere_zilnica' => 'chirie zilnică', 'new_build' => 'construcție nouă',
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

        $oldMin = $property->meta['ai_price_min'] ?? null;
        $oldMax = $property->meta['ai_price_max'] ?? null;
        $newMin = isset($decoded['min']) ? (int) $decoded['min'] : null;
        $newMax = isset($decoded['max']) ? (int) $decoded['max'] : null;

        $property->update([
            'ai_valuation' => in_array($decoded['valuation'] ?? '', ['cheap', 'average', 'expensive'])
                ? $decoded['valuation'] : 'average',
            'meta' => array_merge($property->meta ?? [], [
                'ai_price_min'     => $newMin,
                'ai_price_max'     => $newMax,
                'ai_price_reason'  => $decoded['reason']        ?? null,
                'ai_confidence'    => $decoded['confidence']    ?? null,
                'ai_regional_avg'  => $decoded['regional_avg']  ?? null,
                'ai_deviation_pct' => $decoded['deviation_pct'] ?? 0,
            ]),
        ]);

        if ($oldMin && $newMin && $this->valuationChangedSignificantly($oldMin, $oldMax, $newMin, $newMax)) {
            $user = $this->userId ? User::find($this->userId) : null;
            $user?->notify(new AiValuationChanged($property->fresh(), $oldMin, $oldMax, $newMin, $newMax));
        }
    }

    private function valuationChangedSignificantly(int $oldMin, ?int $oldMax, int $newMin, ?int $newMax): bool
    {
        $oldMid = $oldMax ? ($oldMin + $oldMax) / 2 : $oldMin;
        $newMid = $newMax ? ($newMin + $newMax) / 2 : $newMin;
        if ($oldMid <= 0) return false;
        return abs(($newMid - $oldMid) / $oldMid) >= 0.05;
    }

    public function failed(Throwable $e): void
    {
        logger()->error("EstimatePropertyPriceJob failed for property {$this->propertyId}: {$e->getMessage()}");
    }
}
