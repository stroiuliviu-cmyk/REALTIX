<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierController;
use Symfony\Component\HttpFoundation\Response;

class StripeWebhookController extends CashierController
{
    /**
     * checkout.session.completed — first successful checkout.
     * Set the local subscription_plan from session metadata so the UI reflects
     * the chosen plan even before the subscription.updated event arrives.
     */
    public function handleCheckoutSessionCompleted(array $payload): Response
    {
        $session = $payload['data']['object'] ?? [];
        $agencyId = (int) ($session['metadata']['agency_id'] ?? 0);
        $plan     = $session['metadata']['plan'] ?? null;

        if ($agencyId && $plan && in_array($plan, SubscriptionPlan::SLUGS, true)) {
            Agency::where('id', $agencyId)->update(['subscription_plan' => $plan]);
            Log::info("Stripe webhook: agency {$agencyId} set to plan {$plan} via checkout");
        }

        return $this->successMethod();
    }

    /**
     * customer.subscription.updated / .created — keep local subscription_plan
     * in sync with the Stripe price. Cashier writes the subscription row; we
     * just mirror the plan slug onto Agency.
     */
    public function handleCustomerSubscriptionUpdated(array $payload): Response
    {
        $response = parent::handleCustomerSubscriptionUpdated($payload);

        $sub      = $payload['data']['object'] ?? [];
        $stripeId = $sub['customer'] ?? null;
        $agency   = $stripeId ? Agency::where('stripe_id', $stripeId)->first() : null;

        if (! $agency) {
            return $response;
        }

        $priceId = $sub['items']['data'][0]['price']['id'] ?? null;
        $plan    = $priceId ? $this->resolvePlanByPriceId($priceId) : null;

        $update = [];
        if ($plan && $agency->subscription_plan !== $plan) {
            $update['subscription_plan'] = $plan;
        }

        // sync trial / period end
        if (! empty($sub['trial_end'])) {
            $update['trial_ends_at'] = \Carbon\Carbon::createFromTimestamp($sub['trial_end']);
        }
        if (! empty($sub['current_period_end'])) {
            $update['subscription_ends_at'] = \Carbon\Carbon::createFromTimestamp($sub['current_period_end']);
        }

        if ($update) {
            $agency->update($update);
            Log::info("Stripe webhook: agency {$agency->id} synced", $update);
        }

        return $response;
    }

    /**
     * customer.subscription.deleted — downgrade to starter, clear trial.
     */
    public function handleCustomerSubscriptionDeleted(array $payload): Response
    {
        $response = parent::handleCustomerSubscriptionDeleted($payload);

        $sub      = $payload['data']['object'] ?? [];
        $stripeId = $sub['customer'] ?? null;
        $agency   = $stripeId ? Agency::where('stripe_id', $stripeId)->first() : null;

        if ($agency) {
            $agency->update([
                'subscription_plan'    => 'starter',
                'subscription_ends_at' => null,
                'trial_ends_at'        => null,
            ]);
            Log::info("Stripe webhook: agency {$agency->id} downgraded to starter (subscription deleted)");
        }

        return $response;
    }

    private function resolvePlanByPriceId(string $priceId): ?string
    {
        // Try DB first
        $plan = SubscriptionPlan::where('stripe_price_id', $priceId)->value('slug');
        if ($plan) {
            return $plan;
        }

        // Fall back to env mapping
        foreach (config('realtix.stripe_prices', []) as $slug => $envPriceId) {
            if ($envPriceId === $priceId) {
                return $slug;
            }
        }

        return null;
    }
}
