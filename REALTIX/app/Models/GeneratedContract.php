<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratedContract extends Model
{
    use BelongsToAgency;

    protected $fillable = ['agency_id', 'property_id', 'contact_id', 'template_id', 'user_id', 'data', 'pdf_path'];

    protected $casts = ['data' => 'array'];

    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
    public function contact(): BelongsTo { return $this->belongsTo(Contact::class); }
    public function template(): BelongsTo { return $this->belongsTo(ContractTemplate::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
