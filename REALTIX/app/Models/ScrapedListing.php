<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ScrapedListing extends Model
{
    use BelongsToAgency;

    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'scraped_listing_favorites')->withTimestamps();
    }

    public function importedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'scraped_listing_imports')
            ->withPivot('property_id')->withTimestamps();
    }

    protected $fillable = [
        'agency_id', 'source', 'external_id', 'external_url',
        'title', 'price', 'currency',
        'area', 'rooms', 'floor', 'floors_total',
        'city', 'district', 'address', 'year_built',
        'images', 'ai_valuation', 'raw_data',
        'type', 'transaction_type', 'owner_type',
        'published_at', 'phone',
        'condition', 'building_type', 'heating',
        'furnished', 'parking', 'balcony', 'elevator', 'pets_allowed', 'air_conditioning',
        'description',
    ];

    protected $casts = [
        'images'           => 'array',
        'raw_data'         => 'array',
        'price'            => 'decimal:2',
        'published_at'     => 'datetime',
        'furnished'        => 'boolean',
        'parking'          => 'boolean',
        'balcony'          => 'boolean',
        'elevator'         => 'boolean',
        'pets_allowed'     => 'boolean',
        'air_conditioning' => 'boolean',
    ];
}
