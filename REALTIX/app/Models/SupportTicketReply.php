<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicketReply extends Model
{
    protected $fillable = ['ticket_id', 'user_id', 'body', 'is_internal_note'];

    protected $casts = ['is_internal_note' => 'boolean'];

    public function ticket(): BelongsTo { return $this->belongsTo(SupportTicket::class, 'ticket_id'); }
    public function user(): BelongsTo   { return $this->belongsTo(User::class); }
}
