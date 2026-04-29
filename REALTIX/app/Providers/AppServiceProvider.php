<?php

namespace App\Providers;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;
use Laravel\Cashier\Cashier;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Event::listen(SocialiteWasCalled::class, \SocialiteProviders\Apple\AppleExtendSocialite::class . '@handle');
        Event::listen(SocialiteWasCalled::class, \SocialiteProviders\Azure\AzureExtendSocialite::class . '@handle');
        Cashier::useCustomerModel(Agency::class);
        Cashier::calculateTaxes();

        Gate::define('admin', fn (User $user) => $user->isAdmin());
        Gate::define('super_admin', fn (User $user) => $user->isSuperAdmin());
    }
}
