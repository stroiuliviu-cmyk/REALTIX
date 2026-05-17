<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'agency_id', 'user_id', 'action',
        'subject_type', 'subject_id',
        'description', 'properties',
        'ip_address', 'user_agent',
        'created_at',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeForAgency(Builder $q, int $agencyId): Builder
    {
        return $q->where('agency_id', $agencyId);
    }

    public function scopeForUser(Builder $q, int $userId): Builder
    {
        return $q->where('user_id', $userId);
    }

    /**
     * Record an activity. Pulls causer + agency from auth context, ip/ua from request.
     * Pass null subject for actions not tied to an entity (e.g. login, password change).
     */
    public static function record(string $action, ?Model $subject = null, ?string $description = null, array $properties = []): ?self
    {
        $user = Auth::user();
        $agencyId = $user?->agency_id ?? ($subject->agency_id ?? null);

        return self::create([
            'agency_id'    => $agencyId,
            'user_id'      => $user?->id,
            'action'       => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id'   => $subject?->getKey(),
            'description'  => $description,
            'properties'   => $properties ?: null,
            'ip_address'   => Request::ip(),
            'user_agent'   => substr((string) Request::userAgent(), 0, 500),
            'created_at'   => now(),
        ]);
    }
}
