<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index('agency_id', 'users_agency_id_index');
        });

        Schema::table('generated_contracts', function (Blueprint $table) {
            $table->index('agency_id', 'generated_contracts_agency_id_index');
            $table->index('template_id', 'generated_contracts_template_id_index');
            $table->index('created_at', 'generated_contracts_created_at_index');
        });

        Schema::table('scraped_listings', function (Blueprint $table) {
            $table->index(
                ['type', 'transaction_type', 'city'],
                'scraped_listings_type_transaction_city_index'
            );
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->index('created_at', 'properties_created_at_index');
            $table->index('updated_at', 'properties_updated_at_index');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->index('agency_id', 'contacts_agency_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropIndex('users_agency_id_index'));

        Schema::table('generated_contracts', function (Blueprint $t) {
            $t->dropIndex('generated_contracts_agency_id_index');
            $t->dropIndex('generated_contracts_template_id_index');
            $t->dropIndex('generated_contracts_created_at_index');
        });

        Schema::table('scraped_listings', fn (Blueprint $t) => $t->dropIndex('scraped_listings_type_transaction_city_index'));

        Schema::table('properties', function (Blueprint $t) {
            $t->dropIndex('properties_created_at_index');
            $t->dropIndex('properties_updated_at_index');
        });

        Schema::table('contacts', fn (Blueprint $t) => $t->dropIndex('contacts_agency_id_index'));
    }
};
