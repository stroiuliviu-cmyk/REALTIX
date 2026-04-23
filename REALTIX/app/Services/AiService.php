<?php

namespace App\Services;

use App\Models\AiRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiService
{
    private string $provider;
    private string $apiKey;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $this->provider = config('realtix.ai.provider', 'groq');
        $cfg = config("realtix.ai.{$this->provider}");

        $this->apiKey  = $cfg['api_key']  ?? '';
        $this->model   = $cfg['model']    ?? '';
        $this->baseUrl = $cfg['base_url'] ?? '';
    }

    // ── Legacy — queue jobs ─────────────────────────────────────────────────
    public function generateDescription(array $propertyData, string $locale = 'ro'): string
    {
        return $this->generateDescriptionFull($propertyData, $locale, 'detailed')['description'];
    }

    // ── Full sync — title + description + seo_tags ──────────────────────────
    public function generateDescriptionFull(array $data, string $locale = 'ro', string $style = 'detailed'): array
    {
        $localeNames = ['ro' => 'română', 'ru' => 'rusă', 'en' => 'engleză'];
        $lang = $localeNames[$locale] ?? 'română';

        $styleMap = [
            'short'    => 'Scurt și concis (80-100 cuvinte). Evidențiază 2-3 puncte forte principale.',
            'detailed' => 'Detaliat și complet (150-200 cuvinte). Include toate caracteristicile importante.',
            'formal'   => 'Ton formal și profesional (150-180 cuvinte). Limbaj imobiliar oficial.',
            'emotional'=> 'Ton emoțional și aspirațional (150-180 cuvinte). Descrie stilul de viață și beneficiile.',
        ];

        $meta     = is_array($data['meta'] ?? null) ? $data['meta'] : [];
        $features = array_values(array_filter([
            !empty($meta['furnished']) ? 'mobilat'         : null,
            !empty($meta['parking'])   ? 'parcare'         : null,
            !empty($meta['balcony'])   ? 'balcon/terasă'   : null,
            !empty($meta['ac'])        ? 'aer condiționat' : null,
            !empty($meta['elevator'])  ? 'lift'            : null,
        ]));

        $condition = match ($meta['condition'] ?? '') {
            'new'              => 'fără renovare / bloc nou',
            'renovated'        => 'cu renovare',
            'needs_renovation' => 'necesită renovare',
            default            => '',
        };

        $typeMap = [
            'apartment'  => 'Apartament', 'house'      => 'Casă',
            'commercial' => 'Spațiu comercial', 'land' => 'Teren',
        ];
        $txMap = [
            'sale'       => 'vânzare',  'rent'       => 'chirie',
            'rent_short' => 'chirie scurtă', 'new_build' => 'construcție nouă',
        ];

        $prompt = "Ești expert imobiliar din Moldova. Generează text de promovare în limba {$lang}.\n\n"
            . 'Tip: '      . ($typeMap[$data['type'] ?? ''] ?? ($data['type'] ?? 'necunoscut')) . "\n"
            . 'Operație: ' . ($txMap[$data['transaction_type'] ?? ''] ?? ($data['transaction_type'] ?? '')) . "\n"
            . 'Locație: '  . ($data['city'] ?? '') . (!empty($data['district']) ? ", {$data['district']}" : '') . "\n"
            . (!empty($data['area_total'])  ? "Suprafață: {$data['area_total']} m²\n"  : '')
            . (!empty($data['rooms'])       ? "Camere: {$data['rooms']}\n"              : '')
            . (!empty($data['floor'])       ? "Etaj: {$data['floor']}"
                . (!empty($data['floors_total']) ? "/{$data['floors_total']}" : '') . "\n" : '')
            . (!empty($condition)           ? "Stare: {$condition}\n"                  : '')
            . (count($features)             ? 'Dotări: ' . implode(', ', $features) . "\n" : '')
            . (!empty($data['price'])       ? "Preț: {$data['price']} " . ($data['currency'] ?? 'EUR') . "\n" : '')
            . "\nStil: " . ($styleMap[$style] ?? $styleMap['detailed']) . "\n"
            . "\nRăspunde EXCLUSIV în JSON valid (fără markdown, fără text înainte sau după):\n"
            . '{"title":"titlu atractiv 60-80 caractere","description":"corpul descrierii","seo_tags":["tag1","tag2","tag3","tag4","tag5"]}';

        $raw     = $this->complete($prompt, 'generate_description');
        preg_match('/\{.*\}/s', $raw, $m);
        $decoded = json_decode($m[0] ?? $raw, true);

        if (! is_array($decoded)) {
            return ['title' => '', 'description' => $raw, 'seo_tags' => []];
        }

        return [
            'title'       => $decoded['title']       ?? '',
            'description' => $decoded['description'] ?? '',
            'seo_tags'    => array_values(array_filter((array) ($decoded['seo_tags'] ?? []))),
        ];
    }

    // ── Legacy — queue jobs ─────────────────────────────────────────────────
    public function estimatePrice(array $propertyData): array
    {
        return $this->estimatePriceFull($propertyData);
    }

    // ── Full sync — rich price estimation ───────────────────────────────────
    public function estimatePriceFull(array $data): array
    {
        $typeMap = [
            'apartment'  => 'Apartament', 'house'      => 'Casă',
            'commercial' => 'Spațiu comercial', 'land' => 'Teren',
        ];
        $txMap = [
            'sale'       => 'vânzare',  'rent'       => 'chirie',
            'rent_short' => 'chirie scurtă', 'new_build' => 'construcție nouă',
        ];

        $prompt = "Ești evaluator imobiliar expert pentru piața din Moldova (Chișinău și regiuni).\n\n"
            . 'Tip: '      . ($typeMap[$data['type'] ?? ''] ?? ($data['type'] ?? '')) . "\n"
            . 'Operație: ' . ($txMap[$data['transaction_type'] ?? ''] ?? ($data['transaction_type'] ?? '')) . "\n"
            . 'Locație: '  . ($data['city'] ?? '') . (!empty($data['district']) ? ", {$data['district']}" : '') . "\n"
            . (!empty($data['area_total']) ? "Suprafață: {$data['area_total']} m²\n" : '')
            . (!empty($data['rooms'])      ? "Camere: {$data['rooms']}\n"            : '')
            . (!empty($data['floor'])      ? "Etaj: {$data['floor']}\n"              : '')
            . (!empty($data['price'])      ? "Preț solicitat: {$data['price']} " . ($data['currency'] ?? 'EUR') . "\n" : '')
            . "\nRăspunde EXCLUSIV în JSON valid (fără markdown, fără text extra):\n"
            . '{"min":50000,"max":65000,"currency":"EUR","valuation":"cheap","reason":"Motiv scurt.","confidence":85,"regional_avg":62000,"deviation_pct":-6}'
            . "\n\nReguli: valuation=cheap (sub piață), average (la piață), expensive (peste piață)."
            . " deviation_pct=abatere % față de regional_avg; 0 dacă nu există preț solicitat.";

        $raw     = $this->complete($prompt, 'estimate_price');
        preg_match('/\{.*\}/s', $raw, $m);
        $decoded = json_decode($m[0] ?? $raw, true);

        if (! is_array($decoded)) {
            return [
                'min' => null, 'max' => null, 'currency' => 'EUR',
                'valuation' => 'average', 'reason' => '',
                'confidence' => 75, 'regional_avg' => null, 'deviation_pct' => 0,
            ];
        }

        return [
            'min'           => $decoded['min']          ?? null,
            'max'           => $decoded['max']          ?? null,
            'currency'      => $decoded['currency']     ?? 'EUR',
            'valuation'     => in_array($decoded['valuation'] ?? '', ['cheap', 'average', 'expensive'])
                                ? $decoded['valuation'] : 'average',
            'reason'        => $decoded['reason']       ?? '',
            'confidence'    => (int)   ($decoded['confidence']    ?? 75),
            'regional_avg'  => $decoded['regional_avg'] ?? null,
            'deviation_pct' => (float) ($decoded['deviation_pct'] ?? 0),
        ];
    }

    public function classifyListing(array $listingData): string
    {
        $prompt = "Clasifică anunțul: cheap, average sau expensive față de piața din Moldova.\n"
            . "Titlu: {$listingData['title']}\nPreț: {$listingData['price']} EUR\n"
            . 'Suprafață: ' . ($listingData['area'] ?? '?') . " m²\nLocație: " . ($listingData['city'] ?? '') . "\n"
            . 'Răspunde cu un singur cuvânt: cheap, average sau expensive.';

        $result = trim($this->complete($prompt, 'classify_listing'));

        return in_array($result, ['cheap', 'average', 'expensive']) ? $result : 'average';
    }

    // ── Core HTTP caller — suport Groq (gratuit) și Anthropic ──────────────
    public function complete(string $prompt, string $type, int $userId = 0, ?int $agencyId = null): string
    {
        if (empty($this->apiKey)) {
            $label = $this->provider === 'groq' ? 'GROQ_API_KEY (gratuit: console.groq.com)' : 'ANTHROPIC_API_KEY';
            throw new RuntimeException(
                "Cheia AI nu este configurată în .env. Adaugă: {$label}"
            );
        }

        $start = microtime(true);

        try {
            $response = $this->provider === 'groq'
                ? $this->callGroq($prompt)
                : $this->callAnthropic($prompt);
        } catch (RequestException $e) {
            throw new RuntimeException("Conexiune eșuată la API AI: {$e->getMessage()}", 0, $e);
        }

        if ($response->status() === 401) {
            throw new RuntimeException("Cheie API invalidă (401). Verifică {$this->providerKeyName()} în .env.");
        }
        if ($response->status() === 429) {
            throw new RuntimeException('Limita de cereri AI a fost depășită (429). Încearcă din nou în câteva momente.');
        }
        if ($response->failed()) {
            $msg = $response->json('error.message') ?? $response->body();
            throw new RuntimeException("Eroare API ({$response->status()}): {$msg}");
        }

        $body    = $response->json();
        $text    = $this->extractText($body);
        $elapsed = microtime(true) - $start;

        [$inputTokens, $outputTokens] = $this->extractTokens($body);
        $costUsd = $this->provider === 'groq'
            ? 0.0   // Groq gratuit
            : ($inputTokens * 0.000003) + ($outputTokens * 0.000015);

        $resolvedUserId   = $userId   ?: (auth()->id()              ?? 0);
        $resolvedAgencyId = $agencyId ?? (auth()->user()?->agency_id ?? null);

        if ($resolvedUserId && $resolvedAgencyId) {
            AiRequest::create([
                'agency_id'     => $resolvedAgencyId,
                'user_id'       => $resolvedUserId,
                'type'          => $type,
                'input_tokens'  => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd'      => $costUsd,
                'duration_ms'   => (int) ($elapsed * 1000),
            ]);
        }

        return $text;
    }

    // ── Private: Groq call (OpenAI-compatible) ──────────────────────────────
    private function callGroq(string $prompt)
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type'  => 'application/json',
        ])
        ->timeout(60)
        ->post($this->baseUrl, [
            'model'       => $this->model,
            'max_tokens'  => config('realtix.ai.max_tokens', 1024),
            'temperature' => 0.7,
            'messages'    => [['role' => 'user', 'content' => $prompt]],
        ]);
    }

    // ── Private: Anthropic call ─────────────────────────────────────────────
    private function callAnthropic(string $prompt)
    {
        return Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])
        ->timeout(60)
        ->post($this->baseUrl, [
            'model'      => $this->model,
            'max_tokens' => config('realtix.ai.max_tokens', 1024),
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]);
    }

    // ── Private: extract text from response based on provider ───────────────
    private function extractText(array $body): string
    {
        if ($this->provider === 'groq') {
            return $body['choices'][0]['message']['content'] ?? '';
        }
        return $body['content'][0]['text'] ?? '';
    }

    // ── Private: extract token counts ───────────────────────────────────────
    private function extractTokens(array $body): array
    {
        if ($this->provider === 'groq') {
            return [
                $body['usage']['prompt_tokens']     ?? 0,
                $body['usage']['completion_tokens'] ?? 0,
            ];
        }
        return [
            $body['usage']['input_tokens']  ?? 0,
            $body['usage']['output_tokens'] ?? 0,
        ];
    }

    private function providerKeyName(): string
    {
        return $this->provider === 'groq' ? 'GROQ_API_KEY' : 'ANTHROPIC_API_KEY';
    }
}
