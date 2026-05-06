<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            // Property characteristics
            $table->integer('floor')->nullable()->after('rooms');
            $table->integer('floors_total')->nullable()->after('floor');
            $table->string('address', 255)->nullable()->after('district');
            $table->integer('year_built')->nullable()->after('address');

            // Condition / state
            $table->string('condition', 50)->nullable()->after('year_built'); // new, renovated, needs_renovation
            $table->string('building_type', 50)->nullable()->after('condition'); // panel, brick, monolith
            $table->string('heating', 50)->nullable()->after('building_type');

            // Boolean amenities
            $table->boolean('furnished')->nullable()->after('heating');
            $table->boolean('parking')->nullable()->after('furnished');
            $table->boolean('balcony')->nullable()->after('parking');
            $table->boolean('elevator')->nullable()->after('balcony');
            $table->boolean('pets_allowed')->nullable()->after('elevator');
            $table->boolean('air_conditioning')->nullable()->after('pets_allowed');

            // Full description directly on the row (was only in raw_data)
            $table->text('description')->nullable()->after('air_conditioning');
        });
    }

    public function down(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->dropColumn([
                'floor', 'floors_total', 'address', 'year_built',
                'condition', 'building_type', 'heating',
                'furnished', 'parking', 'balcony', 'elevator', 'pets_allowed', 'air_conditioning',
                'description',
            ]);
        });
    }
};
