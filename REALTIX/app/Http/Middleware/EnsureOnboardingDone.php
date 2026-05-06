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

        // Super admins bypass onboarding entirely
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $agency = $user->agency;
        if ($agency && ! $agency->onboarding_done) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Onboarding required.', 'redirect' => route('onboarding.plan')], 409);
            }
            return redirect()->route('onboarding.plan');
        }

        return $next($request);
    }
}
