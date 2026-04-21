<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgencySubscription
{
    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $agency = $request->user()?->agency;

        if (! $agency || ! $agency->isSubscriptionActive()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Subscription required.'], 402);
            }
            return redirect()->route('subscription.index')
                ->with('error', 'Abonamentul tău a expirat. Te rugăm să îl reînnoiești.');
        }

        foreach ($features as $feature) {
            $plan = $agency->subscription_plan;
            $planFeatures = config("realtix.plan_features.{$plan}", []);
            if (! in_array($feature, $planFeatures)) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => "Feature '{$feature}' not available on your plan."], 403);
                }
                return redirect()->back()
                    ->with('error', 'Această funcție nu este disponibilă pe planul tău curent.');
            }
        }

        return $next($request);
    }
}
