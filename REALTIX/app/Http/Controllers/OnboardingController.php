<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user   = $request->user();
        $agency = $user->agency;

        // Skip onboarding if already completed
        if ($agency?->onboarding_done) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Onboarding/Index', [
            'user'   => $user->only('name', 'email', 'locale'),
            'agency' => $agency?->only('name', 'logo_path'),
        ]);
    }

    public function complete(Request $request): RedirectResponse
    {
        $user   = $request->user();
        $agency = $user->agency;

        if ($request->filled('locale')) {
            $locale = in_array($request->locale, ['ro', 'ru', 'en']) ? $request->locale : 'ro';
            $user->update(['locale' => $locale]);
            session(['locale' => $locale]);
        }

        if ($agency) {
            $agency->update(['onboarding_done' => true]);
        }

        return redirect()->route('dashboard');
    }

    public function plan(Request $request): Response|RedirectResponse
    {
        $agency = $request->user()->agency;

        if ($agency?->onboarding_done) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Onboarding/Plan', [
            'plans' => SubscriptionPlan::orderBy('price_monthly')->get(),
        ]);
    }

    public function selectPlan(Request $request): RedirectResponse
    {
        $request->validate([
            'plan' => 'required|in:starter,medium,pro',
        ]);

        $agency = $request->user()->agency;
        if (! $agency) {
            return redirect()->route('dashboard')->with('error', 'Nu ai o agenție asociată.');
        }

        $agency->update([
            'subscription_plan' => $request->plan,
            'trial_ends_at'     => now()->addDays(14),
            'onboarding_done'   => true,
        ]);

        return redirect()->route('dashboard')
            ->with('success', 'Trial gratis de 14 zile activat. Bine ai venit în REALTIX!');
    }
}
