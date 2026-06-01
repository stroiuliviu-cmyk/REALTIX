<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate the /subscription pages + actions to people who can actually buy or
 * manage the agency plan. Realtors on a multi-agent plan (Team/Growth) are
 * employees — they don't pay; their admin does. Solo plan is single-user so
 * the realtor IS effectively their own manager and keeps access.
 */
class EnsureCanManageSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Platform staff + agency managers always pass.
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return $next($request);
        }

        // Solo plan (starter) = single-user agency, realtor manages own billing.
        $plan = $user->agency?->subscription_plan;
        if ($user->isRealtor() && $plan === 'starter') {
            return $next($request);
        }

        $msg = 'Doar managerul agenției poate gestiona abonamentul. Contactează administratorul agenției.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $msg], 403);
        }
        return redirect()->route('dashboard')->with('error', $msg);
    }
}
