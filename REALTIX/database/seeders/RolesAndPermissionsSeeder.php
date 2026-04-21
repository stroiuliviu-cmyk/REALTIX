<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'properties.view', 'properties.create', 'properties.edit', 'properties.delete',
            'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete',
            'deals.view', 'deals.create', 'deals.edit', 'deals.delete',
            'calendar.view', 'calendar.create',
            'contracts.view', 'contracts.create',
            'ai.use',
            'scraper.use',
            'auto_post.request',
            'auto_post.approve',
            'agency.manage',
            'users.manage',
            'statistics.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $realtorRole = Role::firstOrCreate(['name' => 'realtor']);
        $realtorRole->syncPermissions([
            'properties.view', 'properties.create', 'properties.edit',
            'contacts.view', 'contacts.create', 'contacts.edit',
            'deals.view', 'deals.create', 'deals.edit',
            'calendar.view', 'calendar.create',
            'contracts.view', 'contracts.create',
            'ai.use', 'scraper.use',
            'auto_post.request',
        ]);

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions(Permission::all());
    }
}
