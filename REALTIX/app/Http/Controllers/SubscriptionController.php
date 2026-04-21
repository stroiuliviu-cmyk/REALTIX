<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;

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
        ]);
    }

    public function subscribe(Request $request, string $plan): RedirectResponse
    {
        $request->validate(['plan' => 'in:starter,medium,pro']);

        $planModel = SubscriptionPlan::where('slug', $plan)->firstOrFail();

        if (! $planModel->stripe_monthly_price_id) {
            return back()->with('error', 'Planul nu are un preț Stripe configurat.');
        }

        $agency = $request->user()->agency;

        try {
            $checkout = $agency->newSubscription('default', $planModel->stripe_monthly_price_id)
                ->checkout([
                    'success_url' => route('subscription.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url'  => route('subscription.index'),
                ]);

            return redirect($checkout->url);
        } catch (\Exception $e) {
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
        return redirect()->route('subscription.index')
            ->with('success', 'Abonamentul a fost activat cu succes!');
    }

    public function cancel(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency->subscribed('default')) {
            $agency->subscription('default')->cancel();
        }

        return back()->with('success', 'Abonamentul va fi anulat la sfârșitul perioadei curente.');
    }
}
