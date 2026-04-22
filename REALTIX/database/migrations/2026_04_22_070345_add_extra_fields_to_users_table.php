<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('whatsapp')->nullable()->after('phone');
            $table->string('viber')->nullable()->after('whatsapp');
            $table->string('telegram')->nullable()->after('viber');
            $table->string('timezone')->default('Europe/Chisinau')->after('locale');
            $table->json('notification_prefs')->nullable()->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['whatsapp', 'viber', 'telegram', 'timezone', 'notification_prefs']);
        });
    }
};
