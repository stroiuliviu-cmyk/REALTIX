<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // owner anonim (token din cookie/localStorage) sau utilizator logat
            $table->string('owner_token')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('language', ['ro', 'ru'])->default('ro');
            $table->string('title')->nullable();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->timestamps();

            // suport pentru "ultimele 10 pe owner" (limita se aplică în cod, nu în schema)
            $table->index(['owner_token', 'last_activity_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
