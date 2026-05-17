<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class FeatureFlag extends Model
{
    protected $fillable = ['key', 'enabled', 'description', 'audience', 'rollout_percent', 'updated_by_user_id'];

    protected $casts = [
        'enabled'         => 'boolean',
        'audience'        => 'array',
        'rollout_percent' => 'integer',
    ];

    public static function enabled(string $key, ?int $userId = null): bool
    {
        $flag = Cache::remember("feature_flag:{$key}", 60, fn () => static::where('key', $key)->first());
        if (! $flag) {
            return false;
        }
        if (! $flag->enabled) {
            return false;
        }
        if ($flag->rollout_percent >= 100) {
            return true;
        }
        if ($userId === null) {
            return false;
        }
        return (crc32("{$key}:{$userId}") % 100) < $flag->rollout_percent;
    }

    protected static function booted(): void
    {
        static::saved(fn ($flag) => Cache::forget("feature_flag:{$flag->key}"));
        static::deleted(fn ($flag) => Cache::forget("feature_flag:{$flag->key}"));
    }
}
