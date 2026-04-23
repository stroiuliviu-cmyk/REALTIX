<?php

namespace App\Http\Controllers;

use App\Models\AutoPostRequest;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AutoPostController extends Controller
{
    private const PLATFORMS = ['999md', 'facebook', 'olx', 'imobiliare_md'];

    // ── Index: agents see own requests; admins see all + pending queue ──────
    public function index(Request $request): Response
    {
        $user    = $request->user();
        $isAdmin = $user->isAdmin();

        $requests = AutoPostRequest::with(['property.coverMedia', 'user'])
            ->when(! $isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'               => $r->id,
                'status'           => $r->status,
                'platforms'        => $r->getPlatformsList(),
                'watermark'        => $r->watermark,
                'admin_note'       => $r->admin_note,
                'scheduled_at'     => $r->scheduled_at?->toDateTimeString(),
                'posted_at'        => $r->posted_at?->toDateTimeString(),
                'platform_results' => $r->platform_results ?? [],
                'created_at'       => $r->created_at->toDateTimeString(),
                'property' => $r->property ? [
                    'id'       => $r->property->id,
                    'title'    => $r->property->title,
                    'city'     => $r->property->city,
                    'price'    => $r->property->price,
                    'currency' => $r->property->currency,
                    'cover'    => $r->property->coverMedia?->path,
                ] : null,
                'user' => ['id' => $r->user->id, 'name' => $r->user->name],
            ]);

        // Properties available for new autopost requests (agent's active ones)
        $properties = Property::select('id', 'title', 'city', 'district', 'price', 'currency', 'status')
            ->when(! $isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->where('status', 'active')
            ->latest()
            ->get();

        $pendingCount = $isAdmin
            ? AutoPostRequest::where('status', AutoPostRequest::STATUS_PENDING)->count()
            : 0;

        return Inertia::render('AutoPost/Index', [
            'requests'     => $requests,
            'properties'   => $properties,
            'isAdmin'      => $isAdmin,
            'pendingCount' => $pendingCount,
            'platforms'    => self::PLATFORMS,
        ]);
    }

    // ── Store: agent submits a new autopost request ─────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'platforms'   => 'required|array|min:1',
            'platforms.*' => 'in:999md,facebook,olx,imobiliare_md',
            'watermark'   => 'boolean',
        ]);

        $property = Property::findOrFail($validated['property_id']);
        Gate::authorize('view', $property);

        AutoPostRequest::create([
            'agency_id'   => $request->user()->agency_id,
            'user_id'     => $request->user()->id,
            'property_id' => $property->id,
            'target'      => $validated['platforms'][0],
            'platforms'   => $validated['platforms'],
            'status'      => AutoPostRequest::STATUS_PENDING,
            'watermark'   => $validated['watermark'] ?? true,
        ]);

        return back()->with('success', 'Cererea de publicare a fost trimisă spre aprobare.');
    }

    // ── Approve: admin approves (optional schedule) ─────────────────────────
    public function approve(Request $request, AutoPostRequest $autoPost)
    {
        Gate::authorize('admin', $request->user());

        $validated = $request->validate([
            'platforms'    => 'nullable|array',
            'platforms.*'  => 'in:999md,facebook,olx,imobiliare_md',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $platforms = $validated['platforms'] ?? $autoPost->getPlatformsList();

        if (! empty($validated['scheduled_at'])) {
            $autoPost->update([
                'status'       => AutoPostRequest::STATUS_SCHEDULED,
                'platforms'    => $platforms,
                'scheduled_at' => $validated['scheduled_at'],
            ]);
            return back()->with('success', 'Publicarea a fost programată.');
        }

        // Simulate immediate posting to all platforms
        $results = [];
        foreach ($platforms as $platform) {
            $results[$platform] = [
                'status' => 'posted',
                'url'    => $this->simulatePlatformUrl($platform, $autoPost->property),
                'error'  => null,
            ];
        }

        $autoPost->update([
            'status'           => AutoPostRequest::STATUS_POSTED,
            'platforms'        => $platforms,
            'platform_results' => $results,
            'posted_at'        => now(),
        ]);

        return back()->with('success', 'Anunțul a fost publicat pe ' . count($platforms) . ' platforme.');
    }

    // ── Reject: admin rejects with mandatory note ───────────────────────────
    public function reject(Request $request, AutoPostRequest $autoPost)
    {
        Gate::authorize('admin', $request->user());

        $request->validate(['note' => 'required|string|max:500']);

        $autoPost->update([
            'status'     => AutoPostRequest::STATUS_REJECTED,
            'admin_note' => $request->note,
        ]);

        return back()->with('success', 'Cererea a fost respinsă cu observație.');
    }

    // ── Cancel: agent cancels own pending request ───────────────────────────
    public function cancel(AutoPostRequest $autoPost)
    {
        if ($autoPost->user_id !== auth()->id()) {
            abort(403);
        }
        if (! $autoPost->isPending()) {
            return back()->withErrors(['error' => 'Doar cererile în așteptare pot fi anulate.']);
        }

        $autoPost->delete();

        return back()->with('success', 'Cererea a fost anulată.');
    }

    // ── Remove everywhere: marks all platform results as removed ───────────
    public function removeEverywhere(AutoPostRequest $autoPost)
    {
        Gate::authorize('admin', request()->user());

        $results = $autoPost->platform_results ?? [];
        foreach (array_keys($results) as $platform) {
            $results[$platform]['status'] = 'removed';
        }

        $autoPost->update([
            'status'           => 'removed',
            'platform_results' => $results,
        ]);

        return back()->with('success', 'Anunțul a fost retras de pe toate platformele.');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────
    private function simulatePlatformUrl(string $platform, ?Property $property): string
    {
        $slug = $property ? str($property->title)->slug() : 'property';
        return match ($platform) {
            '999md'          => "https://999.md/ro/anunturi/{$slug}",
            'facebook'       => "https://www.facebook.com/marketplace/item/{$slug}",
            'olx'            => "https://www.olx.md/oferta/{$slug}",
            'imobiliare_md'  => "https://imobiliare.md/anunt/{$slug}",
            default          => "#",
        };
    }
}
