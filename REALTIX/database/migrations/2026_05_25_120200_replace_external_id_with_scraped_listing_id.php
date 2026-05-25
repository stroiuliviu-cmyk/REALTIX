<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // New: structured reference to internal scraped_listings.id
            if (! Schema::hasColumn('properties', 'scraped_listing_id')) {
                $table->unsignedBigInteger('scraped_listing_id')->nullable()->after('source');
                $table->index('scraped_listing_id');
            }
        });

        // Backfill scraped_listing_id from existing external_id.
        // withoutGlobalScopes() bypasses BelongsToAgency since migrations
        // run without auth context.
        \App\Models\Property::withoutGlobalScopes()
            ->whereNotNull('external_id')
            ->each(function ($p) {
                $scraped = \App\Models\ScrapedListing::where('source', $p->source)
                    ->where('external_id', $p->external_id)
                    ->first();
                if ($scraped) {
                    $p->scraped_listing_id = $scraped->id;
                    $p->saveQuietly();
                }
            });

        // Drop old external_id column (we don't need it on properties anymore)
        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'external_id')) {
                $table->dropIndex(['source', 'external_id']);
                $table->dropColumn('external_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'external_id')) {
                $table->string('external_id', 100)->nullable()->after('source');
                $table->index(['source', 'external_id']);
            }
            if (Schema::hasColumn('properties', 'scraped_listing_id')) {
                $table->dropIndex(['scraped_listing_id']);
                $table->dropColumn('scraped_listing_id');
            }
        });
    }
};
