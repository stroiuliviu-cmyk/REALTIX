<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name', 'slug', 'price_monthly', 'stripe_price_id',
        'max_listings', 'max_realtors', 'has_ai_tools',
        'has_scraper', 'has_pdf_contracts', 'has_analytics',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'has_ai_tools' => 'boolean',
        'has_scraper' => 'boolean',
        'has_pdf_contracts' => 'boolean',
        'has_analytics' => 'boolean',
    ];
}
