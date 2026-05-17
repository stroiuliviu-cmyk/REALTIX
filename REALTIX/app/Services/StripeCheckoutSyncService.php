<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sync local Cashier records (subscription, subscription_items, agency.subscription_plan)
 * with Stripe after a successful Checkout. This is what the webhook would do automatically,
 * but we also call it inline from the success handlers so the system works in dev without
 * `stripe listen` running.
 */
class StripeCheckoutSyncService
{
    public function syncFromCheckoutSession(Agency $agency, string $sessionId): bool
    {
        if (! config('cashier.secret')) {
            return false;
        }

        try {
            $stripe  = new \Stripe\StripeClient(config('cashier.secret'));
            $session = $stripe->checkout->sessions->retrieve($sessionId, [
                'expand' => ['subscription.items', 'customer'],
            ]);
        } catch (\Throwable $e) {
            Log::error("StripeCheckoutSync: failed to retrieve session {$sessionId}: {$e->getMessage()}");
            return false;
        }

        if ($session->status !== 'complete' || $session->payment_status !== 'paid') {
            return false;
        }

        $customerId = is_string($session->customer) ? $session->customer : $session->customer?->id;
        $subscription = $session->subscription;
        if (! $customerId || ! $subscription) {
            return false;
        }

        // Make sure agency.stripe_id matches the Stripe customer
        if ($agency->stripe_id !== $customerId) {
            $agency->update(['stripe_id' => $customerId]);
        }

        $priceId  = $subscription->items->data[0]->price->id ?? null;
        $planSlug = $this->resolvePlanSlug($priceId);

        DB::table('subscriptions')->updateOrInsert(
            ['agency_id' => $agency->id, 'stripe_id' => $subscription->id],
            [
                'type'           => 'default',
                'stripe_status'  => $subscription->status,
                'stripe_price'   => $priceId,
                'quantity'       => $subscription->items->data[0]->quantity ?? 1,
                'trial_ends_at'  => $subscription->trial_end ? Carbon::createFromTimestamp($subscription->trial_end) : null,
                'ends_at'        => null,
                'created_at'     => Carbon::createFromTimestamp($subscription->created),
                'updated_at'     => now(),
            ]
        );

        $localSubId = DB::table('subscriptions')
            ->where('agency_id', $agency->id)
            ->where('stripe_id', $subscription->id)
            ->value('id');

        DB::table('subscription_items')->where('subscription_id', $localSubId)->delete();
        foreach ($subscription->items->data as $item) {
            DB::table('subscription_items')->insert([
                'subscription_id' => $localSubId,
                'stripe_id'       => $item->id,
                'stripe_product'  => $item->price->product,
                'stripe_price'    => $item->price->id,
                'quantity'        => $item->quantity,
                'created_at'      => Carbon::createFromTimestamp($item->created),
                'updated_at'      => now(),
            ]);
        }

        $updates = [];
        if ($planSlug && $agency->subscription_plan !== $planSlug) {
            $updates['subscription_plan'] = $planSlug;
        }
        if ($subscription->trial_end) {
            $updates['trial_ends_at'] = Carbon::createFromTimestamp($subscription->trial_end);
        }
        if ($updates) {
            $agency->update($updates);
        }

        Log::info("StripeCheckoutSync: agency {$agency->id} synced from session {$sessionId} (plan={$planSlug})");
        return true;
    }

    private function resolvePlanSlug(?string $priceId): ?string
    {
        if (! $priceId) {
            return null;
        }
        $slug = SubscriptionPlan::where('stripe_price_id', $priceId)->value('slug');
        if ($slug) {
            return $slug;
        }
        foreach (config('realtix.stripe_prices', []) as $envSlug => $envPriceId) {
            if ($envPriceId === $priceId) {
                return $envSlug;
            }
        }
        return null;
    }
}
