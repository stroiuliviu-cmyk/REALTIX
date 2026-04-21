<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scraped_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->string('source')->default('999md'); // 999md, imobiliare_md
            $table->string('external_id');
            $table->string('external_url');
            $table->string('title');
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency')->nullable();
            $table->decimal('area', 8, 2)->nullable();
            $table->integer('rooms')->nullable();
            $table->string('city')->nullable();
            $table->string('district')->nullable();
            $table->json('images')->nullable();
            $table->string('ai_valuation')->nullable(); // cheap, average, expensive
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->unique(['agency_id', 'source', 'external_id']);
            $table->index(['agency_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scraped_listings');
    }
};
