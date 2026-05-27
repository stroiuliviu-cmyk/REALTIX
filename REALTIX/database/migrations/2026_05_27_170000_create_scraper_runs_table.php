<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scraper_runs', function (Blueprint $table) {
            $table->id();
            $table->string('mode', 20)->default('manual')->index(); // morning|hourly|manual
            $table->integer('pid')->nullable();
            $table->timestamp('started_at')->useCurrent()->index();
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->string('status', 20)->default('running')->index(); // running|success|failed|killed|timeout

            $table->integer('exit_code')->nullable();

            // Aggregate stats across all categories.
            $table->integer('total_processed')->default(0);
            $table->integer('total_new')->default(0);
            $table->integer('total_updated')->default(0);
            $table->integer('total_skipped')->default(0);
            $table->integer('total_failed')->default(0);

            // Per-category breakdown:
            // {"apartment": {"processed": 107, "new": 12, "updated": 24, "skipped": 71, "failed": 0, "duration_sec": 89}, ...}
            $table->json('category_stats')->nullable();

            // The category currently being scraped — drives the live progress
            // panel on the super-admin dashboard. NULL once the run finalises.
            $table->string('current_category', 50)->nullable();

            $table->text('error_message')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scraper_runs');
    }
};
