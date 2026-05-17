<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactInteraction;
use App\Models\Deal;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CrmMonitoringController extends Controller
{
    public function index(): Response
    {
        $monthAgo = now()->subDays(30);

        $stats = [
            'total_contacts'        => Contact::withoutGlobalScopes()->count(),
            'total_deals'           => Deal::withoutGlobalScopes()->count(),
            'total_interactions'    => ContactInteraction::count(),
            'contacts_30d'          => Contact::withoutGlobalScopes()->where('created_at', '>=', $monthAgo)->count(),
            'deals_30d'             => Deal::withoutGlobalScopes()->where('created_at', '>=', $monthAgo)->count(),
            'interactions_30d'      => ContactInteraction::where('created_at', '>=', $monthAgo)->count(),
        ];

        $contactsByStatus = Contact::withoutGlobalScopes()
            ->selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')->pluck('cnt', 'status')->all();

        $contactsByType = Contact::withoutGlobalScopes()
            ->selectRaw('type, COUNT(*) as cnt')
            ->groupBy('type')->pluck('cnt', 'type')->all();

        $topAgenciesByActivity = DB::table('agencies')
            ->leftJoin('contacts', function ($j) {
                $j->on('contacts.agency_id', '=', 'agencies.id')
                  ->where('contacts.created_at', '>=', now()->subDays(30));
            })
            ->leftJoin('deals', function ($j) {
                $j->on('deals.agency_id', '=', 'agencies.id')
                  ->where('deals.created_at', '>=', now()->subDays(30));
            })
            ->selectRaw('agencies.id, agencies.name, agencies.subscription_plan, COUNT(DISTINCT contacts.id) as contacts_cnt, COUNT(DISTINCT deals.id) as deals_cnt')
            ->groupBy('agencies.id', 'agencies.name', 'agencies.subscription_plan')
            ->havingRaw('COUNT(DISTINCT contacts.id) + COUNT(DISTINCT deals.id) > 0')
            ->orderByRaw('COUNT(DISTINCT contacts.id) + COUNT(DISTINCT deals.id) DESC')
            ->limit(10)->get();

        $interactionTypes = ContactInteraction::selectRaw('type, COUNT(*) as cnt')
            ->where('created_at', '>=', $monthAgo)
            ->groupBy('type')->orderByDesc('cnt')->get();

        return Inertia::render('SuperAdmin/CrmMonitoring/Index', [
            'stats'                 => $stats,
            'contactsByStatus'      => $contactsByStatus,
            'contactsByType'        => $contactsByType,
            'topAgenciesByActivity' => $topAgenciesByActivity,
            'interactionTypes'      => $interactionTypes,
            'planLabels'            => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
        ]);
    }
}
