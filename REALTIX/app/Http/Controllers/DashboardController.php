<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user    = $request->user();
        $isAdmin = $user->isAdmin();

        // Scope helper — realtor sees only their own rows; admin sees agency-wide.
        $own = fn ($q) => $isAdmin ? $q : $q->where('user_id', $user->id);
        $ownEvents = fn ($q) => $isAdmin ? $q : $q->where('user_id', $user->id);

        $stats = [
            'properties'       => $own(Property::query())->count(),
            'active_properties'=> $own(Property::query())->where('status', 'active')->count(),
            'contacts'         => $own(Contact::query())->count(),
            'buyers'           => $own(Contact::query())->where('type', 'buyer')->count(),
            'active_deals'     => $own(Deal::query())->whereNotIn('status', ['closed', 'lost'])->count(),
            'closed_deals'     => $own(Deal::query())->where('status', 'closed')->count(),
            'deals_month'      => $own(Deal::query())->where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->count(),
            'monthly_revenue'  => $own(Deal::query())->where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->sum('commission'),
            'upcoming_events'  => $ownEvents(CalendarEvent::query())
                ->where('starts_at', '>=', now())
                ->where('starts_at', '<=', now()->addDays(7))
                ->count(),
            'views_count'      => $own(Property::query())->sum('views_count'),
        ];

        $recentProperties = $own(Property::with('coverMedia'))
            ->latest()
            ->limit(5)
            ->get();

        $recentContacts = $own(Contact::query())->latest()->limit(5)->get();

        $hotDeals = ScrapedListing::where('ai_valuation', 'cheap')
            ->where('owner_type', 'owner')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn($l) => [
                'id'           => $l->id,
                'title'        => $l->title,
                'price'        => $l->price,
                'area'         => $l->area,
                'city'         => $l->city,
                'district'     => $l->district,
                'images'       => $l->images ?? [],
                'ai_valuation' => $l->ai_valuation,
                'external_url' => $l->external_url,
            ]);

        return Inertia::render('Dashboard/Index', [
            'stats'            => $stats,
            'recentProperties' => $recentProperties,
            'recentContacts'   => $recentContacts,
            'hotDeals'         => $hotDeals,
            'lastUpdated'      => now()->toTimeString('minute'),
        ]);
    }
}
