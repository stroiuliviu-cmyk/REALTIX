<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\Agency;
use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use App\Models\User;
use App\Observers\CalendarEventObserver;
use App\Observers\ContactObserver;
use App\Observers\DealObserver;
use App\Observers\PropertyObserver;
use Illuminate\Auth\Events\Failed as LoginFailed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;
use Laravel\Cashier\Cashier;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Override Cashier's default webhook controller with our own to sync subscription_plan locally.
        $this->app->bind(
            \Laravel\Cashier\Http\Controllers\WebhookController::class,
            \App\Http\Controllers\StripeWebhookController::class,
        );
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Event::listen(SocialiteWasCalled::class, \SocialiteProviders\Apple\AppleExtendSocialite::class . '@handle');
        Event::listen(SocialiteWasCalled::class, \SocialiteProviders\Azure\AzureExtendSocialite::class . '@handle');
        Cashier::useCustomerModel(Agency::class);
        Cashier::calculateTaxes();

        Gate::define('admin', fn (User $user) => $user->isAdmin());
        Gate::define('super_admin', fn (User $user) => $user->isSuperAdmin());

        Deal::observe(DealObserver::class);
        Property::observe(PropertyObserver::class);
        Contact::observe(ContactObserver::class);
        CalendarEvent::observe(CalendarEventObserver::class);

        Event::listen(Login::class, function (Login $e) {
            ActivityLog::record('auth.login', null, 'Autentificare reușită');

            // New-IP detection: alert agency admins if this IP wasn't seen before
            $ip = request()->ip();
            $userId = $e->user->id;
            $seenBefore = ActivityLog::where('user_id', $userId)
                ->where('action', 'auth.login')
                ->where('ip_address', $ip)
                ->where('id', '<', ActivityLog::max('id')) // exclude the row just inserted
                ->exists();
            $hasPriorLogins = ActivityLog::where('user_id', $userId)
                ->where('action', 'auth.login')
                ->where('id', '<', ActivityLog::max('id'))
                ->exists();

            if (! $seenBefore && $hasPriorLogins && $e->user->agency_id) {
                $admins = User::where('agency_id', $e->user->agency_id)
                    ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
                    ->where('id', '!=', $userId)
                    ->get();
                foreach ($admins as $admin) {
                    $admin->notify(new \App\Notifications\NewIpLoginDetected($e->user, $ip, request()->userAgent()));
                }
            }
        });
        Event::listen(Logout::class, function (Logout $e) {
            if ($e->user) {
                ActivityLog::record('auth.logout', null, 'Deconectare');
            }
        });
        Event::listen(LoginFailed::class, function (LoginFailed $e) {
            $email = $e->credentials['email'] ?? null;
            if ($email) {
                ActivityLog::record('auth.failed', null, "Încercare eșuată pentru {$email}");
            }
        });
    }
}
