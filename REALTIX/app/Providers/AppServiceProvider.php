<?php

namespace App\Providers;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Cashier::useCustomerModel(Agency::class);
        Cashier::calculateTaxes();

        Gate::define('admin', fn (User $user) => $user->isAdmin());
    }
}
