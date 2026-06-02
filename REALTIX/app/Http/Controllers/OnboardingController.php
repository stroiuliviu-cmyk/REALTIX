<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ConsumedTrial;
use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class OnboardingController extends Controller
{
    /**
     * Step 7 — Onboarding Setup (logo, language, agents, listing).
     * Reachable only after Stripe Checkout completes successfully.
     */
    public function setup(Request $request): Response|RedirectResponse
    {
        $user   = $request->user();
        $agency = $user->agency;

        if ($agency?->onboarding_done) {
            return redirect()->route('dashboard');
        }
        if (! $agency?->stripe_id) {
            return redirect()->route('onboarding.plan');
        }

        $plan = SubscriptionPlan::where('slug', $agency->subscription_plan)->first();
        $seatsIncluded = (int) ($plan?->seats_included ?? 1);
        $maxRealtors   = (int) ($plan?->max_realtors ?? 1);
        $currentUsers  = $agency->users()->count();

        return Inertia::render('Onboarding/Index', [
            'user'   => $user->only('name', 'email', 'locale'),
            'agency' => $agency?->only('name', 'logo_path'),
            'plan'   => [
                'slug'             => $plan?->slug,
                'name'             => $plan?->name,
                'seats_included'   => $seatsIncluded,
                'max_realtors'     => $maxRealtors,
                'has_extra_seats'  => (float) ($plan?->price_per_extra_seat ?? 0) > 0,
                'remaining_seats'  => $maxRealtors === -1 ? -1 : max(0, $seatsIncluded - $currentUsers),
            ],
        ]);
    }

    /**
     * Final step completion. Marks onboarding_done = true and goes to dashboard.
     */
    public function complete(Request $request): RedirectResponse
    {
        $user   = $request->user();
        $agency = $user->agency;

        if ($request->filled('locale')) {
            $locale = in_array($request->locale, ['ro', 'ru']) ? $request->locale : 'ro';
            $user->update(['locale' => $locale]);
            session(['locale' => $locale]);
        }

        if ($agency) {
            $agency->update(['onboarding_done' => true]);
            ActivityLog::record('onboarding.setup_completed', $agency, 'Onboarding setup finalizat');
        }

        return redirect()->route('dashboard')
            ->with('success', 'Configurarea inițială este completă. Bine ai venit în REALTIX!');
    }

    /**
     * Step 4 — Create Agency Profile. Form with name, address, phone, IDNO, director.
     */
    public function agency(Request $request): Response|RedirectResponse
    {
        $user   = $request->user();
        $agency = $user->agency;

        if (! $agency) {
            return redirect()->route('dashboard')->with('error', 'Nu ai o agenție asociată.');
        }
        if ($agency->profile_filled) {
            return redirect()->route('onboarding.plan');
        }

        return Inertia::render('Onboarding/Agency', [
            'agency' => [
                'name'          => $agency->name,
                'address'       => $agency->settings['address'] ?? '',
                'contact_phone' => $agency->settings['contact_phone'] ?? '',
                'idno'          => $agency->settings['idno'] ?? '',
                'director_name' => $agency->settings['director_name'] ?? '',
            ],
        ]);
    }

    public function saveAgencyProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'address'       => 'required|string|max:255',
            'contact_phone' => 'required|string|max:30',
            'idno'          => 'required|string|max:50',
            'director_name' => 'required|string|max:255',
        ], [
            'name.required'          => 'Numele agenției este obligatoriu.',
            'address.required'       => 'Adresa este obligatorie.',
            'contact_phone.required' => 'Telefonul de contact este obligatoriu.',
            'idno.required'          => 'IDNO este obligatoriu.',
            'director_name.required' => 'Numele directorului este obligatoriu.',
        ]);

        $agency = $request->user()->agency;
        $settings = $agency->settings ?? [];

        $agency->update([
            'name'           => $validated['name'],
            'profile_filled' => true,
            'settings'       => array_merge($settings, [
                'address'       => $validated['address'],
                'contact_phone' => $validated['contact_phone'],
                'idno'          => $validated['idno'],
                'director_name' => $validated['director_name'],
            ]),
        ]);

        ActivityLog::record('onboarding.agency_profile_saved', $agency, 'Profil agenție completat');

        return redirect()->route('onboarding.plan');
    }

    public function plan(Request $request): Response|RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency?->onboarding_done) {
            return redirect()->route('dashboard');
        }
        if (! $agency?->profile_filled) {
            return redirect()->route('onboarding.agency');
        }

        return Inertia::render('Onboarding/Plan', [
            'plans'             => SubscriptionPlan::orderBy('price_monthly')->get(),
            'stripe_configured' => (bool) config('cashier.secret'),
        ]);
    }

    /**
     * Plan selection during onboarding — sends user to Stripe Checkout with a
     * 14-day trial. Card is collected upfront. Only after Stripe returns the
     * user to onboarding.success do we flip onboarding_done = true.
     */
    public function selectPlan(Request $request): SymfonyResponse
    {
        $request->validate([
            'plan' => 'required|in:starter,medium,pro',
        ]);

        $agency = $request->user()->agency;
        if (! $agency) {
            return redirect()->route('dashboard')->with('error', 'Nu ai o agenție asociată.');
        }

        if (! config('cashier.secret')) {
            return back()->with('error', 'Stripe nu este configurat. Contactează suportul.');
        }

        $plan      = $request->plan;
        $planModel = SubscriptionPlan::where('slug', $plan)->first();
        $priceId   = $planModel?->stripe_price_id ?: config("realtix.stripe_prices.{$plan}");

        if (! $priceId) {
            return back()->with('error', "Planul „{$plan}\" nu are un Stripe Price ID configurat.");
        }

        $extraSeatPriceId = $planModel?->stripe_extra_seat_price_id ?: config("realtix.stripe_extra_seat_prices.{$plan}");
        $included = (int) ($planModel?->seats_included ?: 1);
        $extra    = max(0, $agency->users()->count() - $included);

        $agency->update(['subscription_plan' => $plan]);

        try {
            $builder = $agency->newSubscription('default', $priceId);

            if ($extraSeatPriceId && $extra > 0) {
                $builder->price($extraSeatPriceId, $extra);
            }

            // Anti-abuz: dacă emailul owner-ului a mai consumat trial-ul
            // (cont șters anterior), forțăm plata imediată — fără 14 zile gratis.
            if (! ConsumedTrial::wasConsumed($request->user()->email)) {
                $builder->trialUntil(now()->addDays(14)->endOfDay());
            }

            $checkout = $builder
                ->checkout([
                    'success_url'      => route('onboarding.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url'       => route('onboarding.plan'),
                    'billing_address_collection' => 'required',
                    'customer_update'  => ['address' => 'auto', 'name' => 'auto'],
                    'tax_id_collection'=> ['enabled' => true],
                    'metadata'         => [
                        'agency_id'     => $agency->id,
                        'plan'          => $plan,
                        'is_onboarding' => '1',
                    ],
                ]);

            ActivityLog::record('onboarding.checkout_started', $agency, "Onboarding checkout pornit: {$plan}", ['plan' => $plan, 'extra_seats' => $extra]);

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            report($e);
            return back()->with('error', 'Eroare la inițierea plății: ' . $e->getMessage());
        }
    }

    /**
     * Stripe Checkout success — proceed to step 7 (onboarding setup).
     * We pull the session directly from Stripe and sync local Cashier rows so
     * the system also works in dev without `stripe listen` running.
     */
    public function success(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency && $request->filled('session_id')) {
            app(\App\Services\StripeCheckoutSyncService::class)
                ->syncFromCheckoutSession($agency, $request->query('session_id'));
        }

        if ($agency) {
            ActivityLog::record('onboarding.payment_done', $agency->fresh(), 'Plată confirmată — trial activ');
        }

        return redirect()->route('onboarding.setup')
            ->with('success', 'Plata confirmată — trial-ul de 14 zile a început. Mai e doar configurarea inițială.');
    }
}
