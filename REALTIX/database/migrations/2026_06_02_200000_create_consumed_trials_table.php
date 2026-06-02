<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persistă SHA-256 al email-urilor pentru care s-a consumat deja un trial,
 * pentru ca o re-înregistrare cu același email să nu mai primească 14 zile gratuite.
 * Stocăm doar hash-ul (GDPR-safe: nu putem reconstrui adresa, dar putem verifica
 * dacă o adresă cunoscută a mai consumat trial-ul).
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('consumed_trials')) {
            return;
        }

        Schema::create('consumed_trials', function (Blueprint $table) {
            $table->id();
            $table->char('email_hash', 64)->unique();
            $table->timestamp('consumed_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consumed_trials');
    }
};
