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
        $stats = [
            'properties'       => Property::count(),
            'active_properties'=> Property::where('status', 'active')->count(),
            'contacts'         => Contact::count(),
            'buyers'           => Contact::where('type', 'buyer')->count(),
            'active_deals'     => Deal::whereNotIn('status', ['closed', 'lost'])->count(),
            'closed_deals'     => Deal::where('status', 'closed')->count(),
            'deals_month'      => Deal::where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->count(),
            'monthly_revenue'  => Deal::where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->whereYear('closed_at', now()->year)
                ->sum('commission'),
            'upcoming_events'  => CalendarEvent::where('starts_at', '>=', now())
                ->where('starts_at', '<=', now()->addDays(7))
                ->count(),
            'views_count'      => Property::sum('views_count'),
        ];

        $recentProperties = Property::with('coverMedia')
            ->latest()
            ->limit(5)
            ->get();

        $recentContacts = Contact::latest()->limit(5)->get();

        $hotDeals = ScrapedListing::where('ai_valuation', 'cheap')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn($l) => [
                'id'           => $l->id,
                'title'        => $l->title,
                'price'        => $l->price,
                'area'         => $l->raw_data['area'] ?? null,
                'city'         => $l->raw_data['city'] ?? null,
                'district'     => $l->raw_data['district'] ?? null,
                'images'       => $l->images ?? [],
                'ai_valuation' => $l->ai_valuation,
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
