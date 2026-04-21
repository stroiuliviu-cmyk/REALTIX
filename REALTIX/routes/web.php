<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PropertyController;
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
});

require __DIR__.'/auth.php';
