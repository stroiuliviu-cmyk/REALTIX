<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ScrapedListing extends Model
{
    protected $hidden = ['phone'];

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'scraped_listing_favorites')->withTimestamps();
    }

    public function importedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'scraped_listing_imports')
            ->withPivot('property_id')->withTimestamps();
    }

    public function phoneInteractions(): MorphMany
    {
        return $this->morphMany(PhoneInteraction::class, 'subject')->latest();
    }

    protected static function booted(): void
    {
        static::deleting(function (ScrapedListing $listing) {
            $listing->phoneInteractions()->delete();
        });
    }

    protected $fillable = [
        'agency_id', 'source', 'external_id', 'external_url',
        'title', 'price', 'currency',
        'area', 'price_per_m2', 'rooms', 'floor', 'floors_total',
        'city', 'district', 'raion', 'address', 'year_built',
        'images', 'ai_valuation', 'raw_data',
        'type', 'transaction_type', 'owner_type',
        'subtype', 'extra_flags',
        'published_at', 'phone',
        'condition', 'building_type', 'heating',
        'furnished', 'parking', 'balcony', 'elevator', 'pets_allowed', 'air_conditioning',
        'description', 'matched_at',
    ];

    protected $casts = [
        'images'           => 'array',
        'raw_data'         => 'array',
        'extra_flags'      => 'array',
        'price_per_m2'     => 'decimal:2',
        'price'            => 'decimal:2',
        'published_at'     => 'datetime',
        'matched_at'       => 'datetime',
        'furnished'        => 'boolean',
        'parking'          => 'boolean',
        'balcony'          => 'boolean',
        'elevator'         => 'boolean',
        'pets_allowed'     => 'boolean',
        'air_conditioning' => 'boolean',
    ];
}
