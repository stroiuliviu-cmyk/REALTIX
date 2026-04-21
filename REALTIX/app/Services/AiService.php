<?php

namespace App\Services;

use App\Models\AiRequest;
use Illuminate\Support\Facades\Http;

class AiService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('realtix.ai.api_key');
        $this->model  = config('realtix.ai.model', 'claude-sonnet-4-6');
    }

    public function generateDescription(array $propertyData, string $locale = 'ro'): string
    {
        $localeNames = ['ro' => 'română', 'ru' => 'rusă', 'en' => 'engleză'];
        $lang = $localeNames[$locale] ?? 'română';

        $prompt = "Ești un agent imobiliar profesionist. Scrie o descriere atractivă și concisă (150-200 cuvinte) în limba {$lang} pentru această proprietate:\n\n"
            . "Tip: {$propertyData['type']}\n"
            . "Tranzacție: {$propertyData['transaction_type']}\n"
            . "Locație: {$propertyData['city']}" . ($propertyData['district'] ? ", {$propertyData['district']}" : '') . "\n"
            . "Preț: {$propertyData['price']} {$propertyData['currency']}\n"
            . "Suprafață: {$propertyData['area_total']} m²\n"
            . ($propertyData['rooms'] ? "Camere: {$propertyData['rooms']}\n" : '')
            . ($propertyData['floor'] ? "Etaj: {$propertyData['floor']}\n" : '')
            . "\nNu folosi clișee. Fii specific și profesionist.";

        return $this->complete($prompt, 'generate_description');
    }

    public function estimatePrice(array $propertyData): array
    {
        $prompt = "Ești un evaluator imobiliar pentru piața din Moldova. Pe baza datelor de mai jos, estimează prețul de piață echitabil:\n\n"
            . "Tip: {$propertyData['type']}\n"
            . "Tranzacție: {$propertyData['transaction_type']}\n"
            . "Locație: {$propertyData['city']}" . ($propertyData['district'] ? ", {$propertyData['district']}" : '') . "\n"
            . "Suprafață: {$propertyData['area_total']} m²\n"
            . ($propertyData['rooms'] ? "Camere: {$propertyData['rooms']}\n" : '')
            . ($propertyData['floor'] ? "Etaj: {$propertyData['floor']}\n" : '')
            . "\nRăspunde STRICT în format JSON: {\"min\": 50000, \"max\": 65000, \"currency\": \"EUR\", \"valuation\": \"cheap|average|expensive\", \"reason\": \"scurt motiv\"}\n"
            . "Nu adăuga text în afara JSON-ului.";

        $raw = $this->complete($prompt, 'estimate_price');

        $decoded = json_decode(trim($raw), true);
        if (! is_array($decoded)) {
            return ['min' => null, 'max' => null, 'currency' => 'EUR', 'valuation' => 'average', 'reason' => ''];
        }

        return $decoded;
    }

    public function classifyListing(array $listingData, array $comparables = []): string
    {
        $prompt = "Clasifică anunțul imobiliar de mai jos ca: cheap, average sau expensive față de piața din Moldova.\n\n"
            . "Titlu: {$listingData['title']}\n"
            . "Preț: {$listingData['price']} EUR\n"
            . "Suprafață: " . ($listingData['area'] ?? 'necunoscut') . " m²\n"
            . "Locație: " . ($listingData['city'] ?? '') . "\n"
            . "\nRăspunde cu un singur cuvânt: cheap, average sau expensive.";

        $result = trim($this->complete($prompt, 'classify_listing'));

        return in_array($result, ['cheap', 'average', 'expensive']) ? $result : 'average';
    }

    private function complete(string $prompt, string $type): string
    {
        $start = microtime(true);

        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => $this->model,
            'max_tokens' => 1024,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]);

        $elapsed = microtime(true) - $start;
        $body    = $response->json();

        $inputTokens  = $body['usage']['input_tokens'] ?? 0;
        $outputTokens = $body['usage']['output_tokens'] ?? 0;
        $costUsd      = ($inputTokens * 0.000003) + ($outputTokens * 0.000015);

        if (auth()->check()) {
            AiRequest::create([
                'agency_id'     => auth()->user()->agency_id,
                'user_id'       => auth()->id(),
                'type'          => $type,
                'input_tokens'  => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd'      => $costUsd,
                'duration_ms'   => (int) ($elapsed * 1000),
            ]);
        }

        return $body['content'][0]['text'] ?? '';
    }
}
