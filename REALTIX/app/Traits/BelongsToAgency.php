<?php

namespace App\Traits;

use App\Models\Agency;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToAgency
{
    public static function bootBelongsToAgency(): void
    {
        static::creating(function ($model) {
            if (! $model->agency_id) {
                $agencyId = app()->bound('current_agency_id') ? app('current_agency_id') : null;
                if ($agencyId) {
                    $model->agency_id = $agencyId;
                }
            }
        });

        static::addGlobalScope('agency', function (Builder $builder) {
            $agencyId = app()->bound('current_agency_id') ? app('current_agency_id') : null;
            if ($agencyId) {
                $builder->where($builder->getModel()->getTable() . '.agency_id', $agencyId);
            }
        });
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }
}
