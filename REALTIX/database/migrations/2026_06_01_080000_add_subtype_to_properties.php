<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent migration mirroring scraped_listings.subtype. Properties get the
 * same column so the expandable Type filter on the agency listings page can
 * filter on subtype identically to the Web Offers facet. Existing agency rows
 * stay NULL — there's no automated subtype assignment for manually-entered
 * properties yet; the column is available for future enrichment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'subtype')) {
                $table->string('subtype', 50)->nullable()->after('type');
                $table->index('subtype');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'subtype')) {
                $table->dropIndex(['subtype']);
                $table->dropColumn('subtype');
            }
        });
    }
};
