<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    public const STATUSES   = ['open', 'pending', 'resolved', 'closed'];
    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    protected $fillable = [
        'agency_id', 'user_id', 'subject', 'status', 'priority',
        'assigned_to_user_id', 'last_reply_at',
    ];

    protected $casts = ['last_reply_at' => 'datetime'];

    public function agency(): BelongsTo      { return $this->belongsTo(Agency::class); }
    public function user(): BelongsTo        { return $this->belongsTo(User::class); }
    public function assignedTo(): BelongsTo  { return $this->belongsTo(User::class, 'assigned_to_user_id'); }
    public function replies(): HasMany       { return $this->hasMany(SupportTicketReply::class, 'ticket_id')->latest(); }
}
