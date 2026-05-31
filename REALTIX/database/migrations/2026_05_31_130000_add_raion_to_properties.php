<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent backfill migration for the `raion` column on properties.
 *
 * The column was added directly on prod via ALTER TABLE and populated for
 * existing agency listings. This migration brings the local schema in line
 * with prod and ensures `migrate:fresh` works end-to-end.
 *
 * Guarded with hasColumn so it's a no-op on prod (where the column exists)
 * and creates the column on fresh installs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'raion')) {
                $table->string('raion', 64)->nullable()->after('district');
                $table->index('raion');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'raion')) {
                $table->dropIndex(['raion']);
                $table->dropColumn('raion');
            }
        });
    }
};
