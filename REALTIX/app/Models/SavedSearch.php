<?php

namespace App\Models;

use App\Traits\BelongsToAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Persisted search query that a realtor uses to be notified about fresh
 * scraped_listings matching specific criteria. Matching runs in
 * BatchMatchingJob every 30 minutes between 06:30 and 22:30 Chisinau time.
 *
 * `criteria` shape (all optional):
 *  - type:             "apartment" | "house" | "land" | "commercial"
 *  - transaction_type: "sale" | "rent" | "inchiriere_zilnica"
 *  - price_min, price_max:   numeric EUR (we normalize)
 *  - area_min, area_max:     numeric m²
 *  - rooms_min, rooms_max:   integer
 *  - city:                   string (case-insensitive substring match)
 *  - district:               string (case-insensitive substring match)
 *  - owner_type:             "owner" | "agency"
 */
class SavedSearch extends Model
{
    use BelongsToAgency;

    protected $fillable = [
        'user_id', 'agency_id', 'name', 'criteria',
        'notification_channel', 'frequency', 'is_active', 'last_matched_at',
    ];

    protected $casts = [
        'criteria'         => 'array',
        'is_active'        => 'boolean',
        'last_matched_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    /**
     * True when the given listing satisfies every criterion in $this->criteria.
     * Missing fields on the listing are treated as a mismatch when the user
     * required them (i.e. you can't pass a price_min filter on a listing
     * without a price).
     */
    public function matchListing(ScrapedListing $listing): bool
    {
        $c = $this->criteria ?? [];

        if (! empty($c['type']) && $listing->type !== $c['type']) {
            return false;
        }
        if (! empty($c['transaction_type']) && $listing->transaction_type !== $c['transaction_type']) {
            return false;
        }
        if (! empty($c['owner_type']) && $listing->owner_type !== $c['owner_type']) {
            return false;
        }

        if (isset($c['price_min']) || isset($c['price_max'])) {
            if ($listing->price === null) {
                return false;
            }
            if (isset($c['price_min']) && (float) $listing->price < (float) $c['price_min']) {
                return false;
            }
            if (isset($c['price_max']) && (float) $listing->price > (float) $c['price_max']) {
                return false;
            }
        }

        if (isset($c['area_min']) || isset($c['area_max'])) {
            if ($listing->area === null) {
                return false;
            }
            if (isset($c['area_min']) && (float) $listing->area < (float) $c['area_min']) {
                return false;
            }
            if (isset($c['area_max']) && (float) $listing->area > (float) $c['area_max']) {
                return false;
            }
        }

        if (isset($c['rooms_min']) || isset($c['rooms_max'])) {
            if ($listing->rooms === null) {
                return false;
            }
            if (isset($c['rooms_min']) && (int) $listing->rooms < (int) $c['rooms_min']) {
                return false;
            }
            if (isset($c['rooms_max']) && (int) $listing->rooms > (int) $c['rooms_max']) {
                return false;
            }
        }

        if (! empty($c['city']) && ! $this->iContains((string) $listing->city, (string) $c['city'])) {
            return false;
        }
        if (! empty($c['district']) && ! $this->iContains((string) $listing->district, (string) $c['district'])) {
            return false;
        }

        return true;
    }

    private function iContains(string $haystack, string $needle): bool
    {
        if ($needle === '') {
            return true;
        }
        return stripos($haystack, $needle) !== false;
    }
}
