<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Source identifier (null for manual entries, '999md' for imported)
            if (! Schema::hasColumn('properties', 'source')) {
                $table->string('source', 50)->nullable()->after('user_id');
            }
            // External ID from source (e.g. "103867236" from 999.md)
            if (! Schema::hasColumn('properties', 'external_id')) {
                $table->string('external_id', 100)->nullable()->after('source');
                $table->index(['source', 'external_id']);
            }
        });

        // Backfill external_id from meta for previously imported properties.
        // withoutGlobalScopes() bypasses the BelongsToAgency scope (no auth
        // context in migrations) so all rows are visible regardless of agency.
        \App\Models\Property::withoutGlobalScopes()
            ->whereNotNull('meta')
            ->whereNull('external_id')
            ->each(function ($p) {
                $meta = is_array($p->meta) ? $p->meta : json_decode($p->meta, true);
                $url  = $meta['source_url']    ?? null;
                $src  = $meta['imported_from'] ?? null;
                if ($url && preg_match('#/(\d{6,})(?:[?/]|$)#', $url, $m)) {
                    $p->source      = $src;
                    $p->external_id = $m[1];
                    $p->saveQuietly();
                }
            });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'external_id')) {
                $table->dropIndex(['source', 'external_id']);
                $table->dropColumn('external_id');
            }
            if (Schema::hasColumn('properties', 'source')) {
                $table->dropColumn('source');
            }
        });
    }
};
