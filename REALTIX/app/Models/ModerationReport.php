<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ModerationReport extends Model
{
    public const STATUSES = ['pending', 'reviewing', 'approved', 'rejected', 'spam'];

    protected $fillable = [
        'reporter_user_id', 'subject_type', 'subject_id', 'reason', 'details',
        'status', 'reviewed_by_user_id', 'review_notes', 'reviewed_at',
    ];

    protected $casts = ['reviewed_at' => 'datetime'];

    public function reporter(): BelongsTo   { return $this->belongsTo(User::class, 'reporter_user_id'); }
    public function reviewer(): BelongsTo   { return $this->belongsTo(User::class, 'reviewed_by_user_id'); }
    public function subject(): MorphTo      { return $this->morphTo(); }
}
