<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_user_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            // Role within this agency (admin/realtor). Independent of currently active.
            $table->string('role', 20)->default('realtor');
            $table->timestamps();

            $table->unique(['user_id', 'agency_id']);
            $table->index('user_id');
        });

        // Backfill: every existing user with an agency_id gets a link to it
        DB::table('users')
            ->whereNotNull('agency_id')
            ->orderBy('id')
            ->each(function ($user) {
                // Use existing role if user has one, else default 'realtor'
                $role = DB::table('roles')
                    ->join('model_has_roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->where('model_has_roles.model_id', $user->id)
                    ->where('model_has_roles.model_type', \App\Models\User::class)
                    ->whereIn('roles.name', ['admin', 'realtor'])
                    ->value('roles.name') ?? 'realtor';

                DB::table('agency_user_links')->updateOrInsert(
                    ['user_id' => $user->id, 'agency_id' => $user->agency_id],
                    ['role' => $role, 'created_at' => now(), 'updated_at' => now()]
                );
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_user_links');
    }
};
