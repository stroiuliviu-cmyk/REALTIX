<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type')->default('note'); // note, call, email, viewing, contract
            $table->text('body');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamps();

            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_interactions');
    }
};
