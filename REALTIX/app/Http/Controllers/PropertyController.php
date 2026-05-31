<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    private const PHOTOS_MAX        = 15;
    private const PHOTO_MAX_KB      = 5120;
    private const PHOTO_MAX_DIM     = 8000;
    private const PHOTO_MIME_TYPES  = 'image/jpeg,image/png,image/webp';
    private const PHOTO_EXTENSIONS  = 'jpeg,jpg,png,webp';

    private function photoRules(): array
    {
        // Server-side hardening for /properties photo uploads.
        // `mimes` blocks spoofed extensions; `mimetypes` blocks spoofed MIME via finfo;
        // `dimensions` mitigates pixel-flood / decompression-bomb payloads.
        return [
            'photos'   => 'nullable|array|max:' . self::PHOTOS_MAX,
            'photos.*' => 'file'
                . '|mimes:' . self::PHOTO_EXTENSIONS
                . '|mimetypes:' . self::PHOTO_MIME_TYPES
                . '|max:' . self::PHOTO_MAX_KB
                . '|dimensions:max_width=' . self::PHOTO_MAX_DIM . ',max_height=' . self::PHOTO_MAX_DIM,
        ];
    }

    public function index(Request $request): Response
    {
        $user    = $request->user();
        $isAdmin = $user->isAdmin();

        $query = Property::with('coverMedia')
            ->withCount('deals')
            ->when(! $isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title',    'like', "%{$s}%")
                  ->orWhere('address', 'like', "%{$s}%")
                  ->orWhere('district','like', "%{$s}%");
                if (ctype_digit((string) $s)) {
                    $q->orWhere('id', (int) $s)
                      ->orWhere('scraped_listing_id', (int) $s);
                }
            }))
            ->when($request->filled('types') && is_array($request->types), fn ($q) => $q->whereIn('type', $request->types))
            ->when($request->transaction_type, fn ($q, $t) => $q->where('transaction_type', $t))
            ->when($request->filled('statuses') && is_array($request->statuses), fn ($q) => $q->whereIn('status', $request->statuses))
            ->when($request->city,     fn ($q, $c) => $q->where('city',     'like', "%{$c}%"))
            ->when($request->district, fn ($q, $d) => $q->where('district', 'like', "%{$d}%"))
            // Note: `raion` is round-tripped for UI state but not filtered on —
            // the properties table doesn't carry a raion column (only city +
            // district). Agency listings are few and curated, so locality-level
            // filtering is sufficient.
            ->when($request->price_min, fn ($q, $v) => $q->where('price', '>=', (float) $v))
            ->when($request->price_max, fn ($q, $v) => $q->where('price', '<=', (float) $v))
            ->when($request->area_min,  fn ($q, $v) => $q->where('area_total', '>=', (float) $v))
            ->when($request->area_max,  fn ($q, $v) => $q->where('area_total', '<=', (float) $v))
            ->when($request->filled('rooms'), function ($q) use ($request) {
                $rooms = is_array($request->rooms) ? $request->rooms : [$request->rooms];
                $q->where(function ($q) use ($rooms) {
                    foreach ($rooms as $r) {
                        if ($r === '5+' || (int) $r >= 5) {
                            $q->orWhere('rooms', '>=', 5);
                        } else {
                            $q->orWhere('rooms', (int) $r);
                        }
                    }
                });
            })
            ->when($request->floor_min,        fn ($q, $v) => $q->where('floor', '>=', (int) $v))
            ->when($request->floor_max,        fn ($q, $v) => $q->where('floor', '<=', (int) $v))
            ->when($request->floors_total_min, fn ($q, $v) => $q->where('floors_total', '>=', (int) $v))
            ->when($request->floors_total_max, fn ($q, $v) => $q->where('floors_total', '<=', (int) $v))
            ->when($request->date_from, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($request->date_to,   fn ($q, $v) => $q->where('created_at', '<=', $v . ' 23:59:59'))
            ->when($request->favorite,  fn ($q) => $q->whereHas('favoritedByUsers', fn ($fq) => $fq->where('user_id', $user->id)));

        match ($request->sort) {
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'views'      => $query->orderByDesc('views_count'),
            'deals'      => $query->orderByDesc('deals_count'),
            default      => $query->latest(),
        };

        // City + district auto-complete sources — pulled from market (scraped_listings)
        // so users get the full canonical list, same as in WebOffers.
        $cities = \App\Models\ScrapedListing::query()
            ->whereNotNull('city')->where('city', '!=', '')
            ->selectRaw('city, COUNT(*) as cnt')
            ->groupBy('city')
            ->orderByDesc('cnt')
            ->limit(30)
            ->get(['city', 'cnt']);

        $districts = \App\Models\ScrapedListing::query()
            ->whereNotNull('district')->where('district', '!=', '')
            ->when($request->city, fn ($q, $c) => $q->where('city', 'like', "%{$c}%"))
            ->selectRaw('district, COUNT(*) as cnt')
            ->groupBy('district')
            ->orderByDesc('cnt')
            ->limit(50)
            ->get(['district', 'cnt']);

        return Inertia::render('Properties/Index', [
            'properties'  => $query->paginate(20)->withQueryString(),
            'filters'     => $request->only([
                'search', 'types', 'transaction_type', 'statuses',
                'raion', 'city', 'district', 'rooms',
                'price_min', 'price_max', 'area_min', 'area_max',
                'floor_min', 'floor_max', 'floors_total_min', 'floors_total_max',
                'date_from', 'date_to', 'favorite', 'sort', 'phone',
            ]),
            'cities'      => $cities,
            'districts'   => $districts,
            'isAdmin'     => $isAdmin,
            'authUserId'  => $user->id,
            'favoriteIds' => $user->favoritePropertyIds(),
        ]);
    }

    public function transfer(Request $request, Property $property): \Illuminate\Http\RedirectResponse
    {
        $admin = $request->user();
        abort_unless($admin->isAdmin() && $property->agency_id === $admin->agency_id, 403);

        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'notes'   => 'nullable|string|max:500',
        ]);

        // Target user must belong to the same agency
        $target = \App\Models\User::withoutGlobalScopes()->find($data['user_id']);
        if (! $target || $target->agency_id !== $admin->agency_id) {
            return back()->with('error', 'Agentul țintă nu aparține agenției tale.');
        }

        $oldUserId = $property->user_id;
        $property->update(['user_id' => $target->id]);

        \App\Models\ActivityLog::record(
            'property.transfer',
            $property,
            "Anunț transferat de la user #{$oldUserId} la {$target->name}",
            ['from_user_id' => $oldUserId, 'to_user_id' => $target->id, 'notes' => $data['notes'] ?? null]
        );

        return back()->with('success', "Anunț transferat către {$target->name}.");
    }

    public function create(): Response|\Illuminate\Http\RedirectResponse
    {
        $user   = request()->user();
        $agency = $user->agency;

        if ($agency && ! $agency->canAddListing()) {
            $limit = $agency->listingsLimit();
            return redirect()->route('properties.index')
                ->with('error', "Ai atins limita de {$limit} anunțuri pe planul curent. Fă upgrade pentru mai multe.");
        }

        return Inertia::render('Properties/Create', [
            'authUser' => [
                'phone' => $user->phone,
                'email' => $user->email,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $agency = $request->user()->agency;
        if ($agency && ! $agency->canAddListing()) {
            $limit = $agency->listingsLimit();
            return redirect()->route('properties.index')
                ->with('error', "Ai atins limita de {$limit} anunțuri pe planul curent. Fă upgrade pentru mai multe.");
        }

        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'type'             => 'required|in:apartment,house,cottage,land,garage,commercial',
            'transaction_type' => 'required|in:sale,rent,inchiriere_zilnica,new_build,exchange,buy',
            'price'            => 'required|numeric|min:0',
            'currency'         => 'required|in:EUR,USD,MDL',
            'area_total'       => 'required|numeric|min:1',
            'area_living'      => 'nullable|numeric|min:0',
            'rooms'            => 'required_if:type,apartment,house,cottage|nullable|integer|min:0',
            'floor'            => 'nullable|integer',
            'floors_total'     => 'nullable|integer|min:1',
            'address'          => 'nullable|string|max:255',
            'city'             => 'required|string|max:100',
            'district'         => 'nullable|string|max:100',
            'latitude'         => 'nullable|numeric',
            'longitude'        => 'nullable|numeric',
            'description_ro'   => 'nullable|string',
            'description_ru'   => 'nullable|string',
            'description_en'   => 'nullable|string',
            'status'           => 'required|in:active,draft,inactive,sold,rented',
            'meta'             => 'nullable|array',
            'cover_index'      => 'nullable|integer|min:0',
            'generate_ai'      => 'nullable|string|in:description,price',
        ] + $this->photoRules());

        $property = Property::create([
            'user_id'          => $request->user()->id,
            'title'            => $validated['title'],
            'type'             => $validated['type'],
            'transaction_type' => $validated['transaction_type'],
            'price'            => $validated['price'] ?? null,
            'currency'         => $validated['currency'],
            'area_total'       => $validated['area_total'] ?? null,
            'area_living'      => $validated['area_living'] ?? null,
            'rooms'            => $validated['rooms'] ?? null,
            'floor'            => $validated['floor'] ?? null,
            'floors_total'     => $validated['floors_total'] ?? null,
            'address'          => $validated['address'] ?? null,
            'city'             => $validated['city'],
            'district'         => $validated['district'] ?? null,
            'latitude'         => $validated['latitude'] ?? null,
            'longitude'        => $validated['longitude'] ?? null,
            'description_ro'   => $validated['description_ro'] ?? null,
            'status'           => $validated['status'],
            'meta'             => $validated['meta'] ?? [],
        ]);

        if ($request->hasFile('photos')) {
            $coverIdx = (int) ($validated['cover_index'] ?? 0);
            foreach ($request->file('photos') as $idx => $photo) {
                $path = $photo->store("properties/{$property->id}", 'public');
                $property->media()->create([
                    'path'       => $path,
                    'is_cover'   => $idx === $coverIdx,
                    'sort_order' => $idx,
                ]);
            }
        }

        $generateAi = $validated['generate_ai'] ?? null;

        if ($generateAi === 'description') {
            \App\Jobs\GeneratePropertyDescriptionJob::dispatch(
                $property->id,
                $request->user()->locale ?? 'ro',
                $request->user()->id
            );
            return redirect()->route('properties.edit', $property)
                ->with('ai_queued', 'Descrierea AI este în curs de generare. Reîncarcă pagina în câteva secunde.');
        }

        if ($generateAi === 'price') {
            \App\Jobs\EstimatePropertyPriceJob::dispatch($property->id);
            return redirect()->route('properties.edit', $property)
                ->with('ai_queued', 'Estimarea prețului AI este în curs. Reîncarcă pagina în câteva secunde.');
        }

        if ($validated['status'] === 'draft') {
            return redirect()->route('properties.index')
                ->with('success', 'Schița a fost salvată.');
        }

        return redirect()->route('properties.show', $property)
            ->with('success', 'Proprietatea a fost adăugată cu succes în secțiunea „Anunțurile mele".');
    }

    public function show(Property $property): Response
    {
        Gate::authorize('view', $property);
        $property->increment('views_count');

        $contracts = \App\Models\GeneratedContract::with(['template', 'contact'])
            ->where('property_id', $property->id)
            ->latest()
            ->get();

        $viewings = \App\Models\CalendarEvent::with(['user', 'contact'])
            ->where('property_id', $property->id)
            ->where('type', 'viewing')
            ->orderBy('starts_at', 'desc')
            ->limit(15)
            ->get();

        $property->load([
            'media',
            'user',
            'notes.user',
            'contacts' => fn ($q) => $q->select('contacts.id', 'first_name', 'last_name', 'phone', 'email', 'type'),
        ]);

        // Internal notes about the owner-contact (relation=owner). Shown as
        // "Comentarii interne" in the property sidebar. Stored as
        // ContactInteraction(type='note') on the owner Contact.
        $ownerContact = $property->contacts->first(
            fn ($c) => ($c->pivot->relation ?? null) === 'owner'
        );
        $ownerNotes = $ownerContact
            ? \App\Models\ContactInteraction::where('contact_id', $ownerContact->id)
                ->where('type', 'note')
                ->with('user:id,name')
                ->latest()
                ->limit(20)
                ->get(['id', 'contact_id', 'user_id', 'type', 'body', 'created_at'])
            : collect();

        $user = request()->user();
        $linkedIds = $property->contacts->pluck('id')->all();
        $availableContacts = \App\Models\Contact::whereNotIn('id', $linkedIds)
            ->select('id', 'first_name', 'last_name', 'phone', 'type')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->limit(100)
            ->get();
        $agencyAgents = $user->isAdmin()
            ? \App\Models\User::withoutGlobalScopes()
                ->where('agency_id', $user->agency_id)
                ->where('id', '!=', $property->user_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
            : collect();

        return Inertia::render('Properties/Show', [
            'property'           => $property,
            'contracts'          => $contracts,
            'viewings'           => $viewings,
            'availableContacts'  => $availableContacts,
            'isAdmin'            => $user->isAdmin(),
            'agencyAgents'       => $agencyAgents,
            'ownerContactId'     => $ownerContact?->id,
            'ownerNotes'         => $ownerNotes,
        ]);
    }

    public function storeNote(Request $request, Property $property)
    {
        Gate::authorize('view', $property);

        $data = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $property->notes()->create([
            'user_id' => $request->user()->id,
            'body'    => $data['body'],
        ]);

        return back()->with('success', 'Comentariu adăugat.');
    }

    public function attachContact(Request $request, Property $property)
    {
        Gate::authorize('update', $property);

        $data = $request->validate([
            'contact_id' => 'required|exists:contacts,id',
            'relation'   => 'required|in:owner,interested,tenant',
            'notes'      => 'nullable|string|max:500',
        ]);

        $property->contacts()->syncWithoutDetaching([
            $data['contact_id'] => [
                'relation' => $data['relation'],
                'notes'    => $data['notes'] ?? null,
            ],
        ]);

        return back()->with('success', 'Clientul a fost asociat proprietății.');
    }

    public function detachContact(Property $property, \App\Models\Contact $contact)
    {
        Gate::authorize('update', $property);

        $property->contacts()->detach($contact->id);

        return back()->with('success', 'Asocierea a fost eliminată.');
    }

    public function edit(Property $property): Response
    {
        Gate::authorize('update', $property);

        $user = request()->user();

        return Inertia::render('Properties/Edit', [
            'property' => $property->load('media'),
            'authUser' => [
                'phone' => $user->phone,
                'email' => $user->email,
            ],
        ]);
    }

    public function update(Request $request, Property $property)
    {
        Gate::authorize('update', $property);

        $validated = $request->validate([
            'title'              => 'required|string|max:255',
            'type'               => 'required|in:apartment,house,cottage,land,garage,commercial',
            'transaction_type'   => 'required|in:sale,rent,inchiriere_zilnica,new_build,exchange,buy',
            'price'              => 'required|numeric|min:0',
            'currency'           => 'required|in:EUR,USD,MDL',
            'area_total'         => 'required|numeric|min:1',
            'area_living'        => 'nullable|numeric|min:0',
            'rooms'              => 'required_if:type,apartment,house,cottage|nullable|integer|min:0',
            'floor'              => 'nullable|integer',
            'floors_total'       => 'nullable|integer|min:1',
            'address'            => 'nullable|string|max:255',
            'city'               => 'required|string|max:100',
            'district'           => 'nullable|string|max:100',
            'latitude'           => 'nullable|numeric',
            'longitude'          => 'nullable|numeric',
            'description_ro'     => 'nullable|string',
            'description_ru'     => 'nullable|string',
            'description_en'     => 'nullable|string',
            'status'             => 'required|in:active,draft,inactive,sold,rented',
            'meta'               => 'nullable|array',
            'cover_index'        => 'nullable|integer|min:0',
            'cover_media_id'     => 'nullable|integer|exists:property_media,id',
            'deleted_media_ids'  => 'nullable|array',
            'deleted_media_ids.*'=> 'integer|exists:property_media,id',
        ] + $this->photoRules());

        $property->update(\Illuminate\Support\Arr::except($validated, [
            'photos', 'cover_index', 'cover_media_id', 'deleted_media_ids',
        ]));

        // Delete media flagged for removal (only those belonging to this property).
        if (! empty($validated['deleted_media_ids'])) {
            $toDelete = $property->media()->whereIn('id', $validated['deleted_media_ids'])->get();
            foreach ($toDelete as $m) {
                if ($m->path && \Storage::disk('public')->exists($m->path)) {
                    \Storage::disk('public')->delete($m->path);
                }
                $m->delete();
            }
        }

        // Append new photos.
        $newMediaIds = [];
        if ($request->hasFile('photos')) {
            $existingMax = (int) $property->media()->max('sort_order');
            foreach ($request->file('photos') as $idx => $photo) {
                $path = $photo->store("properties/{$property->id}", 'public');
                $m = $property->media()->create([
                    'path'       => $path,
                    'is_cover'   => false,
                    'sort_order' => $existingMax + 1 + $idx,
                ]);
                $newMediaIds[] = $m->id;
            }
        }

        // Cover selection: prefer cover_media_id (existing), fallback to cover_index (new uploads).
        if (! empty($validated['cover_media_id'])) {
            $property->media()->update(['is_cover' => false]);
            $property->media()->where('id', $validated['cover_media_id'])->update(['is_cover' => true]);
        } elseif (isset($validated['cover_index']) && isset($newMediaIds[$validated['cover_index']])) {
            $property->media()->update(['is_cover' => false]);
            $property->media()->where('id', $newMediaIds[$validated['cover_index']])->update(['is_cover' => true]);
        }

        return redirect()->route('properties.show', $property)
            ->with('success', 'Proprietatea a fost actualizată.');
    }

    public function destroy(Property $property)
    {
        Gate::authorize('delete', $property);
        $property->delete();

        return redirect()->route('properties.index')
            ->with('success', 'Proprietatea a fost ștearsă.');
    }

    public function toggleFavorite(Request $request, Property $property)
    {
        $user = $request->user();

        if ($user->favoriteProperties()->where('property_id', $property->id)->exists()) {
            $user->favoriteProperties()->detach($property->id);
        } else {
            $user->favoriteProperties()->attach($property->id);
        }

        return back();
    }

    public function updateStatus(Request $request, Property $property)
    {
        Gate::authorize('update', $property);
        $request->validate(['status' => 'required|in:active,inactive,sold,rented']);
        $property->update(['status' => $request->status]);

        return back();
    }

    public function bulkAction(Request $request)
    {
        $request->validate([
            'action' => 'required|in:activate,archive,delete',
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer',
        ]);

        $user  = $request->user();
        $query = Property::whereIn('id', $request->ids)
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id));

        match ($request->action) {
            'activate' => $query->update(['status' => 'active']),
            'archive'  => $query->update(['status' => 'inactive']),
            'delete'   => $query->delete(),
        };

        return back()->with('success', 'Acțiunea a fost aplicată.');
    }
}
