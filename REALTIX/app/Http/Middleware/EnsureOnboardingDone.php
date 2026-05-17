<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingDone
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $agency = $user->agency;
        if (! $agency || $agency->onboarding_done) {
            return $next($request);
        }

        // 9-step flow gating. Determine which onboarding step the user must
        // be on right now and redirect there if they've wandered off.
        $route = $this->nextStepRoute($user, $agency);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Onboarding required.', 'redirect' => route($route)], 409);
        }
        return redirect()->route($route);
    }

    private function nextStepRoute($user, $agency): string
    {
        if (! $user->hasVerifiedEmail()) {
            return 'verification.notice';
        }
        if (! $agency->profile_filled) {
            return 'onboarding.agency';
        }
        if (! $agency->stripe_id) {
            return 'onboarding.plan';
        }
        return 'onboarding.setup';
    }
}
