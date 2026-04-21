<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price_monthly', 8, 2);
            $table->string('stripe_price_id')->nullable();
            $table->integer('max_listings')->default(50);
            $table->integer('max_realtors')->default(1);
            $table->boolean('has_ai_tools')->default(false);
            $table->boolean('has_scraper')->default(false);
            $table->boolean('has_pdf_contracts')->default(false);
            $table->boolean('has_analytics')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
