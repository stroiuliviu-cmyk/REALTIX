<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auto_post_requests', function (Blueprint $table) {
            $table->json('platforms')->nullable()->after('target');
            $table->timestamp('scheduled_at')->nullable()->after('admin_note');
            $table->json('platform_results')->nullable()->after('scheduled_at');
            $table->boolean('watermark')->default(true)->after('platform_results');
        });
    }

    public function down(): void
    {
        Schema::table('auto_post_requests', function (Blueprint $table) {
            $table->dropColumn(['platforms', 'scheduled_at', 'platform_results', 'watermark']);
        });
    }
};
