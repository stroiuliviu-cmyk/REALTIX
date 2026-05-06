<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_contact', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            // owner = vânzător/locator; interested = potențial cumpărător/chiriaș; tenant = chiriaș actual
            $table->string('relation', 20)->default('interested');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['property_id', 'contact_id', 'relation']);
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_contact');
    }
};
