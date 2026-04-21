<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    use BelongsToAgency;

    protected $fillable = [
        'agency_id',
        'user_id',
        'contact_id',
        'property_id',
        'title',
        'description',
        'type',
        'starts_at',
        'ends_at',
        'google_event_id',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function contact(): BelongsTo { return $this->belongsTo(Contact::class); }
    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
}
