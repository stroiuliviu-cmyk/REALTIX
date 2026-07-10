<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Setul de OBIECTE UNICE consumate din cotă — sursa de adevăr pentru „used".
     * unique(owner_token, listing_id, source) face marcarea idempotentă per owner
     * (revizualizarea nu inserează dublură). idx(ip_hash, listing_id, source)
     * susține anti-abuzul: cota se numără pe owner_token OR ip_hash, deci
     * resetarea cookie-ului nu resetează cota (TZ §4.10 / FR-QUOTA-6).
     */
    public function up(): void
    {
        Schema::create('assistant_quota_seen', function (Blueprint $table) {
            $table->id();
            $table->string('owner_token')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ip_hash')->nullable()->index();
            $table->string('listing_id');
            $table->enum('source', ['internal', 'external']);
            $table->timestamp('seen_at')->useCurrent();

            $table->unique(['owner_token', 'listing_id', 'source']);
            $table->index(['ip_hash', 'listing_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_quota_seen');
    }
};
