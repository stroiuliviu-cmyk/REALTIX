<?php

namespace App\Jobs;

use App\Models\Property;
use App\Services\AiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GeneratePropertyDescriptionJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int    $propertyId,
        public readonly string $locale = 'ro',
        public readonly int    $userId = 0,
    ) {}

    public function handle(AiService $ai): void
    {
        $property = Property::find($this->propertyId);
        if (! $property) {
            return;
        }

        $description = $ai->generateDescription($property->toArray(), $this->locale);

        $column = "description_{$this->locale}";
        $property->update([$column => $description]);
    }
}
