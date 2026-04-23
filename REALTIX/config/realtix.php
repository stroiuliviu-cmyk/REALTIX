<?php

return [
    'ai' => [
        // Provider activ: 'groq' (gratuit) sau 'anthropic' (plătit)
        'provider' => env('AI_PROVIDER', 'groq'),

        // Groq — GRATUIT: console.groq.com (6000 req/zi, Llama 3.3 70B)
        'groq' => [
            'api_key' => env('GROQ_API_KEY', ''),
            'model'   => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
            'base_url'=> 'https://api.groq.com/openai/v1/chat/completions',
        ],

        // Anthropic Claude — plătit (fallback)
        'anthropic' => [
            'api_key' => env('ANTHROPIC_API_KEY', ''),
            'model'   => env('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
            'base_url'=> 'https://api.anthropic.com/v1/messages',
        ],

        'max_tokens' => 1024,
    ],

    'scraper' => [
        'rate_limit_seconds' => 2,
        'max_pages' => 10,
        'user_agent' => 'REALTIX/1.0 (+https://realtix.md/bot)',
    ],

    'media' => [
        'max_files' => 15,
        'max_size_mb' => 10,
        'image_width' => 1200,
        'image_height' => 800,
        'thumb_width' => 400,
        'thumb_height' => 300,
    ],

    'plan_features' => [
        'starter' => ['crm', 'properties'],
        'medium' => ['crm', 'properties', 'ai_tools', 'scraper', 'pdf_contracts'],
        'pro' => ['crm', 'properties', 'ai_tools', 'scraper', 'pdf_contracts', 'analytics', 'white_label', 'api'],
    ],
];
