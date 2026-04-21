<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutoPostRequest extends Model
{
    use BelongsToAgency;

    protected $fillable = [
        'agency_id', 'property_id', 'user_id',
        'target', 'status', 'admin_note', 'posted_at',
    ];

    protected $casts = ['posted_at' => 'datetime'];

    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
