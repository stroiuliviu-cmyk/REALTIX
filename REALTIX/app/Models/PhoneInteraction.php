<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class PhoneInteraction extends Model
{
    use BelongsToAgency;

    public const OUTCOMES = ['viewed', 'called', 'no_answer', 'refused'];

    protected $fillable = [
        'agency_id', 'user_id',
        'subject_type', 'subject_id',
        'phone', 'outcome', 'note',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeBetween(Builder $q, ?Carbon $from = null, ?Carbon $to = null): Builder
    {
        if ($from) $q->where('created_at', '>=', $from);
        if ($to)   $q->where('created_at', '<=', $to);
        return $q;
    }

    public static function record(Model $subject, string $outcome, ?string $note = null, ?string $phone = null): self
    {
        $user = Auth::user();

        return self::create([
            'agency_id'    => $user?->agency_id ?? ($subject->agency_id ?? null),
            'user_id'      => $user?->id,
            'subject_type' => $subject::class,
            'subject_id'   => $subject->getKey(),
            'phone'        => $phone,
            'outcome'      => $outcome,
            'note'         => $note,
        ]);
    }
}
