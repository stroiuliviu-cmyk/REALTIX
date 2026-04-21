<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyMedia extends Model
{
    protected $fillable = ['property_id', 'path', 'thumb_path', 'is_cover', 'sort_order'];

    protected $casts = ['is_cover' => 'boolean'];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
