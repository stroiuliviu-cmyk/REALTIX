<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Assistant chat conversation. Owned by an anonymous `owner_token` (cookie/
 * localStorage) and optionally linked to a logged-in user. Max 10 per owner —
 * enforced in code (ConversationManager::enforceLimit), not the schema.
 */
class Conversation extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'owner_token',
        'user_id',
        'language',
        'title',
        'last_activity_at',
    ];

    protected $casts = [
        'last_activity_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Ordered by insertion (id) — reliable even when created_at ties within a transaction. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('id');
    }
}
