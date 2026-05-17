<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ListingsController extends Controller
{
    public function index(Request $request): Response
    {
        $q = Property::withoutGlobalScopes()
            ->with(['user:id,name,email', 'agency:id,name,subscription_plan'])
            ->when($request->search, function ($qq, $s) {
                $qq->where(function ($x) use ($s) {
                    $x->where('title', 'ilike', "%{$s}%")
                      ->orWhere('address', 'ilike', "%{$s}%")
                      ->orWhere('city', 'ilike', "%{$s}%");
                });
            })
            ->when($request->city, fn ($qq, $c) => $qq->where('city', $c))
            ->when($request->agency_id, fn ($qq, $a) => $qq->where('agency_id', $a))
            ->when($request->status, fn ($qq, $s) => $qq->where('status', $s))
            ->when($request->type, fn ($qq, $t) => $qq->where('type', $t))
            ->when($request->boolean('reported'), function ($qq) {
                $reportedIds = \DB::table('moderation_reports')
                    ->where('subject_type', Property::class)
                    ->where('status', 'pending')
                    ->pluck('subject_id');
                $qq->whereIn('id', $reportedIds);
            })
            ->latest();

        $listings = $q->paginate(25)->withQueryString();

        // Attach moderation report count per listing on this page
        $ids = $listings->getCollection()->pluck('id');
        $reportCounts = \DB::table('moderation_reports')
            ->where('subject_type', Property::class)
            ->whereIn('subject_id', $ids)
            ->where('status', 'pending')
            ->select('subject_id', \DB::raw('COUNT(*) as c'))
            ->groupBy('subject_id')
            ->pluck('c', 'subject_id')
            ->all();
        $listings->getCollection()->transform(function ($p) use ($reportCounts) {
            $p->reports_count = (int) ($reportCounts[$p->id] ?? 0);
            return $p;
        });

        return Inertia::render('SuperAdmin/Listings/Index', [
            'listings' => $listings,
            'filters'  => $request->only(['search', 'city', 'agency_id', 'status', 'type', 'reported']),
            'stats'    => [
                'total'    => Property::withoutGlobalScopes()->count(),
                'active'   => Property::withoutGlobalScopes()->where('status', 'active')->count(),
                'reported' => \DB::table('moderation_reports')
                    ->where('subject_type', Property::class)
                    ->where('status', 'pending')
                    ->distinct('subject_id')
                    ->count('subject_id'),
                'sold'     => Property::withoutGlobalScopes()->where('status', 'sold')->count(),
            ],
        ]);
    }

    public function updateStatus(Request $request, Property $property, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'status' => 'required|in:active,draft,inactive,sold,rented',
        ]);
        $property->withoutGlobalScopes()->update($data);
        $audit->record('listing.status_changed', $property, "Status → {$data['status']}", [
            'old' => $property->getOriginal('status'),
            'new' => $data['status'],
        ]);
        return back()->with('success', 'Status actualizat.');
    }

    public function feature(Property $property, AuditLogger $audit): RedirectResponse
    {
        $meta = $property->meta ?? [];
        $meta['featured'] = ! ($meta['featured'] ?? false);
        $property->withoutGlobalScopes()->update(['meta' => $meta]);
        $audit->record('listing.feature.toggle', $property, $meta['featured'] ? 'Featured ON' : 'Featured OFF');
        return back()->with('success', $meta['featured'] ? 'Anunț promovat.' : 'Promovare retrasă.');
    }

    public function destroy(Property $property, AuditLogger $audit): RedirectResponse
    {
        $audit->record('listing.delete', $property, "Deleted listing: {$property->title}", [
            'agency_id' => $property->agency_id,
        ]);
        $property->delete();
        return redirect()->route('super-admin.listings.index')->with('success', 'Anunț șters.');
    }

    public function show(Property $property): \Inertia\Response
    {
        $property = Property::withoutGlobalScopes()
            ->with(['user:id,name,email', 'agency:id,name,subscription_plan', 'media'])
            ->findOrFail($property->id);

        $reports = \App\Models\ModerationReport::where('subject_type', Property::class)
            ->where('subject_id', $property->id)
            ->with(['reporter:id,name,email', 'reviewer:id,name'])
            ->latest()->get();

        $aiActivity = \App\Models\ActivityLog::where('subject_type', Property::class)
            ->where('subject_id', $property->id)
            ->where('action', 'like', 'ai.%')
            ->latest()->take(10)->get(['id', 'action', 'description', 'created_at']);

        $moderationLogs = \App\Models\ActivityLog::where('action', 'like', 'super_admin.moderation.%')
            ->whereJsonContains('properties->subject_id', $property->id)
            ->latest()->take(20)->get(['id', 'action', 'description', 'created_at', 'user_id']);

        return \Inertia\Inertia::render('SuperAdmin/Listings/Show', [
            'property'       => $property,
            'reports'        => $reports,
            'aiActivity'     => $aiActivity,
            'moderationLogs' => $moderationLogs,
        ]);
    }
}
