<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            // Set when BatchMatchingJob has finished evaluating this listing
            // against every active saved_search. Null = not yet processed.
            $table->timestamp('matched_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->dropIndex(['matched_at']);
            $table->dropColumn('matched_at');
        });
    }
};
