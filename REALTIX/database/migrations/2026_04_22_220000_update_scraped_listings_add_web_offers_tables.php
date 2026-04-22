<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->string('type')->nullable()->after('rooms');
            $table->string('transaction_type')->nullable()->after('type');
            $table->string('owner_type')->nullable()->after('transaction_type'); // owner, agency
            $table->timestamp('published_at')->nullable()->after('owner_type');
            $table->string('phone')->nullable()->after('published_at');
        });

        Schema::create('scraped_listing_favorites', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scraped_listing_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'scraped_listing_id']);
        });

        Schema::create('scraped_listing_imports', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scraped_listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'scraped_listing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scraped_listing_imports');
        Schema::dropIfExists('scraped_listing_favorites');
        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->dropColumn(['type', 'transaction_type', 'owner_type', 'published_at', 'phone']);
        });
    }
};
