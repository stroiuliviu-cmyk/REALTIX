<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('type')->default('buyer'); // buyer, seller, landlord, tenant
            $table->string('status')->default('lead'); // lead, active, closed
            $table->text('notes')->nullable();
            $table->string('source')->nullable(); // organic, referral, 999md, etc.
            $table->timestamps();

            $table->index(['agency_id', 'status']);
            $table->index(['agency_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
