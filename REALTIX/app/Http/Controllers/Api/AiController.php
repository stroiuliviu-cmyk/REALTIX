<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\EstimatePropertyPriceJob;
use App\Jobs\GeneratePropertyDescriptionJob;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function generateDescription(Request $request): JsonResponse
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'locale'      => 'nullable|in:ro,ru,en',
        ]);

        $property = Property::findOrFail($request->property_id);

        GeneratePropertyDescriptionJob::dispatch(
            $property->id,
            $request->locale ?? 'ro',
            $request->user()->id,
        );

        return response()->json(['message' => 'Generarea descrierii a fost adăugată în coadă.']);
    }

    public function estimatePrice(Request $request): JsonResponse
    {
        $request->validate(['property_id' => 'required|exists:properties,id']);

        $property = Property::findOrFail($request->property_id);

        EstimatePropertyPriceJob::dispatch($property->id);

        return response()->json(['message' => 'Estimarea prețului a fost adăugată în coadă.']);
    }
}
