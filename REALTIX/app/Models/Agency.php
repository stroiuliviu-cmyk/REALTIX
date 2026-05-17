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
        'profile_filled',
        'suspended_at',
    ];

    protected $casts = [
        'settings'             => 'array',
        'subscription_ends_at' => 'datetime',
        'trial_ends_at'        => 'datetime',
        'onboarding_done'      => 'boolean',
        'profile_filled'       => 'boolean',
        'suspended_at'         => 'datetime',
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
        if ($this->inTrialPeriod()) {
            return true;
        }
        return $this->subscription_ends_at !== null && $this->subscription_ends_at->isFuture();
    }

    /**
     * Local trial check (based on agencies.trial_ends_at column).
     * Distinct from Cashier's onTrial() which checks the Stripe subscription's trial.
     */
    public function inTrialPeriod(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at->isFuture();
    }

    public function trialDaysLeft(): ?int
    {
        if (! $this->inTrialPeriod()) {
            return null;
        }
        return (int) ceil(now()->diffInHours($this->trial_ends_at, false) / 24);
    }

    /**
     * True if the current plan allows inviting agents / multi-user team.
     * Solo is single-user only — only Team and Growth can invite.
     */
    public function canInviteAgents(): bool
    {
        $teamPlans = config('realtix.team_plans', ['medium', 'pro']);
        return in_array($this->subscription_plan, $teamPlans, true);
    }

    /**
     * True if there's still room within the plan's seat limit. Pending
     * invitations count too — otherwise admin could over-invite.
     */
    public function canInviteMoreAgents(): bool
    {
        if (! $this->canInviteAgents()) {
            return false;
        }
        $limit = $this->seatsLimit();
        if ($limit === null) {
            return true; // unlimited (Growth)
        }
        return $this->seatsUsed() < $limit;
    }

    /** Hard cap on agents for the current plan, or null when unlimited. */
    public function seatsLimit(): ?int
    {
        $plan = SubscriptionPlan::where('slug', $this->subscription_plan)->first();
        if (! $plan || (int) $plan->max_realtors <= 0) {
            return null;
        }
        return (int) $plan->max_realtors;
    }

    /** Seats currently consumed: linked users + pending invitations. */
    public function seatsUsed(): int
    {
        $primaryIds = $this->users()->pluck('users.id');
        $linkedIds  = \DB::table('agency_user_links')
            ->where('agency_id', $this->id)
            ->pluck('user_id');
        $accepted = $primaryIds->merge($linkedIds)->unique()->count();

        $pending = \App\Models\AgencyInvitation::where('agency_id', $this->id)
            ->whereNull('accepted_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->count();

        return $accepted + $pending;
    }

    /**
     * Active listing slot quota for the current plan. Returns null when unlimited.
     */
    public function listingsLimit(): ?int
    {
        $plan = SubscriptionPlan::where('slug', $this->subscription_plan)->first();
        if (! $plan || (int) $plan->max_listings <= 0) {
            return null;
        }
        return (int) $plan->max_listings;
    }

    public function listingsCount(): int
    {
        return $this->properties()->count();
    }

    public function canAddListing(): bool
    {
        $limit = $this->listingsLimit();
        if ($limit === null) {
            return true;
        }
        return $this->listingsCount() < $limit;
    }
}
