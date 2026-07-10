<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->string('owner_token')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // id-ul obiectului (intern: properties.id; extern: scraped_listings.id),
            // păstrat ca string pentru a acoperi ambele surse fără FK ambiguu
            $table->string('listing_id');
            $table->enum('source', ['internal', 'external']);
            // snapshot public al cardului la momentul salvării (pentru obiecte externe
            // care pot dispărea de la sursă)
            $table->jsonb('snapshot')->nullable();
            $table->timestamps();

            $table->unique(['owner_token', 'listing_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
