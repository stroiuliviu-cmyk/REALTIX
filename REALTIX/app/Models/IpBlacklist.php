<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class IpBlacklist extends Model
{
    protected $table = 'ip_blacklist';

    protected $fillable = ['ip', 'reason', 'blocked_by_user_id', 'expires_at'];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by_user_id');
    }

    public static function isBlocked(string $ip): bool
    {
        return Cache::remember("ip_blocked:{$ip}", 60, function () use ($ip) {
            return static::where('ip', $ip)
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->exists();
        });
    }

    protected static function booted(): void
    {
        static::saved(fn ($r) => Cache::forget("ip_blocked:{$r->ip}"));
        static::deleted(fn ($r) => Cache::forget("ip_blocked:{$r->ip}"));
    }
}
