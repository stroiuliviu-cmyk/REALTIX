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
        'onboarding_done',
    ];

    protected $casts = [
        'settings'             => 'array',
        'subscription_ends_at' => 'datetime',
        'trial_ends_at'        => 'datetime',
        'onboarding_done'      => 'boolean',
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

    public function canUseFeature(string $feature): bool
    {
        return in_array($feature, $this->planFeatures(), true);
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
        if ($this->onTrial()) {
            return true;
        }
        return $this->subscription_ends_at !== null && $this->subscription_ends_at->isFuture();
    }

    public function onTrial(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at->isFuture();
    }

    public function trialDaysLeft(): ?int
    {
        if (! $this->onTrial()) {
            return null;
        }
        return (int) ceil(now()->diffInHours($this->trial_ends_at, false) / 24);
    }

    /**
     * True if the current plan allows inviting agents / multi-user team.
     * Starter is single-user only — only Medium and Pro can invite.
     */
    public function canInviteAgents(): bool
    {
        $teamPlans = config('realtix.team_plans', ['medium', 'pro']);
        return in_array($this->subscription_plan, $teamPlans, true);
    }
}
