<?php

/*
|--------------------------------------------------------------------------
| Asistentul AI — configurare LLM
|--------------------------------------------------------------------------
|
| Modelele și limitele folosite de AnthropicClient/ChatService. Cheia API
| NU stă aici — e în config/services.php ('anthropic.api_key'), din env.
|
| model_intent  — model rapid/ieftin pentru clasificarea intenției (Haiku).
| model_answer  — modelul principal de răspuns + tool use (Sonnet).
*/

return [

    // Furnizorul LLM activ: 'anthropic' (implicit) sau 'groq' (compatibil OpenAI,
    // gratuit pentru testare). Binding-ul LlmClient se face după această valoare.
    'provider' => env('ASSISTANT_LLM_PROVIDER', 'anthropic'),

    'model_intent' => env('ASSISTANT_MODEL_INTENT', 'claude-haiku-4-5'),
    'model_answer' => env('ASSISTANT_MODEL_ANSWER', 'claude-sonnet-5'),

    'max_tokens' => (int) env('ASSISTANT_MAX_TOKENS', 2048),

    // Cotă gratuită (TZ §4.10): rezultate unice gratuite per owner. Se numără
    // doar OBIECTUL UNIC nou; revizualizarea nu costă. La epuizare → paywall.
    'free_result_limit' => (int) env('ASSISTANT_FREE_RESULTS', 50),

    // Peste acest prag (estimat, ~4 caractere/token) istoricul se compactează:
    // tool_result-urile vechi devin „(rezultate omise)", apoi se taie cele mai vechi.
    'history_token_limit' => (int) env('ASSISTANT_HISTORY_TOKEN_LIMIT', 12000),

    // Mesaje permise per sesiune anonimă (cheie owner_token+IP). La depășire,
    // endpoint-ul scrie UN eveniment SSE {code:'rate_limited'} — nu un 429 brut.
    'anon_msg_limit' => (int) env('ASSISTANT_ANON_MSG_LIMIT', 20),
    // Fereastra limitei, în secunde (implicit 24h ≈ „pe sesiune").
    'anon_msg_window' => (int) env('ASSISTANT_ANON_MSG_WINDOW', 86400),

    // Versiunea API-ului Anthropic (header `anthropic-version`).
    'anthropic_version' => env('ASSISTANT_ANTHROPIC_VERSION', '2023-06-01'),

    // Timeout HTTP per request (secunde) — stream-urile lungi au nevoie de spațiu.
    'timeout' => (int) env('ASSISTANT_LLM_TIMEOUT', 120),

    'retry' => [
        // Numărul total de încercări (1 = fără retry). Retry DOAR pe 429/5xx/rețea.
        'max_attempts' => (int) env('ASSISTANT_LLM_RETRY_ATTEMPTS', 3),
        // Baza backoff-ului exponențial: base * 2^(attempt-1) ms. 0 în teste.
        'base_delay_ms' => (int) env('ASSISTANT_LLM_RETRY_BASE_MS', 500),
    ],

    // Furnizor alternativ gratuit (API compatibil OpenAI Chat Completions).
    // Groq folosește UN singur model pentru ambele hop-uri (intent + answer);
    // model_intent/model_answer de mai sus sunt ID-uri Anthropic și se ignoră.
    'groq' => [
        'base_url' => env('ASSISTANT_GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
        // Tool use + streaming confirmate în docs Groq (console.groq.com/docs/tool-use).
        // Alternative tool-capable: llama-3.3-70b-versatile, qwen/qwen3-32b.
        'model' => env('ASSISTANT_GROQ_MODEL', 'openai/gpt-oss-120b'),
        'max_tokens' => (int) env('ASSISTANT_GROQ_MAX_TOKENS', 2048),
        'timeout' => (int) env('ASSISTANT_GROQ_TIMEOUT', 120),
        'retry' => [
            'max_attempts' => (int) env('ASSISTANT_GROQ_RETRY_ATTEMPTS', 3),
            'base_delay_ms' => (int) env('ASSISTANT_GROQ_RETRY_BASE_MS', 500),
        ],
    ],

];
