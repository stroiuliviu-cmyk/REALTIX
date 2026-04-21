<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description_ro')->nullable();
            $table->text('description_ru')->nullable();
            $table->text('description_en')->nullable();
            $table->string('type')->default('apartment'); // apartment, house, commercial, land
            $table->string('transaction_type')->default('sale'); // sale, rent
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency')->default('EUR');
            $table->decimal('area_total', 8, 2)->nullable();
            $table->decimal('area_living', 8, 2)->nullable();
            $table->integer('rooms')->nullable();
            $table->integer('floor')->nullable();
            $table->integer('floors_total')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->default('Chișinău');
            $table->string('district')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('status')->default('active'); // active, inactive, sold, rented
            $table->string('ai_valuation')->nullable(); // cheap, average, expensive
            $table->unsignedBigInteger('views_count')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['agency_id', 'status']);
            $table->index(['agency_id', 'type', 'transaction_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
