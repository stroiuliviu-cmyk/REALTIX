<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;

class ScrapedListing extends Model
{
    use BelongsToAgency;

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
    ];

    protected $casts = [
        'images' => 'array',
        'raw_data' => 'array',
        'price' => 'decimal:2',
    ];
}
