<?php

namespace App\Http\Controllers;

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
}
