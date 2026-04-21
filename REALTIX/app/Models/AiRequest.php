<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRequest extends Model
{
    use BelongsToAgency;

    protected $fillable = [
        'agency_id', 'user_id', 'type',
        'input_tokens', 'output_tokens', 'cost_usd', 'duration_ms', 'status',
    ];

    protected $casts = ['cost_usd' => 'decimal:6'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
