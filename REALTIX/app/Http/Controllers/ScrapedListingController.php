<?php

namespace App\Http\Controllers;

use App\Models\ScrapedListing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScrapedListingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $listings = ScrapedListing::query()
            ->when($request->source, fn ($q, $s) => $q->where('source', $s))
            ->when($request->valuation, fn ($q, $v) => $q->where('ai_valuation', $v))
            ->latest()
            ->paginate(24)
            ->through(fn ($l) => [
                'id'           => $l->id,
                'title'        => $l->title,
                'price'        => $l->price,
                'source'       => $l->source,
                'external_url' => $l->external_url,
                'images'       => $l->images ?? [],
                'ai_valuation' => $l->ai_valuation,
                'city'         => $l->raw_data['city'] ?? null,
                'district'     => $l->raw_data['district'] ?? null,
                'area'         => $l->raw_data['area'] ?? null,
            ]);

        return response()->json($listings);
    }
}
