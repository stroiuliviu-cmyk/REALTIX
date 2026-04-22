<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
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
                  ->orWhere('district','like', "%{$s}%")
                  ->orWhere('id', is_numeric($s) ? (int) $s : -1);
            }))
            ->when($request->filled('types') && is_array($request->types), fn ($q) => $q->whereIn('type', $request->types))
            ->when($request->transaction_type, fn ($q, $t) => $q->where('transaction_type', $t))
            ->when($request->filled('statuses') && is_array($request->statuses), fn ($q) => $q->whereIn('status', $request->statuses))
            ->when($request->city,     fn ($q, $c) => $q->where('city',     'like', "%{$c}%"))
            ->when($request->district, fn ($q, $d) => $q->where('district', 'like', "%{$d}%"))
            ->when($request->price_min, fn ($q, $v) => $q->where('price', '>=', (float) $v))
            ->when($request->price_max, fn ($q, $v) => $q->where('price', '<=', (float) $v))
            ->when($request->area_min,  fn ($q, $v) => $q->where('area_total', '>=', (float) $v))
            ->when($request->area_max,  fn ($q, $v) => $q->where('area_total', '<=', (float) $v))
            ->when($request->rooms, function ($q, $r) {
                $r === '5+' ? $q->where('rooms', '>=', 5) : $q->where('rooms', (int) $r);
            })
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

        return Inertia::render('Properties/Index', [
            'properties'  => $query->paginate(20)->withQueryString(),
            'filters'     => $request->only([
                'search', 'types', 'transaction_type', 'statuses',
                'city', 'district', 'rooms',
                'price_min', 'price_max', 'area_min', 'area_max',
                'date_from', 'date_to', 'favorite', 'sort', 'phone',
            ]),
            'isAdmin'     => $isAdmin,
            'authUserId'  => $user->id,
            'favoriteIds' => $user->favoritePropertyIds(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Properties/Create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'type'             => 'required|in:apartment,house,commercial,land',
            'transaction_type' => 'required|in:sale,rent',
            'price'            => 'nullable|numeric|min:0',
            'currency'         => 'required|in:EUR,USD,MDL',
            'area_total'       => 'nullable|numeric|min:0',
            'rooms'            => 'nullable|integer|min:0',
            'floor'            => 'nullable|integer',
            'floors_total'     => 'nullable|integer|min:1',
            'address'          => 'nullable|string|max:255',
            'city'             => 'required|string|max:100',
            'district'         => 'nullable|string|max:100',
            'description_ro'   => 'nullable|string',
            'description_ru'   => 'nullable|string',
            'description_en'   => 'nullable|string',
            'status'           => 'required|in:active,inactive,sold,rented',
        ]);

        $property = Property::create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        return redirect()->route('properties.show', $property)
            ->with('success', 'Proprietatea a fost adăugată cu succes.');
    }

    public function show(Property $property): Response
    {
        Gate::authorize('view', $property);
        $property->increment('views_count');

        return Inertia::render('Properties/Show', [
            'property' => $property->load('media', 'user'),
        ]);
    }

    public function edit(Property $property): Response
    {
        Gate::authorize('update', $property);

        return Inertia::render('Properties/Edit', [
            'property' => $property->load('media'),
        ]);
    }

    public function update(Request $request, Property $property)
    {
        Gate::authorize('update', $property);

        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'type'             => 'required|in:apartment,house,commercial,land',
            'transaction_type' => 'required|in:sale,rent',
            'price'            => 'nullable|numeric|min:0',
            'currency'         => 'required|in:EUR,USD,MDL',
            'area_total'       => 'nullable|numeric|min:0',
            'rooms'            => 'nullable|integer|min:0',
            'floor'            => 'nullable|integer',
            'floors_total'     => 'nullable|integer|min:1',
            'address'          => 'nullable|string|max:255',
            'city'             => 'required|string|max:100',
            'district'         => 'nullable|string|max:100',
            'description_ro'   => 'nullable|string',
            'description_ru'   => 'nullable|string',
            'description_en'   => 'nullable|string',
            'status'           => 'required|in:active,inactive,sold,rented',
        ]);

        $property->update($data);

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
