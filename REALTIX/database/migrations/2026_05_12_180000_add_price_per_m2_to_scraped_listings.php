<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            // Price per square meter as shown on 999.md. Nullable because:
            //  - some listings have no area (land plots without m² metric)
            //  - extraction may fail; we keep null instead of guessing
            $table->decimal('price_per_m2', 10, 2)->nullable()->after('area');
        });
    }

    public function down(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->dropColumn('price_per_m2');
        });
    }
};
