<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractTemplate extends Model
{
    use BelongsToAgency;

    protected $fillable = ['agency_id', 'name', 'type', 'locale', 'content', 'is_default'];

    protected $casts = ['is_default' => 'boolean'];

    public function generatedContracts(): HasMany
    {
        return $this->hasMany(GeneratedContract::class, 'template_id');
    }
}
