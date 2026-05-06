<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgencySubscription
{
    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $user = $request->user();

        // Super admins bypass subscription/feature checks entirely
        if ($user?->isSuperAdmin()) {
            return $next($request);
        }

        $agency = $user?->agency;

        if (! $agency || ! $agency->isSubscriptionActive()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Subscription required.'], 402);
            }
            return redirect()->route('subscription.index')
                ->with('error', 'Abonamentul tău a expirat. Te rugăm să îl reînnoiești.');
        }

        foreach ($features as $feature) {
            if (! $agency->canUseFeature($feature)) {
                $label    = config("realtix.feature_labels.{$feature}", $feature);
                $minPlan  = config("realtix.feature_min_plan.{$feature}");
                $msg      = "„{$label}\" nu este disponibilă pe planul tău (" . ucfirst($agency->subscription_plan ?? 'starter') . ").";
                if ($minPlan) {
                    $msg .= ' Necesită planul ' . ucfirst($minPlan) . ' sau superior.';
                }

                if ($request->expectsJson()) {
                    return response()->json([
                        'message'      => $msg,
                        'feature'      => $feature,
                        'min_plan'     => $minPlan,
                        'current_plan' => $agency->subscription_plan,
                    ], 403);
                }
                return redirect()->route('subscription.index')->with('error', $msg);
            }
        }

        return $next($request);
    }
}
