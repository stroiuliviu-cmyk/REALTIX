<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\SubscriptionPlan;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->get('status', 'all');

        $rows = DB::table('subscriptions as s')
            ->leftJoin('agencies as a', 'a.id', '=', 's.agency_id')
            ->select(
                's.id', 's.agency_id', 's.type', 's.stripe_id', 's.stripe_status',
                's.stripe_price', 's.quantity', 's.trial_ends_at', 's.ends_at', 's.created_at',
                'a.name as agency_name', 'a.subscription_plan', 'a.stripe_id as customer_id'
            )
            ->when($statusFilter !== 'all', fn ($q) => $q->where('s.stripe_status', $statusFilter))
            ->when($request->search, fn ($q, $s) => $q->where('a.name', 'ilike', "%{$s}%"))
            ->orderByDesc('s.created_at')
            ->paginate(25)
            ->withQueryString();

        // MRR computation: sum of plan.price_monthly for active/trialing subs by plan slug
        $plans = SubscriptionPlan::all()->keyBy('slug');
        $activeByPlan = DB::table('subscriptions')
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->join('agencies', 'agencies.id', '=', 'subscriptions.agency_id')
            ->selectRaw('agencies.subscription_plan as slug, COUNT(*) as cnt')
            ->groupBy('agencies.subscription_plan')
            ->pluck('cnt', 'slug')
            ->all();

        $mrr = 0;
        $mrrByPlan = [];
        foreach ($activeByPlan as $slug => $cnt) {
            $price = (float) ($plans[$slug]->price_monthly ?? 0);
            $mrrByPlan[$slug] = ['count' => (int) $cnt, 'revenue' => $price * $cnt];
            $mrr += $price * $cnt;
        }

        $counts = DB::table('subscriptions')
            ->selectRaw('stripe_status, COUNT(*) as cnt')
            ->groupBy('stripe_status')
            ->pluck('cnt', 'stripe_status')
            ->all();

        return Inertia::render('SuperAdmin/Billing/Index', [
            'subscriptions' => $rows,
            'filters'       => ['status' => $statusFilter, 'search' => $request->search],
            'stats' => [
                'mrr'         => $mrr,
                'arr'         => $mrr * 12,
                'mrr_by_plan' => $mrrByPlan,
                'active'      => (int) ($counts['active'] ?? 0),
                'trialing'    => (int) ($counts['trialing'] ?? 0),
                'past_due'    => (int) ($counts['past_due'] ?? 0),
                'canceled'    => (int) ($counts['canceled'] ?? 0),
                'incomplete'  => (int) ($counts['incomplete'] ?? 0),
            ],
            'planLabels' => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
        ]);
    }

    public function cancelSubscription(Request $request, Agency $agency, AuditLogger $audit): RedirectResponse
    {
        if (! $agency->subscribed('default')) {
            return back()->with('error', 'Agenția nu are abonament activ.');
        }
        try {
            $agency->subscription('default')->cancelNow();
            $audit->record('billing.subscription.cancel_now', $agency, "Subscription cancelled immediately for {$agency->name}");
            return back()->with('success', "Abonamentul {$agency->name} a fost anulat imediat.");
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'Eroare Stripe: ' . $e->getMessage());
        }
    }

    public function refundLastInvoice(Request $request, Agency $agency, AuditLogger $audit): RedirectResponse
    {
        if (! $agency->stripe_id || ! config('cashier.secret')) {
            return back()->with('error', 'Agenție fără Stripe customer sau Stripe neconfigurat.');
        }
        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret'));
            $invoices = $stripe->invoices->all(['customer' => $agency->stripe_id, 'limit' => 1, 'status' => 'paid']);
            if (empty($invoices->data)) {
                return back()->with('error', 'Nicio factură plătită găsită.');
            }
            $invoice = $invoices->data[0];
            if (! $invoice->charge) {
                return back()->with('error', 'Această factură nu are charge asociat.');
            }
            $refund = $stripe->refunds->create([
                'charge' => $invoice->charge,
                'reason' => 'requested_by_customer',
                'metadata' => ['admin_id' => $request->user()->id, 'agency_id' => $agency->id],
            ]);
            $audit->billingRefund((int) $invoice->id, (int) $invoice->amount_paid, 'Last invoice refund');
            return back()->with('success', "Refund inițiat: {$refund->id} ({$invoice->amount_paid} cents)");
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'Eroare Stripe: ' . $e->getMessage());
        }
    }
}
