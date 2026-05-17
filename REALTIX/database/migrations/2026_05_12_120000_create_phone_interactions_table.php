<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('subject');
            $table->string('phone', 32)->nullable();
            $table->string('outcome', 16);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id', 'created_at']);
            $table->index(['agency_id', 'user_id', 'outcome', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_interactions');
    }
};
