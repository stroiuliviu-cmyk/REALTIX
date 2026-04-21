<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Cashier\Billable;

class Agency extends Model
{
    use HasFactory, Billable;

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'settings',
        'subscription_plan',
        'subscription_ends_at',
        'stripe_customer_id',
        'stripe_subscription_id',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
    ];

    protected $casts = [
        'settings' => 'array',
        'subscription_ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function planFeatures(): array
    {
        return config('realtix.plan_features.' . $this->subscription_plan, []);
    }

    public function isOnPlan(string $plan): bool
    {
        return $this->subscription_plan === $plan;
    }

    public function isSubscriptionActive(): bool
    {
        if ($this->subscribed('default')) {
            return true;
        }
        if ($this->subscription_plan === 'starter') {
            return true;
        }
        return $this->subscription_ends_at !== null && $this->subscription_ends_at->isFuture();
    }
}
