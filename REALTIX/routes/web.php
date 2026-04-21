<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContractTemplateController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::post('/language/{locale}', function (string $locale) {
    if (in_array($locale, ['ro', 'ru', 'en'])) {
        session(['locale' => $locale]);
        if (auth()->check()) {
            auth()->user()->update(['locale' => $locale]);
        }
    }
    return back();
})->name('language.switch');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Properties
    Route::resource('properties', PropertyController::class);

    // Contacts + interactions
    Route::resource('contacts', ContactController::class)->except(['create', 'edit']);
    Route::post('contacts/{contact}/interactions', [ContactController::class, 'addInteraction'])
        ->name('contacts.interactions.store');

    // Deals
    Route::resource('deals', DealController::class)->only(['index', 'store', 'update']);

    // Calendar
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::post('/calendar', [CalendarController::class, 'store'])->name('calendar.store');
    Route::delete('/calendar/{calendarEvent}', [CalendarController::class, 'destroy'])->name('calendar.destroy');

    // Settings / Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // AI web actions (dispatch queue jobs, Inertia-friendly)
    Route::post('/properties/{property}/ai/description', function (\App\Models\Property $property, \Illuminate\Http\Request $request) {
        \App\Jobs\GeneratePropertyDescriptionJob::dispatch(
            $property->id,
            $request->locale ?? 'ro',
            $request->user()->id
        );
        return back()->with('ai_queued', 'Descrierea AI este în curs de generare. Reîncarcă pagina în câteva secunde.');
    })->name('properties.ai.description');

    Route::post('/properties/{property}/ai/price', function (\App\Models\Property $property) {
        \App\Jobs\EstimatePropertyPriceJob::dispatch($property->id);
        return back()->with('ai_queued', 'Estimarea prețului AI este în curs. Reîncarcă pagina în câteva secunde.');
    })->name('properties.ai.price');

    // Statistics
    Route::get('/statistics', [StatisticsController::class, 'index'])->name('statistics.index');

    // Subscription
    Route::prefix('subscription')->name('subscription.')->group(function () {
        Route::get('/', [SubscriptionController::class, 'index'])->name('index');
        Route::post('/subscribe/{plan}', [SubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::get('/portal', [SubscriptionController::class, 'portal'])->name('portal');
        Route::get('/success', [SubscriptionController::class, 'success'])->name('success');
        Route::post('/cancel', [SubscriptionController::class, 'cancel'])->name('cancel');
    });

    // Web Offers (scraped listings placeholder)
    Route::get('/web-offers', function () {
        return Inertia::render('WebOffers/Index', ['listings' => [], 'filters' => []]);
    })->name('web-offers.index');

    // Auto Post
    Route::get('/autopost', function () {
        return Inertia::render('AutoPost/Index', ['requests' => []]);
    })->name('autopost.index');

    // Contracts
    Route::get('/contracts', [ContractTemplateController::class, 'index'])->name('contracts.index');
    Route::post('/contracts', [ContractTemplateController::class, 'store'])->name('contracts.store');
    Route::patch('/contracts/{contractTemplate}', [ContractTemplateController::class, 'update'])->name('contracts.update');
    Route::delete('/contracts/{contractTemplate}', [ContractTemplateController::class, 'destroy'])->name('contracts.destroy');
    Route::post('/contracts/{contractTemplate}/generate', [ContractTemplateController::class, 'generate'])->name('contracts.generate');

    // Settings (full settings page)
    Route::get('/settings', function () {
        return Inertia::render('Settings/Index', [
            'user'   => auth()->user()->load('agency'),
            'agency' => auth()->user()->agency,
        ]);
    })->name('settings.index');
});

require __DIR__.'/auth.php';
