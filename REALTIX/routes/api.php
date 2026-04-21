<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    // AI endpoints
    Route::post('/ai/generate-description', [App\Http\Controllers\Api\AiController::class, 'generateDescription']);
    Route::post('/ai/estimate-price', [App\Http\Controllers\Api\AiController::class, 'estimatePrice']);

    // Scraped listings
    Route::get('/scraped-listings', [App\Http\Controllers\ScrapedListingController::class, 'index']);
});
