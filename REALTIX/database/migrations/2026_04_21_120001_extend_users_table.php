<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('agency_id')->nullable()->constrained('agencies')->nullOnDelete()->after('id');
            $table->string('phone')->nullable()->after('email');
            $table->string('avatar_path')->nullable()->after('phone');
            $table->string('position')->nullable()->after('avatar_path');
            $table->string('locale')->default('ro')->after('position');
            $table->boolean('is_active')->default(true)->after('locale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['agency_id']);
            $table->dropColumn(['agency_id', 'phone', 'avatar_path', 'position', 'locale', 'is_active']);
        });
    }
};
