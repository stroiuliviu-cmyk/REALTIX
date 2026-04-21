<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $stats = [
            'properties' => Property::count(),
            'contacts' => Contact::count(),
            'active_deals' => Deal::whereNotIn('status', ['closed', 'lost'])->count(),
            'closed_deals' => Deal::where('status', 'closed')->count(),
            'monthly_revenue' => Deal::where('status', 'closed')
                ->whereMonth('closed_at', now()->month)
                ->sum('commission'),
        ];

        $recentProperties = Property::with('coverMedia')
            ->latest()
            ->limit(3)
            ->get();

        $recentContacts = Contact::latest()->limit(5)->get();

        return Inertia::render('Dashboard/Index', [
            'stats' => $stats,
            'recentProperties' => $recentProperties,
            'recentContacts' => $recentContacts,
        ]);
    }
}
