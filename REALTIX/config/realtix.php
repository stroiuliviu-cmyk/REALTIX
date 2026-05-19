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

        // Google Gemini - GRATUIT: aistudio.google.com/app/apikey (1500 req/zi)
        'gemini' => [
            'api_key' => env('GEMINI_API_KEY', ''),
            'model'   => env('GEMINI_MODEL', 'gemini-3-flash-preview'),
            'base_url'=> 'https://generativelanguage.googleapis.com/v1beta/models',
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
        // All features are available on every plan. The only differentiators
        // are seats (Solo=1 / Team=5 / Growth=5+8€/seat) and max listings
        // (Solo=10 / Team=100 / Growth=∞). The `team` feature still gates
        // multi-agent invitations to Team/Growth because Solo has 1 seat.
        'starter' => ['crm', 'properties', 'calendar', 'ai_tools', 'scraper', 'pdf_contracts', 'autoposting', 'analytics', 'export', 'white_label', 'api'],
        'medium'  => ['crm', 'properties', 'calendar', 'ai_tools', 'scraper', 'pdf_contracts', 'autoposting', 'team', 'analytics', 'export', 'white_label', 'api'],
        'pro'     => ['crm', 'properties', 'calendar', 'ai_tools', 'scraper', 'pdf_contracts', 'autoposting', 'team', 'analytics', 'export', 'white_label', 'api'],
    ],

    // Human-readable feature labels for UpgradeLock banners
    'feature_labels' => [
        'ai_tools'      => 'Instrumente AI',
        'scraper'       => 'Web Offers (scraping piață)',
        'pdf_contracts' => 'Contracte PDF',
        'autoposting'   => 'Autopostare 999.md / FB',
        'team'          => 'Echipă (multi-agent)',
        'analytics'     => 'Statistici avansate',
        'export'        => 'Export PDF / Excel',
        'white_label'   => 'White-label',
        'api'           => 'API public',
    ],

    // Minimum plan needed for each feature (used by UpgradeLock).
    // Only `team` is gated — every other feature is available on every plan.
    'feature_min_plan' => [
        'team' => 'medium',
    ],

    // Plans that allow inviting agents and showing multi-agency switcher.
    // Solo is single-user only.
    'team_plans' => ['medium', 'pro'],

    // Stripe Price IDs per plan slug (overridden per-agency by SubscriptionPlan.stripe_price_id when set)
    'stripe_prices' => [
        'starter' => env('STRIPE_PRICE_STARTER'),
        'medium'  => env('STRIPE_PRICE_MEDIUM'),
        'pro'     => env('STRIPE_PRICE_PRO'),
    ],

    // Per-seat overage Price ID (only Pro). 8€ per agent above the 5 included.
    'stripe_extra_seat_prices' => [
        'pro' => env('STRIPE_PRICE_PRO_EXTRA_SEAT'),
    ],
];
