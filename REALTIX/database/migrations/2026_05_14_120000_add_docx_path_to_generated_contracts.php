<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('generated_contracts', function (Blueprint $table) {
            $table->string('docx_path')->nullable()->after('pdf_path');
        });
    }

    public function down(): void
    {
        Schema::table('generated_contracts', function (Blueprint $table) {
            $table->dropColumn('docx_path');
        });
    }
};
