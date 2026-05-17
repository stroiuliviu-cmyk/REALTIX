<?php

namespace Tests\Feature;

use App\Jobs\BatchMatchingJob;
use App\Jobs\NotifyUserOfMatchesJob;
use App\Models\Agency;
use App\Models\SavedSearch;
use App\Models\ScrapedListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class SavedSearchMatchingTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->agency = Agency::create(['name' => 'Test Agency', 'slug' => 'test-agency']);
        $this->user   = User::factory()->create(['agency_id' => $this->agency->id]);
    }

    /** Helper for building a SavedSearch with arbitrary criteria. */
    private function search(array $criteria, array $overrides = []): SavedSearch
    {
        return SavedSearch::create(array_merge([
            'user_id'   => $this->user->id,
            'agency_id' => $this->agency->id,
            'name'      => 'Test search',
            'criteria'  => $criteria,
            'is_active' => true,
        ], $overrides));
    }

    /** Helper for building a ScrapedListing with sensible defaults. */
    private function listing(array $overrides = []): ScrapedListing
    {
        return ScrapedListing::create(array_merge([
            'agency_id'        => $this->agency->id,
            'source'           => '999md',
            'external_id'      => (string) random_int(100000, 999999),
            'external_url'     => 'https://999.md/ro/' . random_int(100000, 999999),
            'title'            => 'Test listing',
            'price'            => 50000,
            'currency'         => 'EUR',
            'area'             => 60,
            'rooms'            => 2,
            'type'             => 'apartment',
            'transaction_type' => 'sale',
            'owner_type'       => 'owner',
            'city'             => 'Chișinău',
            'district'         => 'Botanica',
        ], $overrides));
    }

    public function test_empty_criteria_matches_anything(): void
    {
        $s = $this->search([]);
        $this->assertTrue($s->matchListing($this->listing()));
    }

    public function test_type_filter(): void
    {
        $s = $this->search(['type' => 'apartment']);
        $this->assertTrue($s->matchListing($this->listing(['type' => 'apartment'])));
        $this->assertFalse($s->matchListing($this->listing(['type' => 'house'])));
    }

    public function test_price_range_inclusive(): void
    {
        $s = $this->search(['price_min' => 40000, 'price_max' => 60000]);
        $this->assertTrue($s->matchListing($this->listing(['price' => 40000])));
        $this->assertTrue($s->matchListing($this->listing(['price' => 60000])));
        $this->assertFalse($s->matchListing($this->listing(['price' => 39999])));
        $this->assertFalse($s->matchListing($this->listing(['price' => 60001])));
    }

    public function test_price_filter_rejects_listings_without_price(): void
    {
        $s = $this->search(['price_max' => 100000]);
        $this->assertFalse($s->matchListing($this->listing(['price' => null])));
    }

    public function test_rooms_and_area_combined(): void
    {
        $s = $this->search(['rooms_min' => 2, 'rooms_max' => 3, 'area_min' => 50]);
        $this->assertTrue($s->matchListing($this->listing(['rooms' => 2, 'area' => 60])));
        $this->assertFalse($s->matchListing($this->listing(['rooms' => 4, 'area' => 60])));
        $this->assertFalse($s->matchListing($this->listing(['rooms' => 2, 'area' => 40])));
    }

    public function test_city_is_case_insensitive_substring(): void
    {
        $s = $this->search(['city' => 'chișin']);
        $this->assertTrue($s->matchListing($this->listing(['city' => 'Chișinău'])));
        $this->assertFalse($s->matchListing($this->listing(['city' => 'Bălți'])));
    }

    public function test_owner_type_filter(): void
    {
        $s = $this->search(['owner_type' => 'owner']);
        $this->assertTrue($s->matchListing($this->listing(['owner_type' => 'owner'])));
        $this->assertFalse($s->matchListing($this->listing(['owner_type' => 'agency'])));
    }

    public function test_batch_matching_marks_listings_processed_and_dispatches_per_user(): void
    {
        // Fake only the inner job so the outer BatchMatchingJob can run for real.
        Bus::fake([NotifyUserOfMatchesJob::class]);

        $this->search(['type' => 'apartment', 'price_max' => 100000]);

        $matching   = $this->listing(['price' => 50000, 'type' => 'apartment']);
        $unrelated  = $this->listing(['price' => 50000, 'type' => 'house']);

        (new BatchMatchingJob())->handle();

        $this->assertNotNull($matching->fresh()->matched_at, 'Matching listing should be marked as processed');
        $this->assertNotNull($unrelated->fresh()->matched_at, 'Unrelated listing should also be marked as processed');

        Bus::assertDispatched(NotifyUserOfMatchesJob::class, function (NotifyUserOfMatchesJob $job) use ($matching) {
            return $job->userId === $this->user->id
                && in_array($matching->id, $job->listingIds, true);
        });
    }

    public function test_batch_matching_skips_already_processed_listings(): void
    {
        Bus::fake([NotifyUserOfMatchesJob::class]);

        $this->search(['type' => 'apartment']);
        // Pre-marked: BatchMatchingJob must not re-evaluate.
        $this->listing(['type' => 'apartment', 'matched_at' => now()]);

        (new BatchMatchingJob())->handle();

        Bus::assertNotDispatched(NotifyUserOfMatchesJob::class);
    }

    public function test_inactive_searches_are_ignored(): void
    {
        Bus::fake([NotifyUserOfMatchesJob::class]);

        $this->search(['type' => 'apartment'], ['is_active' => false]);
        $this->listing(['type' => 'apartment']);

        (new BatchMatchingJob())->handle();

        Bus::assertNotDispatched(NotifyUserOfMatchesJob::class);
    }
}
