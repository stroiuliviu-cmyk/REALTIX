<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WebOffersController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = ScrapedListing::query()
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title',    'like', "%{$s}%")
                  ->orWhere('city',   'like', "%{$s}%")
                  ->orWhere('district','like', "%{$s}%")
                  ->orWhere('phone',  'like', "%{$s}%");
            }))
            ->when($request->filled('sources') && is_array($request->sources),
                fn ($q) => $q->whereIn('source', $request->sources))
            ->when($request->filled('owner_types') && is_array($request->owner_types),
                fn ($q) => $q->whereIn('owner_type', $request->owner_types))
            ->when($request->filled('types') && is_array($request->types),
                fn ($q) => $q->whereIn('type', $request->types))
            ->when($request->transaction_type,
                fn ($q, $t) => $q->where('transaction_type', $t))
            ->when($request->city,     fn ($q, $c) => $q->where('city',     'like', "%{$c}%"))
            ->when($request->district, fn ($q, $d) => $q->where('district', 'like', "%{$d}%"))
            ->when($request->price_min, fn ($q, $v) => $q->where('price', '>=', (float) $v))
            ->when($request->price_max, fn ($q, $v) => $q->where('price', '<=', (float) $v))
            ->when($request->area_min,  fn ($q, $v) => $q->where('area', '>=', (float) $v))
            ->when($request->area_max,  fn ($q, $v) => $q->where('area', '<=', (float) $v))
            ->when($request->ai_valuation, fn ($q, $v) => $q->where('ai_valuation', $v))
            ->when($request->date_filter, function ($q, $d) {
                match ($d) {
                    'week'  => $q->where('created_at', '>=', now()->subWeek()),
                    'month' => $q->where('created_at', '>=', now()->subMonth()),
                    default => null,
                };
            })
            ->when($request->favorite,
                fn ($q) => $q->whereHas('favoritedByUsers', fn ($fq) => $fq->where('user_id', $user->id)));

        match ($request->sort) {
            'price_asc'   => $query->orderBy('price'),
            'price_desc'  => $query->orderByDesc('price'),
            'cheap_first' => $query->orderByRaw("CASE ai_valuation WHEN 'cheap' THEN 0 WHEN 'average' THEN 1 ELSE 2 END"),
            default       => $query->latest(),
        };

        return Inertia::render('WebOffers/Index', [
            'listings'    => $query->paginate(20)->withQueryString(),
            'filters'     => $request->only([
                'search', 'sources', 'owner_types', 'types', 'transaction_type',
                'city', 'district', 'price_min', 'price_max', 'area_min', 'area_max',
                'ai_valuation', 'date_filter', 'favorite', 'sort',
            ]),
            'favoriteIds' => $user->favoriteScrapedListings()->pluck('scraped_listing_id')->all(),
            'importedIds' => $user->importedScrapedListings()->pluck('scraped_listing_id')->all(),
        ]);
    }

    public function toggleFavorite(Request $request, ScrapedListing $scrapedListing): RedirectResponse
    {
        $user = $request->user();

        if ($user->favoriteScrapedListings()->where('scraped_listing_id', $scrapedListing->id)->exists()) {
            $user->favoriteScrapedListings()->detach($scrapedListing->id);
        } else {
            $user->favoriteScrapedListings()->attach($scrapedListing->id);
        }

        return back();
    }

    public function import(Request $request, ScrapedListing $scrapedListing): RedirectResponse
    {
        $user = $request->user();

        if ($user->importedScrapedListings()->where('scraped_listing_id', $scrapedListing->id)->exists()) {
            return back()->with('info', 'Anunțul a fost deja adăugat la proprietățile tale.');
        }

        $property = Property::create([
            'user_id'          => $user->id,
            'title'            => $scrapedListing->title,
            'type'             => $scrapedListing->type ?? 'apartment',
            'transaction_type' => $scrapedListing->transaction_type ?? 'sale',
            'price'            => $scrapedListing->price,
            'currency'         => $scrapedListing->currency ?? 'EUR',
            'area_total'       => $scrapedListing->area,
            'rooms'            => $scrapedListing->rooms,
            'city'             => $scrapedListing->city ?? 'Chișinău',
            'district'         => $scrapedListing->district,
            'status'           => 'active',
            'meta'             => [
                'imported_from' => $scrapedListing->source,
                'source_url'    => $scrapedListing->external_url,
            ],
        ]);

        $user->importedScrapedListings()->attach($scrapedListing->id, [
            'property_id' => $property->id,
        ]);

        return back()->with('success', 'Anunțul a fost adăugat la proprietățile tale.');
    }
}
