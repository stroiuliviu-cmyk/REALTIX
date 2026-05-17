<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isPgsql = DB::connection()->getDriverName() === 'pgsql';

        Schema::create('saved_searches', function (Blueprint $table) use ($isPgsql) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);

            // jsonb on Postgres for queryability + GIN indexes; plain json
            // on the SQLite test/dev DB where jsonb is not a known type.
            if ($isPgsql) {
                $table->jsonb('criteria');
            } else {
                $table->json('criteria');
            }

            // 'in_app' | 'email' | 'in_app+email'
            $table->string('notification_channel', 20)->default('in_app');
            // 'hourly_batch' | 'instant' | 'daily_digest'
            $table->string('frequency', 20)->default('hourly_batch');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_matched_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['agency_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
