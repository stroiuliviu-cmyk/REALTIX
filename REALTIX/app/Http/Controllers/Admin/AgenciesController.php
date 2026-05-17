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

class AgenciesController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Agency::query()
            ->withCount(['users', 'properties', 'contacts', 'deals'])
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('slug', 'ilike', "%{$s}%");
            }))
            ->when($request->plan, fn ($q, $p) => $q->where('subscription_plan', $p))
            ->when($request->status === 'suspended', fn ($q) => $q->whereNotNull('suspended_at'))
            ->when($request->status === 'active', fn ($q) => $q->whereNull('suspended_at'));

        return Inertia::render('Admin/Agencies', [
            'agencies' => $query->latest()->paginate(25)->withQueryString(),
            'filters'  => $request->only(['search', 'plan', 'status']),
        ]);
    }

    public function show(Agency $agency): Response
    {
        $agency->load(['users:id,name,email,agency_id,is_active,created_at', 'subscriptions']);

        $stats = [
            'properties'   => $agency->properties()->count(),
            'contacts'     => $agency->contacts()->count(),
            'deals'        => $agency->deals()->count(),
            'media_size'   => \DB::table('property_media')
                ->join('properties', 'properties.id', '=', 'property_media.property_id')
                ->where('properties.agency_id', $agency->id)
                ->sum('property_media.size'),
            'ai_requests'  => \DB::table('ai_requests')->where('agency_id', $agency->id)->count(),
        ];

        $invoices = [];
        if ($agency->stripe_id && config('cashier.secret')) {
            try {
                $invoices = $agency->invoices()->take(10)->map(fn ($inv) => [
                    'date'   => $inv->date()->toFormattedDateString(),
                    'total'  => $inv->total(),
                    'status' => $inv->status,
                    'pdf'    => $inv->invoice_pdf,
                ])->toArray();
            } catch (\Throwable) {}
        }

        $recentActivity = \App\Models\ActivityLog::where('agency_id', $agency->id)
            ->latest()->take(20)->get(['id', 'action', 'description', 'created_at']);

        return Inertia::render('SuperAdmin/Agencies/Show', [
            'agency'         => $agency->append('suspended_at'),
            'stats'          => $stats,
            'invoices'       => $invoices,
            'recentActivity' => $recentActivity,
            'plans'          => SubscriptionPlan::orderBy('price_monthly')->get(),
            'planLabels'     => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
        ]);
    }

    public function suspend(Agency $agency, AuditLogger $audit): RedirectResponse
    {
        $agency->update(['suspended_at' => now()]);
        $agency->users()->update(['is_active' => false]);
        $audit->record('agency.suspend', $agency, "Agenția {$agency->name} suspendată");
        return back()->with('success', "Agenția „{$agency->name}\" a fost suspendată — toți userii inactivați.");
    }

    public function activate(Agency $agency, AuditLogger $audit): RedirectResponse
    {
        $agency->update(['suspended_at' => null]);
        $agency->users()->update(['is_active' => true]);
        $audit->record('agency.activate', $agency, "Agenția {$agency->name} reactivată");
        return back()->with('success', "Agenția „{$agency->name}\" reactivată.");
    }

    public function changePlan(Request $request, Agency $agency, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate(['plan' => 'required|in:starter,medium,pro']);
        $old = $agency->subscription_plan;
        $agency->update(['subscription_plan' => $data['plan']]);
        $audit->record('agency.plan_change', $agency, "Plan {$old} → {$data['plan']}", ['old' => $old, 'new' => $data['plan']]);
        return back()->with('success', "Plan schimbat: {$old} → {$data['plan']}.");
    }

    public function destroy(Agency $agency, AuditLogger $audit): RedirectResponse
    {
        $name = $agency->name;
        $audit->record('agency.delete', null, "Deleted agency: {$name}", ['agency_id' => $agency->id]);
        $agency->delete();
        return redirect()->route('super-admin.agencies.index')->with('success', "Agenția {$name} a fost ștearsă.");
    }
}
