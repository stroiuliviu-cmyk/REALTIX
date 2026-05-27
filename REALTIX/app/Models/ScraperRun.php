<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScraperRun extends Model
{
    protected $fillable = [
        'mode', 'pid', 'started_at', 'ended_at', 'duration_seconds',
        'status', 'exit_code',
        'total_processed', 'total_new', 'total_updated', 'total_skipped', 'total_failed',
        'category_stats', 'current_category', 'error_message',
    ];

    protected $casts = [
        'started_at'       => 'datetime',
        'ended_at'         => 'datetime',
        'category_stats'   => 'array',
        'pid'              => 'integer',
        'exit_code'        => 'integer',
        'duration_seconds' => 'integer',
        'total_processed'  => 'integer',
        'total_new'        => 'integer',
        'total_updated'    => 'integer',
        'total_skipped'    => 'integer',
        'total_failed'     => 'integer',
    ];

    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('started_at', '>=', now()->subDays($days));
    }

    public function isActive(): bool
    {
        return $this->status === 'running';
    }

    public function durationHuman(): string
    {
        if (! $this->duration_seconds) {
            return '—';
        }
        if ($this->duration_seconds < 60) {
            return "{$this->duration_seconds}s";
        }
        $min = intdiv($this->duration_seconds, 60);
        $sec = $this->duration_seconds % 60;
        return "{$min}m {$sec}s";
    }
}
