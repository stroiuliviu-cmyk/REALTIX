<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Services\DefaultContractTemplates;
use Illuminate\Database\Seeder;

class ContractTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $agency = Agency::first();
        if (! $agency) {
            return;
        }

        DefaultContractTemplates::install($agency);
    }
}
