<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    public const SLUGS = ['starter', 'medium', 'pro'];

    protected $fillable = [
        'name', 'slug', 'price_monthly', 'stripe_price_id', 'stripe_extra_seat_price_id',
        'max_listings', 'max_realtors', 'seats_included', 'price_per_extra_seat',
        'has_ai_tools', 'has_scraper', 'has_pdf_contracts', 'has_analytics',
    ];

    protected $casts = [
        'price_monthly'        => 'decimal:2',
        'price_per_extra_seat' => 'decimal:2',
        'seats_included'       => 'integer',
        'max_listings'         => 'integer',
        'max_realtors'         => 'integer',
        'has_ai_tools'         => 'boolean',
        'has_scraper'          => 'boolean',
        'has_pdf_contracts'    => 'boolean',
        'has_analytics'        => 'boolean',
    ];

    public function priceForSeats(int $totalSeats): float
    {
        $base = (float) $this->price_monthly;
        if (! $this->price_per_extra_seat || $totalSeats <= $this->seats_included) {
            return $base;
        }
        $extra = $totalSeats - $this->seats_included;
        return $base + $extra * (float) $this->price_per_extra_seat;
    }
}
