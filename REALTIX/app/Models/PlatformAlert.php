<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformAlert extends Model
{
    public const LEVELS = ['info', 'warning', 'critical'];

    protected $fillable = ['level', 'title', 'message', 'source', 'dismissed_at', 'dismissed_by_user_id'];

    protected $casts = ['dismissed_at' => 'datetime'];

    public function dismissedBy(): BelongsTo { return $this->belongsTo(User::class, 'dismissed_by_user_id'); }

    public function scopeActive($q)    { return $q->whereNull('dismissed_at'); }
    public function scopeCritical($q)  { return $q->where('level', 'critical'); }
}
