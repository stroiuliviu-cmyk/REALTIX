<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->hasRole('admin');

        if ($isAdmin) {
            $data = $this->adminStats($user);
        } else {
            $data = $this->realtorStats($user);
        }

        return Inertia::render('Statistics/Index', array_merge($data, [
            'isAdmin' => $isAdmin,
        ]));
    }

    private function adminStats(User $user): array
    {
        $agencyId = $user->agency_id;

        $propertiesTotal = Property::withoutGlobalScopes()->where('agency_id', $agencyId)->count();
        $propertiesActive = Property::withoutGlobalScopes()->where('agency_id', $agencyId)->where('status', 'active')->count();

        $contactsTotal = Contact::withoutGlobalScopes()->where('agency_id', $agencyId)->count();
        $contactsByType = Contact::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $dealsMonth = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereMonth('closed_at', now()->month)
            ->whereYear('closed_at', now()->year)
            ->count();

        $revenueMonth = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereMonth('closed_at', now()->month)
            ->whereYear('closed_at', now()->year)
            ->sum('commission');

        $agentStats = User::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->withCount([
                'properties as properties_count',
                'deals as deals_count',
                'contacts as contacts_count',
            ])
            ->get()
            ->map(fn($u) => [
                'id'               => $u->id,
                'name'             => $u->name,
                'properties_count' => $u->properties_count,
                'deals_count'      => $u->deals_count,
                'contacts_count'   => $u->contacts_count,
            ]);

        $revenueByMonth = Deal::withoutGlobalScopes()
            ->where('agency_id', $agencyId)
            ->where('status', 'closed')
            ->whereYear('closed_at', now()->year)
            ->whereNotNull('closed_at')
            ->get(['closed_at', 'commission'])
            ->groupBy(fn($d) => (int) $d->closed_at->format('n'))
            ->map(fn($group, $month) => ['month' => $month, 'total' => (float) $group->sum('commission')])
            ->sortKeys()
            ->values();

        return compact(
            'propertiesTotal', 'propertiesActive',
            'contactsTotal', 'contactsByType',
            'dealsMonth', 'revenueMonth',
            'agentStats', 'revenueByMonth'
        );
    }

    private function realtorStats(User $user): array
    {
        $propertiesTotal  = Property::where('user_id', $user->id)->count();
        $propertiesActive = Property::where('user_id', $user->id)->where('status', 'active')->count();

        $contactsTotal = Contact::where('user_id', $user->id)->count();

        $dealsMonth = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereMonth('closed_at', now()->month)
            ->whereYear('closed_at', now()->year)
            ->count();

        $revenueMonth = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereMonth('closed_at', now()->month)
            ->whereYear('closed_at', now()->year)
            ->sum('commission');

        $revenueByMonth = Deal::where('user_id', $user->id)
            ->where('status', 'closed')
            ->whereYear('closed_at', now()->year)
            ->whereNotNull('closed_at')
            ->get(['closed_at', 'commission'])
            ->groupBy(fn($d) => (int) $d->closed_at->format('n'))
            ->map(fn($group, $month) => ['month' => $month, 'total' => (float) $group->sum('commission')])
            ->sortKeys()
            ->values();

        return compact(
            'propertiesTotal', 'propertiesActive',
            'contactsTotal', 'dealsMonth', 'revenueMonth', 'revenueByMonth'
        );
    }
}
