<?php

return [
    'ai' => [
        'provider' => env('AI_PROVIDER', 'claude'),
        'model' => env('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
        'api_key' => env('ANTHROPIC_API_KEY'),
        'max_tokens' => 2048,
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
