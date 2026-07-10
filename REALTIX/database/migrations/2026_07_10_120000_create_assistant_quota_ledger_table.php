<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Soldul CUMPĂRAT de rezultate al unui owner (anonim sau cont). „free_used"
     * NU se stochează aici — se derivă din assistant_quota_seen (obiectele
     * unice consumate). Fără Stripe încă: purchased_total rămâne 0 în C1.
     */
    public function up(): void
    {
        Schema::create('assistant_quota_ledger', function (Blueprint $table) {
            $table->id();
            $table->string('owner_token')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('purchased_total')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_quota_ledger');
    }
};
