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
use App\Listeners\MergeAnonymousAssistantData;
use Illuminate\Auth\Events\Failed as LoginFailed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Registered;
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

        // Public, contact-free catalog seam (assistant). UI/Application depend on
        // the contract; only Infrastructure\Catalog touches the Eloquent models.
        $this->app->bind(
            \App\Domain\Catalog\Contracts\PublicCatalog::class,
            \App\Infrastructure\Catalog\EloquentPublicCatalog::class,
        );

        // Streaming LLM seam (assistant). ChatService depends on the contract;
        // the provider-specific HTTP/SSE code stays in Infrastructure\Llm.
        // Furnizorul activ se alege din config('assistant.provider'):
        // 'groq' (OpenAI-compatible, gratuit) sau 'anthropic' (implicit).
        $this->app->bind(
            \App\Domain\Assistant\Contracts\LlmClient::class,
            fn ($app) => match ((string) config('assistant.provider', 'anthropic')) {
                'groq' => $app->make(\App\Infrastructure\Llm\GroqClient::class),
                default => $app->make(\App\Infrastructure\Llm\AnthropicClient::class),
            },
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

        // Transfer anonymous assistant data (favorites, quota, conversations)
        // onto the account at login/register. Idempotent; no-op without owner_token.
        Event::listen(Login::class, [MergeAnonymousAssistantData::class, 'handle']);
        Event::listen(Registered::class, [MergeAnonymousAssistantData::class, 'handle']);

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
