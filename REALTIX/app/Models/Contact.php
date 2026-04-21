<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
