<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->unsignedInteger('seats_included')->default(1)->after('max_realtors');
            $table->decimal('price_per_extra_seat', 8, 2)->nullable()->after('seats_included');
            $table->string('stripe_extra_seat_price_id')->nullable()->after('stripe_price_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->dropColumn(['seats_included', 'price_per_extra_seat', 'stripe_extra_seat_price_id']);
        });
    }
};
