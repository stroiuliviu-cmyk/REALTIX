<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'social_provider',
        'social_id',
        'email_verified_at',
        'agency_id',
        'phone',
        'whatsapp',
        'viber',
        'telegram',
        'avatar_path',
        'position',
        'locale',
        'timezone',
        'notification_prefs',
        'google_access_token',
        'google_refresh_token',
        'google_token_expires_at',
        'google_calendar_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'  => 'datetime',
            'password'           => 'hashed',
            'is_active'          => 'boolean',
            'notification_prefs'       => 'array',
            'google_token_expires_at'  => 'datetime',
        ];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    /**
     * All agencies this user has access to (multi-agency support).
     * Pivot stores the role per agency.
     */
    public function linkedAgencies(): BelongsToMany
    {
        return $this->belongsToMany(Agency::class, 'agency_user_links')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function linkToAgency(int $agencyId, string $role = 'realtor'): void
    {
        $this->linkedAgencies()->syncWithoutDetaching([
            $agencyId => ['role' => $role],
        ]);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function favoriteScrapedListings(): BelongsToMany
    {
        return $this->belongsToMany(ScrapedListing::class, 'scraped_listing_favorites')->withTimestamps();
    }

    public function importedScrapedListings(): BelongsToMany
    {
        return $this->belongsToMany(ScrapedListing::class, 'scraped_listing_imports')
            ->withPivot('property_id')->withTimestamps();
    }

    public function favoriteProperties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'property_favorites')->withTimestamps();
    }

    public function favoritePropertyIds(): array
    {
        return $this->favoriteProperties()->pluck('property_id')->all();
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isRealtor(): bool
    {
        return $this->hasRole('realtor');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }
}
