<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $agency = $request->user()->agency;
        $plans = SubscriptionPlan::orderBy('price_monthly')->get();

        $activeSubscription = null;
        if ($agency->subscribed('default')) {
            $activeSubscription = $agency->subscription('default');
        }

        $invoices = [];
        try {
            if ($agency->stripe_id) {
                $invoices = $agency->invoices()->map(fn($inv) => [
                    'date'   => $inv->date()->toFormattedDateString(),
                    'total'  => $inv->total(),
                    'status' => $inv->status,
                    'pdf'    => $inv->invoice_pdf,
                ])->toArray();
            }
        } catch (\Exception) {}

        return Inertia::render('Subscription/Index', [
            'agency'             => $agency->only('id', 'name', 'subscription_plan', 'subscription_ends_at', 'trial_ends_at'),
            'plans'              => $plans,
            'activeSubscription' => $activeSubscription ? [
                'stripe_status' => $activeSubscription->stripe_status,
                'ends_at'       => $activeSubscription->ends_at,
                'trial_ends_at' => $activeSubscription->trial_ends_at,
                'stripe_price'  => $activeSubscription->stripe_price,
            ] : null,
            'invoices'           => array_slice($invoices, 0, 20),
            'stripe_key'         => config('cashier.key'),
            'isAdmin'            => $request->user()->isAdmin(),
        ]);
    }

    public function subscribe(Request $request, string $plan): SymfonyResponse
    {
        if (! in_array($plan, SubscriptionPlan::SLUGS, true)) {
            return back()->with('error', 'Plan invalid.');
        }

        if (! config('cashier.secret')) {
            return back()->with('error', 'Stripe nu este configurat. Adaugă STRIPE_SECRET în .env.');
        }

        $planModel = SubscriptionPlan::where('slug', $plan)->first();
        $priceId   = $planModel?->stripe_price_id
            ?? config("realtix.stripe_prices.{$plan}");

        if (! $priceId) {
            return back()->with('error', "Planul „{$plan}\" nu are un Stripe Price ID configurat. Adaugă STRIPE_PRICE_" . strtoupper($plan) . ' în .env.');
        }

        $agency = $request->user()->agency;

        try {
            $builder = $agency->newSubscription('default', $priceId);

            // Add per-seat overage item if the plan has it configured and the
            // current team already exceeds the included seats. New checkout
            // therefore reflects the right billing amount from day one.
            $extraSeatPriceId = $planModel?->stripe_extra_seat_price_id
                ?: config("realtix.stripe_extra_seat_prices.{$plan}");
            $included = (int) ($planModel?->seats_included ?: 1);
            $extra    = max(0, $agency->users()->count() - $included);

            if ($extraSeatPriceId && $extra > 0) {
                $builder->price($extraSeatPriceId, $extra);
            }

            $checkout = $builder
                ->trialUntil($agency->trial_ends_at && $agency->trial_ends_at->isFuture()
                    ? $agency->trial_ends_at->copy()->endOfDay()
                    : now()->addDays(14)->endOfDay())
                ->checkout([
                    'success_url'      => route('subscription.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url'       => route('subscription.index'),
                    'billing_address_collection' => 'required',
                    'customer_update'  => ['address' => 'auto', 'name' => 'auto'],
                    'tax_id_collection'=> ['enabled' => true],
                    'metadata'         => [
                        'agency_id' => $agency->id,
                        'plan'      => $plan,
                    ],
                ]);

            ActivityLog::record('subscription.checkout_started', $agency, "Checkout pornit pentru planul {$plan}", ['plan' => $plan, 'extra_seats' => $extra]);

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            report($e);
            return back()->with('error', 'Eroare la inițierea plății: ' . $e->getMessage());
        }
    }

    public function portal(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if (! $agency->stripe_id) {
            return back()->with('error', 'Nu există abonament activ.');
        }

        return $agency->redirectToBillingPortal(route('subscription.index'));
    }

    public function success(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency && $request->filled('session_id')) {
            app(\App\Services\StripeCheckoutSyncService::class)
                ->syncFromCheckoutSession($agency, $request->query('session_id'));
        }

        return redirect()->route('subscription.index')
            ->with('success', 'Abonamentul a fost activat cu succes!');
    }

    public function cancel(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency->subscribed('default')) {
            $agency->subscription('default')->cancel();
            ActivityLog::record('subscription.cancelled', $agency, "Abonament anulat (plan: {$agency->subscription_plan})");
        }

        return back()->with('success', 'Abonamentul va fi anulat la sfârșitul perioadei curente.');
    }
}
