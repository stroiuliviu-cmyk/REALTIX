<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            // Viewing outcome / task completion status
            $table->string('status')->default('pending')->after('google_event_id');
            // All-day events have no specific time slot
            $table->boolean('all_day')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->dropColumn(['status', 'all_day']);
        });
    }
};
