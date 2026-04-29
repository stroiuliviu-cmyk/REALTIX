<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create
        {--name= : Name of the super admin}
        {--email= : Email address}
        {--password= : Password (min 8 characters with letters, numbers, mixed case)}';

    protected $description = 'Create a platform super admin account with full access';

    public function handle(): int
    {
        // Ensure role exists
        Role::firstOrCreate(['name' => 'super_admin']);

        $name     = $this->option('name')     ?: $this->ask('Nume');
        $email    = $this->option('email')    ?: $this->ask('Email');
        $password = $this->option('password') ?: $this->secret('Parolă (min. 8 caractere)');

        $validator = Validator::make(
            compact('name', 'email', 'password'),
            [
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|max:255',
                'password' => ['required', Password::min(8)->letters()->mixedCase()->numbers()],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $err) {
                $this->error($err);
            }
            return self::FAILURE;
        }

        $existing = User::where('email', $email)->first();

        if ($existing) {
            if (! $this->confirm("Există deja un cont cu emailul {$email}. Îl promovezi la super_admin?")) {
                return self::FAILURE;
            }
            $existing->syncRoles(['super_admin']);
            $existing->update([
                'name'              => $name,
                'password'          => Hash::make($password),
                'email_verified_at' => now(),
                'is_active'         => true,
            ]);
            $this->info("Contul existent {$email} a fost promovat la super_admin.");
            return self::SUCCESS;
        }

        $user = User::create([
            'name'              => $name,
            'email'             => $email,
            'password'          => Hash::make($password),
            'email_verified_at' => now(),
            'is_active'         => true,
            'agency_id'         => null,
            'locale'            => 'ro',
        ]);

        $user->assignRole('super_admin');

        $this->info("Super-admin creat cu succes: {$email}");
        $this->line("Loghează-te la /login și accesează /admin.");

        return self::SUCCESS;
    }
}
