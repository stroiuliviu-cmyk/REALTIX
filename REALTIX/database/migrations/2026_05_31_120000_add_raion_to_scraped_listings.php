<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent backfill migration for the `raion` column on scraped_listings.
 *
 * The column was added directly on prod via ALTER TABLE and already populated
 * for ~13k existing rows. This migration brings the local schema in line with
 * prod and ensures `migrate:fresh` works end-to-end.
 *
 * Guarded with hasColumn so it's a no-op on prod (where the column exists)
 * and creates the column on fresh installs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            if (! Schema::hasColumn('scraped_listings', 'raion')) {
                $table->string('raion', 64)->nullable()->after('district');
                $table->index('raion');
            }
        });
    }

    public function down(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            if (Schema::hasColumn('scraped_listings', 'raion')) {
                $table->dropIndex(['raion']);
                $table->dropColumn('raion');
            }
        });
    }
};
