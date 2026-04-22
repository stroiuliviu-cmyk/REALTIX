<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasFactory, BelongsToAgency;

    protected $fillable = [
        'agency_id',
        'user_id',
        'title',
        'description_ro',
        'description_ru',
        'description_en',
        'type',
        'transaction_type',
        'price',
        'currency',
        'area_total',
        'area_living',
        'rooms',
        'floor',
        'floors_total',
        'address',
        'city',
        'district',
        'latitude',
        'longitude',
        'status',
        'ai_valuation',
        'views_count',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'price' => 'decimal:2',
        'area_total' => 'decimal:2',
        'area_living' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(PropertyMedia::class)->orderBy('sort_order');
    }

    public function coverMedia()
    {
        return $this->hasOne(PropertyMedia::class)->where('is_cover', true);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'property_favorites')->withTimestamps();
    }

    public function getDescriptionAttribute(): ?string
    {
        $locale = app()->getLocale();
        return $this->{"description_{$locale}"} ?? $this->description_ro;
    }
}
