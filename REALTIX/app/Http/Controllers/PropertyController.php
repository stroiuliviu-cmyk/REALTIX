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
        $query = Property::with('coverMedia')
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('address', 'like', "%{$s}%")
                  ->orWhere('district', 'like', "%{$s}%");
            }))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->transaction_type, fn ($q, $t) => $q->where('transaction_type', $t))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->city, fn ($q, $c) => $q->where('city', $c))
            ->when($request->rooms, fn ($q, $r) => $q->where('rooms', (int) $r))
            ->when($request->price_min, fn ($q, $v) => $q->where('price', '>=', (float) $v))
            ->when($request->price_max, fn ($q, $v) => $q->where('price', '<=', (float) $v))
            ->when($request->ai_valuation, fn ($q, $v) => $q->where('ai_valuation', $v))
            ->latest();

        return Inertia::render('Properties/Index', [
            'properties' => $query->paginate(12)->withQueryString(),
            'filters' => $request->only([
                'search', 'type', 'transaction_type', 'status',
                'city', 'rooms', 'price_min', 'price_max', 'ai_valuation',
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Properties/Create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:apartment,house,commercial,land',
            'transaction_type' => 'required|in:sale,rent',
            'price' => 'nullable|numeric|min:0',
            'currency' => 'required|in:EUR,USD,MDL',
            'area_total' => 'nullable|numeric|min:0',
            'rooms' => 'nullable|integer|min:0',
            'floor' => 'nullable|integer',
            'floors_total' => 'nullable|integer|min:1',
            'address' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'district' => 'nullable|string|max:100',
            'description_ro' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'description_en' => 'nullable|string',
            'status' => 'required|in:active,inactive,sold,rented',
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
            'title' => 'required|string|max:255',
            'type' => 'required|in:apartment,house,commercial,land',
            'transaction_type' => 'required|in:sale,rent',
            'price' => 'nullable|numeric|min:0',
            'currency' => 'required|in:EUR,USD,MDL',
            'area_total' => 'nullable|numeric|min:0',
            'rooms' => 'nullable|integer|min:0',
            'floor' => 'nullable|integer',
            'floors_total' => 'nullable|integer|min:1',
            'address' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'district' => 'nullable|string|max:100',
            'description_ro' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'description_en' => 'nullable|string',
            'status' => 'required|in:active,inactive,sold,rented',
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
}
