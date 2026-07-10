<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single message in a conversation. `content` holds Anthropic-style content
 * blocks (text / tool_use / tool_result) so the API history round-trips
 * losslessly. `role` is user|assistant|tool; the DB 'tool' role maps to an
 * API 'user' message carrying tool_result blocks (see ConversationManager).
 *
 * Only `created_at` exists (no updated_at) — timestamps are disabled.
 */
class Message extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'cards',
        'tokens_in',
        'tokens_out',
        'model',
        'created_at',
    ];

    protected $casts = [
        'content'    => 'array',
        'cards'      => 'array',
        'tokens_in'  => 'integer',
        'tokens_out' => 'integer',
        'created_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
