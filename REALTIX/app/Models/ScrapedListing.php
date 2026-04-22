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
        'agency_id',
        'source',
        'external_id',
        'external_url',
        'title',
        'price',
        'currency',
        'area',
        'rooms',
        'city',
        'district',
        'images',
        'ai_valuation',
        'raw_data',
        'type',
        'transaction_type',
        'owner_type',
        'published_at',
        'phone',
    ];

    protected $casts = [
        'images'       => 'array',
        'raw_data'     => 'array',
        'price'        => 'decimal:2',
        'published_at' => 'datetime',
    ];
}
