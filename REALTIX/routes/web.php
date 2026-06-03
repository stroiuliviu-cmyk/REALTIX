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
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PhoneInteractionController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\AgencyContextController;
use App\Http\Controllers\AutoPostController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\WebOffersController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\UsersController       as AdminUsersController;
use App\Http\Controllers\Admin\AgenciesController    as AdminAgenciesController;
use App\Http\Controllers\Admin\SubscriptionsController as AdminSubscriptionsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public health endpoint for uptime monitors (no auth, no middleware stack)
Route::get('/health', [\App\Http\Controllers\HealthController::class, 'check'])
    ->name('health');

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('Welcome');
})->name('home');

// Public legal pages — accessible without auth
Route::get('/terms',   fn () => Inertia::render('Legal/Terms'))->name('legal.terms');
Route::get('/privacy', fn () => Inertia::render('Legal/Privacy'))->name('legal.privacy');

// Public invitation accept flow (no auth required)
Route::get('/invitations/{token}',         [InvitationController::class, 'show'])->name('invitations.show');
Route::post('/invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');

Route::post('/language/{locale}', function (string $locale) {
    if (in_array($locale, ['ro', 'ru'])) {
        session(['locale' => $locale]);
        if (auth()->check()) {
            auth()->user()->update(['locale' => $locale]);
        }
    }
    return back();
})->name('language.switch');

// Onboarding — auth + verified email required for everything except the
// agency profile step (which is the first thing after email verification).
Route::middleware(['auth'])->group(function () {
    // Step 4 — agency profile (also gated by `verified` so user must confirm email first)
    Route::middleware('verified')->group(function () {
        Route::get('/onboarding/agency',  [OnboardingController::class, 'agency'])->name('onboarding.agency');
        Route::post('/onboarding/agency', [OnboardingController::class, 'saveAgencyProfile'])->name('onboarding.agency.save');

        // Step 5+6 — plan selection + Stripe Checkout
        Route::get('/onboarding/plan',  [OnboardingController::class, 'plan'])->name('onboarding.plan');
        Route::post('/onboarding/plan', [OnboardingController::class, 'selectPlan'])->name('onboarding.plan.select');
        Route::get('/onboarding/success', [OnboardingController::class, 'success'])->name('onboarding.success');

        // Step 7 — final setup (logo, language, agents, listing)
        Route::get('/onboarding', [OnboardingController::class, 'setup'])->name('onboarding.setup');
        Route::post('/onboarding/complete', [OnboardingController::class, 'complete'])->name('onboarding.complete');
    });

    // Change email before verification
    Route::post('/email/change', function (\Illuminate\Http\Request $request) {
        $request->validate(['email' => 'required|email|unique:users,email']);
        $request->user()->forceFill([
            'email' => $request->email,
            'email_verified_at' => null,
        ])->save();
        $request->user()->sendEmailVerificationNotification();
        return back()->with('status', 'verification-link-sent');
    })->name('email.change');
});

Route::middleware(['auth', 'verified', 'onboarded'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Multi-agency context switcher (team plan only)
    Route::post('/agency/switch/{agency}', [AgencyContextController::class, 'switch'])
        ->middleware('agency.subscription:team')
        ->name('agency.switch');

    // Work routes — blocate când abonamentul nu e activ (past_due/unpaid/canceled/expired).
    // Dashboard, profile, /subscription/*, /settings/*, /notifications/*, onboarding rămân
    // afară din wrapper ca userul să poată plăti și să-și gestioneze contul.
    Route::middleware('agency.subscription')->group(function () {
        // Properties
        Route::post('/properties/bulk-action', [PropertyController::class, 'bulkAction'])->name('properties.bulk');
        Route::resource('properties', PropertyController::class);
        Route::post('/properties/{property}/favorite', [PropertyController::class, 'toggleFavorite'])->name('properties.favorite');
        Route::patch('/properties/{property}/status',  [PropertyController::class, 'updateStatus'])->name('properties.status');
        Route::patch('/properties/{property}/transfer', [PropertyController::class, 'transfer'])->name('properties.transfer');

        // Contacts + interactions
        Route::resource('contacts', ContactController::class)->except(['create', 'edit']);
        Route::patch('/contacts/{contact}/status', [ContactController::class, 'updateStatus'])->name('contacts.status');
        Route::patch('/contacts/{contact}/transfer', [ContactController::class, 'transfer'])->name('contacts.transfer');
        Route::post('contacts/{contact}/interactions', [ContactController::class, 'addInteraction'])
            ->name('contacts.interactions.store');
        Route::patch('contacts/{contact}/interactions/{interaction}', [ContactController::class, 'updateInteraction'])
            ->name('contacts.interactions.update');
        Route::delete('contacts/{contact}/interactions/{interaction}', [ContactController::class, 'destroyInteraction'])
            ->name('contacts.interactions.destroy');
        Route::post('contacts/{contact}/properties',              [ContactController::class, 'attachProperty'])->name('contacts.properties.attach');
        Route::delete('contacts/{contact}/properties/{property}', [ContactController::class, 'detachProperty'])->name('contacts.properties.detach');
        Route::post('properties/{property}/contacts',             [PropertyController::class, 'attachContact'])->name('properties.contacts.attach');
        Route::delete('properties/{property}/contacts/{contact}', [PropertyController::class, 'detachContact'])->name('properties.contacts.detach');
        Route::post('properties/{property}/notes',                [PropertyController::class, 'storeNote'])->name('properties.notes.store');

        // Deals
        Route::resource('deals', DealController::class)->only(['index', 'store', 'update']);

        // Calendar
        Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
        Route::post('/calendar', [CalendarController::class, 'store'])->name('calendar.store');
        Route::patch('/calendar/{calendarEvent}', [CalendarController::class, 'update'])->name('calendar.update');
        Route::patch('/calendar/{calendarEvent}/status', [CalendarController::class, 'updateStatus'])->name('calendar.status');
        Route::delete('/calendar/{calendarEvent}', [CalendarController::class, 'destroy'])->name('calendar.destroy');
    });

    // Settings / Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // AI Tools page + Statistics — wrapped: subscription must be active.
    // (Per-action :feature gating below stays — middleware-ul stacks: întâi
    //  agency.subscription verifică statusul activ, apoi :feature filtrează planul.)
    Route::middleware('agency.subscription')->group(function () {
    // AI Tools page (open, lock applied per-action below)
    Route::get('/ai', fn () => Inertia::render('AiTools/Index'))->name('ai.index');

    // AI web actions — synchronous JSON endpoints (called via fetch from React)
    Route::post('/ai/generate', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'locale'      => 'nullable|in:ro,ru',
            'style'       => 'nullable|in:short,detailed,formal,emotional',
            'data'        => 'required|array',
            'property_id' => 'nullable|integer',
        ]);

        // If property_id provided, verify ownership
        if ($request->filled('property_id')) {
            $prop = \App\Models\Property::findOrFail($request->property_id);
            \Illuminate\Support\Facades\Gate::authorize('update', $prop);
        }

        try {
            $result = app(\App\Services\AiService::class)->generateDescriptionFull(
                $request->data,
                $request->locale ?? 'ro',
                $request->style  ?? 'detailed'
            );
            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    })->middleware('agency.subscription:ai_tools')->name('ai.generate');

    Route::post('/ai/estimate', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'data'        => 'required|array',
            'property_id' => 'nullable|integer',
        ]);

        if ($request->filled('property_id')) {
            $prop = \App\Models\Property::findOrFail($request->property_id);
            \Illuminate\Support\Facades\Gate::authorize('view', $prop);
        }

        try {
            $result = app(\App\Services\AiService::class)->estimatePriceFull($request->data);
            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    })->middleware('agency.subscription:ai_tools')->name('ai.estimate');

    Route::post('/properties/{property}/ai/save-description', function (
        \App\Models\Property $property,
        \Illuminate\Http\Request $request
    ) {
        \Illuminate\Support\Facades\Gate::authorize('update', $property);
        $request->validate(['locale' => 'required|in:ro,ru', 'text' => 'required|string']);
        $property->update(["description_{$request->locale}" => $request->text]);
        return response()->json(['ok' => true]);
    })->middleware('agency.subscription:ai_tools')->name('properties.ai.save-description');

    // Legacy queue-based AI actions (kept for backward compat)
    Route::post('/properties/{property}/ai/description', function (\App\Models\Property $property, \Illuminate\Http\Request $request) {
        \App\Jobs\GeneratePropertyDescriptionJob::dispatch(
            $property->id,
            $request->locale ?? 'ro',
            $request->user()->id
        );
        return back()->with('ai_queued', 'Descrierea AI este în curs de generare. Reîncarcă pagina în câteva secunde.');
    })->middleware('agency.subscription:ai_tools')->name('properties.ai.description');

    Route::post('/properties/{property}/ai/price', function (\App\Models\Property $property, \Illuminate\Http\Request $request) {
        \App\Jobs\EstimatePropertyPriceJob::dispatch($property->id, $request->user()->id);
        return back()->with('ai_queued', 'Estimarea prețului AI este în curs. Reîncarcă pagina în câteva secunde.');
    })->middleware('agency.subscription:ai_tools')->name('properties.ai.price');

    // Statistics
    Route::get('/statistics',             [StatisticsController::class, 'index'])->name('statistics.index');
    Route::get('/statistics/export/pdf',  [StatisticsController::class, 'exportPdf'])->middleware('agency.subscription:export')->name('statistics.export.pdf');
    Route::get('/statistics/export/csv',  [StatisticsController::class, 'exportCsv'])->middleware('agency.subscription:export')->name('statistics.export.csv');
    });

    // Subscription — gated to agency managers + solo realtors (employees on
    // Team/Growth plans can't see or trigger billing actions).
    Route::prefix('subscription')->name('subscription.')->middleware('subscription.manage')->group(function () {
        Route::get('/', [SubscriptionController::class, 'index'])->name('index');
        Route::post('/subscribe/{plan}', [SubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::get('/portal', [SubscriptionController::class, 'portal'])->name('portal');
        Route::get('/success', [SubscriptionController::class, 'success'])->name('success');
        Route::post('/cancel', [SubscriptionController::class, 'cancel'])->name('cancel');
    });

    // Phone interactions + Web Offers + Auto Post + Contracts + Google Calendar
    // — wrapped: abonament activ obligatoriu. Sub-middleware-urile per-feature
    // (:scraper, :autoposting, :pdf_contracts) rămân și filtrează în plus pe plan.
    Route::middleware('agency.subscription')->group(function () {
    // Phone interactions (call/no-answer/viewed log for Web Offers + Properties)
    Route::get('/phone-interactions/last-batch', [PhoneInteractionController::class, 'lastBatch'])->name('phone-interactions.last-batch');
    Route::get('/phone-interactions/{subjectType}/{subjectId}', [PhoneInteractionController::class, 'show'])->name('phone-interactions.show');
    Route::post('/phone-interactions', [PhoneInteractionController::class, 'store'])->name('phone-interactions.store');

    // Web Offers — index/listings open; only active actions need scraper feature
    Route::get('/web-offers', [WebOffersController::class, 'index'])->name('web-offers.index');
    Route::post('/web-offers/sync', [WebOffersController::class, 'sync'])->middleware('agency.subscription:scraper')->name('web-offers.sync');
    Route::post('/web-offers/{scrapedListing}/favorite', [WebOffersController::class, 'toggleFavorite'])->name('web-offers.favorite');
    Route::post('/web-offers/{scrapedListing}/import',   [WebOffersController::class, 'import'])->middleware('agency.subscription:scraper')->name('web-offers.import');

    // Auto Post — index open, actions gated
    Route::get('/autopost', [AutoPostController::class, 'index'])->name('autopost.index');
    Route::middleware('agency.subscription:autoposting')->group(function () {
        Route::post('/autopost', [AutoPostController::class, 'store'])->name('autopost.store');
        Route::post('/autopost/{autoPost}/approve', [AutoPostController::class, 'approve'])->name('autopost.approve');
        Route::post('/autopost/{autoPost}/publish-now', [AutoPostController::class, 'publishNowAction'])->name('autopost.publish-now');
        Route::post('/autopost/{autoPost}/reject', [AutoPostController::class, 'reject'])->name('autopost.reject');
        Route::delete('/autopost/{autoPost}', [AutoPostController::class, 'cancel'])->name('autopost.cancel');
        Route::post('/autopost/{autoPost}/remove', [AutoPostController::class, 'removeEverywhere'])->name('autopost.remove');
    });

    // Contracts (medium+ for generation/upload, index/preview stays open)
    Route::get('/contracts', [ContractTemplateController::class, 'index'])->name('contracts.index');
    Route::get('/contracts/{contractTemplate}/preview', [ContractTemplateController::class, 'preview'])->name('contracts.preview');
    Route::middleware('agency.subscription:pdf_contracts')->group(function () {
        Route::post('/contracts', [ContractTemplateController::class, 'store'])->name('contracts.store');
        Route::patch('/contracts/{contractTemplate}', [ContractTemplateController::class, 'update'])->name('contracts.update');
        Route::delete('/contracts/{contractTemplate}', [ContractTemplateController::class, 'destroy'])->name('contracts.destroy');
        Route::post('/contracts/{contractTemplate}/generate', [ContractTemplateController::class, 'generate'])->name('contracts.generate');
        Route::post('/run-seeder/contracts', [ContractTemplateController::class, 'installDefaults'])->name('contracts.install-defaults');
        Route::post('/contracts/upload', [ContractTemplateController::class, 'uploadDocx'])->name('contracts.upload');
        Route::post('/contracts/extract-docx', [ContractTemplateController::class, 'extractDocx'])->name('contracts.extract-docx');
        Route::get('/contracts/generated/{generatedContract}/docx', [ContractTemplateController::class, 'downloadDocx'])->name('contracts.generated.docx');
    });

    // Google Calendar OAuth
    Route::get('/google/calendar/connect',    [GoogleCalendarController::class, 'redirect'])->name('google.calendar.connect');
    Route::get('/google/calendar/callback',   [GoogleCalendarController::class, 'callback'])->name('google.calendar.callback');
    Route::post('/google/calendar/disconnect',[GoogleCalendarController::class, 'disconnect'])->name('google.calendar.disconnect');
    Route::post('/google/calendar/sync',      [GoogleCalendarController::class, 'sync'])->name('google.calendar.sync');
    });

    // Settings
    Route::get('/settings', [SettingsController::class, 'show'])->name('settings.index');
    // In-app notifications (bell dropdown)
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.read.all');

    Route::patch('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::post('/settings/profile/avatar', [SettingsController::class, 'updateAvatar'])->name('settings.profile.avatar');
    Route::delete('/settings/profile/avatar', [SettingsController::class, 'removeAvatar'])->name('settings.profile.avatar.remove');
    Route::patch('/settings/agency', [SettingsController::class, 'updateAgency'])->name('settings.agency');
    Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::patch('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
    Route::patch('/settings/integrations', [SettingsController::class, 'updateIntegrations'])->name('settings.integrations');
    Route::get('/settings/users/{agent}/login-history', [SettingsController::class, 'loginHistory'])->middleware('agency.subscription:team')->name('settings.users.login-history');
    Route::post('/settings/users/invite', [SettingsController::class, 'inviteAgent'])->middleware('agency.subscription:team')->name('settings.users.invite');
    Route::patch('/settings/users/{agent}', [SettingsController::class, 'updateAgent'])->middleware('agency.subscription:team')->name('settings.users.update');
    Route::delete('/settings/users/{agent}', [SettingsController::class, 'removeAgent'])->middleware('agency.subscription:team')->name('settings.users.remove');
    Route::delete('/settings/invitations/{invitation}',         [SettingsController::class, 'cancelInvitation'])->middleware('agency.subscription:team')->name('settings.invitations.cancel');
    Route::post('/settings/invitations/{invitation}/resend',    [SettingsController::class, 'resendInvitation'])->middleware('agency.subscription:team')->name('settings.invitations.resend');
    Route::post('/settings/security/logout-others', [SettingsController::class, 'logoutOtherDevices'])->name('settings.logout.others');
    Route::patch('/settings/portals', [SettingsController::class, 'updatePortalKeys'])->name('settings.portals');
    Route::get('/settings/portals/discover-categories', [SettingsController::class, 'discoverPortal999Categories'])->name('settings.portals.discover');
});

// User Support (helpdesk tickets) — auth + verified only, NOT onboarded gate
// since support is a critical comm channel even during onboarding issues.
Route::middleware(['auth', 'verified'])->prefix('suport')->name('support.')->group(function () {
    Route::get('/',                [\App\Http\Controllers\SupportController::class, 'index'])->name('index');
    Route::get('/nou',             [\App\Http\Controllers\SupportController::class, 'create'])->name('create');
    Route::post('/',               [\App\Http\Controllers\SupportController::class, 'store'])->name('store');
    Route::get('/{ticket}',        [\App\Http\Controllers\SupportController::class, 'show'])->name('show');
    Route::post('/{ticket}/reply', [\App\Http\Controllers\SupportController::class, 'reply'])->name('reply');
});

// Platform admin (super_admin only)
// Legacy /admin/* prefix kept for backward compat — redirects to /super-admin/*
Route::middleware(['auth', 'super_admin'])->group(function () {
    Route::redirect('/admin', '/super-admin');
    Route::redirect('/admin/users', '/super-admin/users');
    Route::redirect('/admin/agencies', '/super-admin/agencies');
    Route::redirect('/admin/subscriptions', '/super-admin/plans');
});

// SUPER ADMIN PANEL — 19-section enterprise dashboard
Route::middleware(['auth', 'super_admin'])->prefix('super-admin')->name('super-admin.')->group(function () {

    // Sec 1 — Dashboard (real)
    Route::get('/', AdminDashboardController::class)->name('dashboard');

    // Sec 2 — Agencies (real, full CRUD + actions)
    Route::get('/agencies',                    [AdminAgenciesController::class, 'index'])->name('agencies.index');
    Route::get('/agencies/{agency}',           [AdminAgenciesController::class, 'show'])->name('agencies.show');
    Route::post('/agencies/{agency}/suspend',  [AdminAgenciesController::class, 'suspend'])->name('agencies.suspend');
    Route::post('/agencies/{agency}/activate', [AdminAgenciesController::class, 'activate'])->name('agencies.activate');
    Route::patch('/agencies/{agency}/plan',    [AdminAgenciesController::class, 'changePlan'])->name('agencies.plan');
    Route::delete('/agencies/{agency}',        [AdminAgenciesController::class, 'destroy'])->name('agencies.destroy');

    // Sec 3 — Users (real, extended)
    Route::get('/users',                          [AdminUsersController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/toggle-active',   [AdminUsersController::class, 'toggleActive'])->name('users.toggle-active');
    Route::patch('/users/{user}/role',            [AdminUsersController::class, 'setRole'])->name('users.set-role');
    Route::post('/users/{user}/reset-password',   [AdminUsersController::class, 'resetPassword'])->name('users.reset-password');
    Route::post('/users/{user}/force-verify',     [AdminUsersController::class, 'forceVerify'])->name('users.force-verify');
    Route::post('/users/{user}/impersonate',      [AdminUsersController::class, 'impersonate'])->name('users.impersonate');
    Route::post('/users/stop-impersonate',        [AdminUsersController::class, 'stopImpersonate'])->name('users.stop-impersonate');
    Route::delete('/users/{user}',                [AdminUsersController::class, 'destroy'])->name('users.destroy');

    // Sec 6 — Subscription Plans (real, full CRUD)
    Route::get('/plans',           [AdminSubscriptionsController::class, 'index'])->name('plans.index');
    Route::post('/plans',          [AdminSubscriptionsController::class, 'store'])->name('plans.store');
    Route::patch('/plans/{plan}',  [AdminSubscriptionsController::class, 'update'])->name('plans.update');
    Route::delete('/plans/{plan}', [AdminSubscriptionsController::class, 'destroy'])->name('plans.destroy');

    // Sec 4 — Listings (real)
    Route::get('/listings',                          [\App\Http\Controllers\SuperAdmin\ListingsController::class, 'index'])->name('listings.index');
    Route::get('/listings/{property}',               [\App\Http\Controllers\SuperAdmin\ListingsController::class, 'show'])->name('listings.show');
    Route::patch('/listings/{property}/status',      [\App\Http\Controllers\SuperAdmin\ListingsController::class, 'updateStatus'])->name('listings.status');
    Route::post('/listings/{property}/feature',      [\App\Http\Controllers\SuperAdmin\ListingsController::class, 'feature'])->name('listings.feature');
    Route::delete('/listings/{property}',            [\App\Http\Controllers\SuperAdmin\ListingsController::class, 'destroy'])->name('listings.destroy');

    // Sec 10 — Moderation (real)
    Route::get('/moderation',                        [\App\Http\Controllers\SuperAdmin\ModerationController::class, 'index'])->name('moderation.index');
    Route::patch('/moderation/{report}/review',      [\App\Http\Controllers\SuperAdmin\ModerationController::class, 'review'])->name('moderation.review');

    // Sec 5 — Billing (real)
    Route::get('/billing',                                [\App\Http\Controllers\SuperAdmin\BillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/{agency}/cancel',               [\App\Http\Controllers\SuperAdmin\BillingController::class, 'cancelSubscription'])->name('billing.cancel');
    Route::post('/billing/{agency}/refund-last-invoice',  [\App\Http\Controllers\SuperAdmin\BillingController::class, 'refundLastInvoice'])->name('billing.refund');

    // Sec 11 — Analytics (real)
    Route::get('/analytics',                              [\App\Http\Controllers\SuperAdmin\AnalyticsController::class, 'index'])->name('analytics.index');

    // Sec 12 — System Health (real)
    Route::get('/system-health',                          [\App\Http\Controllers\SuperAdmin\SystemHealthController::class, 'index'])->name('system-health.index');

    // Sec 13 — Logs (real)
    Route::get('/logs',                                   [\App\Http\Controllers\SuperAdmin\LogsController::class, 'index'])->name('logs.index');

    // Sec 18 — Security (real)
    Route::get('/security',                               [\App\Http\Controllers\SuperAdmin\SecurityController::class, 'index'])->name('security.index');
    Route::post('/security/blacklist',                    [\App\Http\Controllers\SuperAdmin\SecurityController::class, 'blacklistIp'])->name('security.blacklist');
    Route::delete('/security/blacklist/{entry}',          [\App\Http\Controllers\SuperAdmin\SecurityController::class, 'unblacklistIp'])->name('security.unblacklist');

    // Sec 15 — Feature Flags (real)
    Route::get('/feature-flags',                          [\App\Http\Controllers\SuperAdmin\FeatureFlagsController::class, 'index'])->name('feature-flags.index');
    Route::post('/feature-flags',                         [\App\Http\Controllers\SuperAdmin\FeatureFlagsController::class, 'store'])->name('feature-flags.store');
    Route::patch('/feature-flags/{flag}',                 [\App\Http\Controllers\SuperAdmin\FeatureFlagsController::class, 'update'])->name('feature-flags.update');
    Route::delete('/feature-flags/{flag}',                [\App\Http\Controllers\SuperAdmin\FeatureFlagsController::class, 'destroy'])->name('feature-flags.destroy');

    // Sec 19 — Platform Settings (real)
    Route::get('/settings',                               [\App\Http\Controllers\SuperAdmin\PlatformSettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings/maintenance',                  [\App\Http\Controllers\SuperAdmin\PlatformSettingsController::class, 'toggleMaintenance'])->name('settings.maintenance');
    Route::post('/settings/cache/clear',                  [\App\Http\Controllers\SuperAdmin\PlatformSettingsController::class, 'clearCache'])->name('settings.cache.clear');

    // Sec 14 — Support (real)
    Route::get('/support',                                [\App\Http\Controllers\SuperAdmin\SupportController::class, 'index'])->name('support.index');
    Route::get('/support/{ticket}',                       [\App\Http\Controllers\SuperAdmin\SupportController::class, 'show'])->name('support.show');
    Route::post('/support/{ticket}/reply',                [\App\Http\Controllers\SuperAdmin\SupportController::class, 'reply'])->name('support.reply');
    Route::patch('/support/{ticket}/status',              [\App\Http\Controllers\SuperAdmin\SupportController::class, 'updateStatus'])->name('support.status');
    Route::patch('/support/{ticket}/assign',              [\App\Http\Controllers\SuperAdmin\SupportController::class, 'assign'])->name('support.assign');

    // Sec 7 — AI System (real)
    Route::get('/ai',                                     [\App\Http\Controllers\SuperAdmin\AiSystemController::class, 'index'])->name('ai.index');
    Route::post('/ai/kill-switch',                        [\App\Http\Controllers\SuperAdmin\AiSystemController::class, 'toggleKillSwitch'])->name('ai.kill-switch');

    // Sec 8 — 999.md Integration (real)
    Route::get('/integrations/999md',                     [\App\Http\Controllers\SuperAdmin\Portal999Controller::class, 'index'])->name('portal-999.index');
    Route::post('/integrations/999md/sync',               [\App\Http\Controllers\SuperAdmin\Portal999Controller::class, 'triggerSync'])->name('portal-999.sync');

    // Sec 9 — CRM Monitoring (real)
    Route::get('/crm',                                    [\App\Http\Controllers\SuperAdmin\CrmMonitoringController::class, 'index'])->name('crm.index');

    // Sec 16 — Email System (real)
    Route::get('/email',                                  [\App\Http\Controllers\SuperAdmin\EmailSystemController::class, 'index'])->name('email.index');
    Route::post('/email/retry-failed',                    [\App\Http\Controllers\SuperAdmin\EmailSystemController::class, 'retryFailed'])->name('email.retry');
    Route::post('/email/flush-failed',                    [\App\Http\Controllers\SuperAdmin\EmailSystemController::class, 'flushFailed'])->name('email.flush');

    // Sec 17 — Storage (real)
    Route::get('/storage',                                [\App\Http\Controllers\SuperAdmin\StorageController::class, 'index'])->name('storage.index');
});

require __DIR__.'/auth.php';
