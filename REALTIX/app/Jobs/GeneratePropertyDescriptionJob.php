<?php

namespace App\Jobs;

use App\Models\Property;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class GeneratePropertyDescriptionJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(
        public readonly int    $propertyId,
        public readonly string $locale  = 'ro',
        public readonly int    $userId  = 0,
    ) {}

    public function handle(AiService $ai): void
    {
        $property = Property::find($this->propertyId);
        if (! $property) {
            return;
        }

        // Resolve agency_id for logging — queue has no auth context
        $agencyId = $property->agency_id
            ?? ($this->userId ? User::find($this->userId)?->agency_id : null);

        $description = $ai->complete(
            $this->buildPrompt($property),
            'generate_description',
            $this->userId,
            $agencyId,
        );

        $column = "description_{$this->locale}";
        $property->update([$column => $description]);
    }

    public function failed(Throwable $e): void
    {
        logger()->error("GeneratePropertyDescriptionJob failed for property {$this->propertyId}: {$e->getMessage()}");
    }

    private function buildPrompt(Property $property): string
    {
        $localeNames = ['ro' => 'română', 'ru' => 'rusă', 'en' => 'engleză'];
        $lang = $localeNames[$this->locale] ?? 'română';

        return "Ești un agent imobiliar profesionist. Scrie o descriere atractivă și concisă (150-200 cuvinte) "
            . "în limba {$lang} pentru această proprietate:\n\n"
            . "Tip: {$property->type}\n"
            . "Tranzacție: {$property->transaction_type}\n"
            . "Locație: {$property->city}" . ($property->district ? ", {$property->district}" : '') . "\n"
            . ($property->price      ? "Preț: {$property->price} {$property->currency}\n" : '')
            . ($property->area_total ? "Suprafață: {$property->area_total} m²\n" : '')
            . ($property->rooms      ? "Camere: {$property->rooms}\n" : '')
            . ($property->floor      ? "Etaj: {$property->floor}\n" : '')
            . "\nNu folosi clișee. Fii specific și profesionist.";
    }
}
