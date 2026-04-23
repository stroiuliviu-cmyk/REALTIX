<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutoPostRequest extends Model
{
    use BelongsToAgency;

    const STATUS_PENDING   = 'pending';
    const STATUS_APPROVED  = 'approved';
    const STATUS_REJECTED  = 'rejected';
    const STATUS_POSTED    = 'posted';
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_FAILED    = 'failed';

    protected $fillable = [
        'agency_id', 'property_id', 'user_id',
        'target', 'platforms', 'status',
        'admin_note', 'posted_at', 'scheduled_at',
        'platform_results', 'watermark',
    ];

    protected $casts = [
        'posted_at'        => 'datetime',
        'scheduled_at'     => 'datetime',
        'platforms'        => 'array',
        'platform_results' => 'array',
        'watermark'        => 'boolean',
    ];

    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
    public function user(): BelongsTo     { return $this->belongsTo(User::class); }

    public function getPlatformsList(): array
    {
        return $this->platforms ?? ($this->target ? [$this->target] : []);
    }

    public function isPending(): bool   { return $this->status === self::STATUS_PENDING; }
    public function isRejected(): bool  { return $this->status === self::STATUS_REJECTED; }
    public function isPosted(): bool    { return $this->status === self::STATUS_POSTED; }
}
