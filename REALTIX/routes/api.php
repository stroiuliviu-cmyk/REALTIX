<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    // AI endpoints (Ziua 9)
    // Route::post('/ai/generate-description', [App\Http\Controllers\Api\AiController::class, 'generateDescription']);
    // Route::post('/ai/estimate-price', [App\Http\Controllers\Api\AiController::class, 'estimatePrice']);

    // Media upload (Ziua 11)
    // Route::post('/properties/{property}/media', [App\Http\Controllers\Api\PropertyMediaController::class, 'store']);
    // Route::delete('/media/{media}', [App\Http\Controllers\Api\PropertyMediaController::class, 'destroy']);
    // Route::post('/media/reorder', [App\Http\Controllers\Api\PropertyMediaController::class, 'reorder']);

    // Scraped listings (Ziua 9)
    // Route::get('/scraped-listings', [App\Http\Controllers\ScrapedListingController::class, 'index']);
});
