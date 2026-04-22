<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContractTemplateController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\WebOffersController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
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
    Route::post('/properties/bulk-action', [PropertyController::class, 'bulkAction'])->name('properties.bulk');
    Route::resource('properties', PropertyController::class);
    Route::post('/properties/{property}/favorite', [PropertyController::class, 'toggleFavorite'])->name('properties.favorite');
    Route::patch('/properties/{property}/status',  [PropertyController::class, 'updateStatus'])->name('properties.status');

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

    // Web Offers
    Route::get('/web-offers', [WebOffersController::class, 'index'])->name('web-offers.index');
    Route::post('/web-offers/{scrapedListing}/favorite', [WebOffersController::class, 'toggleFavorite'])->name('web-offers.favorite');
    Route::post('/web-offers/{scrapedListing}/import',   [WebOffersController::class, 'import'])->name('web-offers.import');

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

    // Google Calendar OAuth
    Route::get('/google/calendar/connect',    [GoogleCalendarController::class, 'redirect'])->name('google.calendar.connect');
    Route::get('/google/calendar/callback',   [GoogleCalendarController::class, 'callback'])->name('google.calendar.callback');
    Route::post('/google/calendar/disconnect',[GoogleCalendarController::class, 'disconnect'])->name('google.calendar.disconnect');
    Route::post('/google/calendar/sync',      [GoogleCalendarController::class, 'sync'])->name('google.calendar.sync');

    // Settings
    Route::get('/settings', [SettingsController::class, 'show'])->name('settings.index');
    Route::patch('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::patch('/settings/agency', [SettingsController::class, 'updateAgency'])->name('settings.agency');
    Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::patch('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
    Route::patch('/settings/integrations', [SettingsController::class, 'updateIntegrations'])->name('settings.integrations');
    Route::post('/settings/users/invite', [SettingsController::class, 'inviteAgent'])->name('settings.users.invite');
    Route::patch('/settings/users/{user}', [SettingsController::class, 'updateAgent'])->name('settings.users.update');
    Route::delete('/settings/users/{user}', [SettingsController::class, 'removeAgent'])->name('settings.users.remove');
    Route::post('/settings/security/logout-others', [SettingsController::class, 'logoutOtherDevices'])->name('settings.logout.others');
});

require __DIR__.'/auth.php';
