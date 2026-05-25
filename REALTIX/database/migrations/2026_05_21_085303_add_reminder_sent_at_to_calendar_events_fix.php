<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Fix for the empty 07-May migration that should have added this column
     * but had only a stub. We guard with hasColumn() so this is idempotent
     * across environments where the column may or may not already exist.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('calendar_events', 'reminder_sent_at')) {
            Schema::table('calendar_events', function (Blueprint $table) {
                $table->timestamp('reminder_sent_at')->nullable()->after('all_day');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('calendar_events', 'reminder_sent_at')) {
            Schema::table('calendar_events', function (Blueprint $table) {
                $table->dropColumn('reminder_sent_at');
            });
        }
    }
};
