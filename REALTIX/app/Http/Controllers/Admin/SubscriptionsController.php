<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\SubscriptionPlan;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionsController extends Controller
{
    public function index(): Response
    {
        $plans = SubscriptionPlan::orderBy('price_monthly')->get()
            ->map(function ($p) {
                $p->agencies_count = Agency::where('subscription_plan', $p->slug)->count();
                return $p;
            });

        return Inertia::render('Admin/Subscriptions', [
            'plans' => $plans,
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:100',
            'slug'                 => 'required|string|max:50|unique:subscription_plans,slug|regex:/^[a-z0-9_-]+$/',
            'price_monthly'        => 'required|numeric|min:0',
            'max_listings'         => 'required|integer',
            'max_realtors'         => 'required|integer',
            'seats_included'       => 'required|integer|min:1',
            'price_per_extra_seat' => 'nullable|numeric|min:0',
            'stripe_price_id'      => 'nullable|string|max:100',
        ]);
        $plan = SubscriptionPlan::create($data);
        $audit->record('plan.create', $plan, "Plan {$plan->slug} creat");
        return back()->with('success', "Plan „{$plan->name}\" creat.");
    }

    public function update(Request $request, SubscriptionPlan $plan, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => 'sometimes|string|max:100',
            'price_monthly'        => 'sometimes|numeric|min:0',
            'max_listings'         => 'sometimes|integer',
            'max_realtors'         => 'sometimes|integer',
            'seats_included'       => 'sometimes|integer|min:1',
            'price_per_extra_seat' => 'sometimes|nullable|numeric|min:0',
            'stripe_price_id'      => 'sometimes|nullable|string|max:100',
        ]);
        $plan->update($data);
        $audit->record('plan.update', $plan, "Plan {$plan->slug} actualizat", $data);
        return back()->with('success', "Plan „{$plan->name}\" actualizat.");
    }

    public function destroy(SubscriptionPlan $plan, AuditLogger $audit): RedirectResponse
    {
        $agenciesCount = Agency::where('subscription_plan', $plan->slug)->count();
        if ($agenciesCount > 0) {
            return back()->with('error', "Nu poți șterge — {$agenciesCount} agenții sunt pe acest plan.");
        }
        $name = $plan->name;
        $audit->record('plan.delete', null, "Plan {$name} șters");
        $plan->delete();
        return back()->with('success', "Plan „{$name}\" șters.");
    }
}
