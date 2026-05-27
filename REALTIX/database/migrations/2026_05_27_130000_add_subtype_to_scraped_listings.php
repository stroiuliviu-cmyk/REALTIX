<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent backfill migration for subtype + extra_flags columns.
 *
 * These columns were originally added directly on prod via raw DDL (no
 * Laravel migration in the repo). This migration brings the local schema
 * in line with prod and ensures fresh `migrate:fresh` works end-to-end.
 *
 * Guarded with hasColumn so it's safe to run on prod too — if the columns
 * already exist (which they do on Forge), the migration is a no-op.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            if (! Schema::hasColumn('scraped_listings', 'subtype')) {
                $table->string('subtype', 50)->nullable()->after('owner_type');
                $table->index('subtype');
            }
            if (! Schema::hasColumn('scraped_listings', 'extra_flags')) {
                $table->jsonb('extra_flags')->nullable()->after('subtype');
            }
        });
    }

    public function down(): void
    {
        Schema::table('scraped_listings', function (Blueprint $table) {
            if (Schema::hasColumn('scraped_listings', 'extra_flags')) {
                $table->dropColumn('extra_flags');
            }
            if (Schema::hasColumn('scraped_listings', 'subtype')) {
                $table->dropIndex(['subtype']);
                $table->dropColumn('subtype');
            }
        });
    }
};
