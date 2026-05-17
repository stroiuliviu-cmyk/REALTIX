<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImpersonationSession extends Model
{
    protected $fillable = [
        'super_admin_user_id', 'target_user_id', 'reason', 'ip', 'started_at', 'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
    ];

    public function superAdmin(): BelongsTo { return $this->belongsTo(User::class, 'super_admin_user_id'); }
    public function target(): BelongsTo     { return $this->belongsTo(User::class, 'target_user_id'); }
}
