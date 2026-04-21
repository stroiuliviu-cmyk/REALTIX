<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deal extends Model
{
    use HasFactory, BelongsToAgency;

    protected $fillable = [
        'agency_id',
        'user_id',
        'contact_id',
        'property_id',
        'status',
        'value',
        'commission',
        'commission_percent',
        'currency',
        'notes',
        'closed_at',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'commission' => 'decimal:2',
        'commission_percent' => 'decimal:2',
        'closed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
