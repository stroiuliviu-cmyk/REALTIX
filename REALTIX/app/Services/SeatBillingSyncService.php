<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\Log;

class SeatBillingSyncService
{
    public function sync(Agency $agency): void
    {
        if (! $agency->stripe_id) {
            return;
        }

        $subscription = $agency->subscription('default');
        if (! $subscription || ! $subscription->valid()) {
            return;
        }

        $plan = SubscriptionPlan::where('slug', $agency->subscription_plan)->first();
        if (! $plan) {
            return;
        }

        $extraSeatPriceId = $plan->stripe_extra_seat_price_id
            ?: config("realtix.stripe_extra_seat_prices.{$agency->subscription_plan}");

        if (! $extraSeatPriceId) {
            return;
        }

        $userCount = $this->countSeats($agency);
        $included  = (int) ($plan->seats_included ?: 1);
        $extra     = max(0, $userCount - $included);

        try {
            $hasItem = $subscription->hasPrice($extraSeatPriceId);

            if ($extra <= 0) {
                if ($hasItem) {
                    $subscription->removePrice($extraSeatPriceId);
                    Log::info("SeatBilling: agency {$agency->id} removed extra seats (now {$userCount} ≤ {$included})");
                }
                return;
            }

            if ($hasItem) {
                $subscription->updateQuantity($extra, $extraSeatPriceId);
                Log::info("SeatBilling: agency {$agency->id} updated extra seats to {$extra}");
            } else {
                $subscription->addPrice($extraSeatPriceId, $extra);
                Log::info("SeatBilling: agency {$agency->id} added extra seats {$extra}");
            }
        } catch (\Throwable $e) {
            Log::error("SeatBilling sync failed for agency {$agency->id}: {$e->getMessage()}");
            report($e);
        }
    }

    private function countSeats(Agency $agency): int
    {
        $primaryIds = $agency->users()->pluck('users.id');
        $linkedIds  = \DB::table('agency_user_links')
            ->where('agency_id', $agency->id)
            ->pluck('user_id');

        return $primaryIds->merge($linkedIds)->unique()->count();
    }
}
