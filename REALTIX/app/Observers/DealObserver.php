<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Deal;
use App\Notifications\NewDealCreated;
use Illuminate\Support\Facades\Auth;

class DealObserver
{
    public function created(Deal $deal): void
    {
        $user = $deal->user;
        if ($user) {
            $user->notify(new NewDealCreated($deal));
        }

        if (Auth::check()) {
            ActivityLog::record('deal.created', $deal, "Tranzacție nouă creată (#{$deal->id})");
        }
    }

    public function updated(Deal $deal): void
    {
        if (! Auth::check()) {
            return;
        }
        $changes = array_diff_key($deal->getChanges(), array_flip(['updated_at']));
        if (! empty($changes)) {
            ActivityLog::record('deal.updated', $deal, "Tranzacția #{$deal->id} actualizată", ['changes' => array_keys($changes)]);
        }
    }

    public function deleted(Deal $deal): void
    {
        if (Auth::check()) {
            ActivityLog::record('deal.deleted', $deal, "Tranzacția #{$deal->id} ștearsă");
        }
    }
}
