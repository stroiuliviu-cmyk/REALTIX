<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Property;
use Illuminate\Support\Facades\Auth;

class PropertyObserver
{
    public function created(Property $property): void
    {
        if (Auth::check()) {
            ActivityLog::record('property.created', $property, "Anunț creat: {$property->title}");
        }
    }

    public function updated(Property $property): void
    {
        if (! Auth::check()) {
            return;
        }
        $changes = array_diff_key($property->getChanges(), array_flip(['updated_at', 'meta']));
        if (! empty($changes)) {
            ActivityLog::record('property.updated', $property, "Anunț actualizat: {$property->title}", ['changes' => array_keys($changes)]);
        }
    }

    public function deleted(Property $property): void
    {
        if (Auth::check()) {
            ActivityLog::record('property.deleted', $property, "Anunț șters: {$property->title}");
        }
    }
}
