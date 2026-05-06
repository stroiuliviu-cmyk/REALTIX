<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasFactory, BelongsToAgency;

    protected $fillable = [
        'agency_id',
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'email',
        'type',
        'status',
        'notes',
        'source',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(ContactInteraction::class)->latest();
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'property_contact')
            ->withPivot('relation', 'notes')
            ->withTimestamps();
    }

    public function ownedProperties(): BelongsToMany
    {
        return $this->properties()->wherePivot('relation', 'owner');
    }

    public function interestedProperties(): BelongsToMany
    {
        return $this->properties()->wherePivot('relation', 'interested');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Last interaction date — call/note/email/etc, including ContactInteraction
     * and CalendarEvent. Null if there's no record.
     */
    public function getLastInteractionAtAttribute(): ?\Illuminate\Support\Carbon
    {
        return $this->interactions()->max('created_at')
            ? \Illuminate\Support\Carbon::parse($this->interactions()->max('created_at'))
            : null;
    }

    public function getIsForgottenAttribute(): bool
    {
        $last = $this->last_interaction_at ?? $this->updated_at;
        return $last && $last->lt(now()->subDays(30));
    }
}
