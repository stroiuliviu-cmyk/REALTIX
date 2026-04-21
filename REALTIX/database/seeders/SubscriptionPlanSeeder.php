<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price_monthly' => 12.00,
                'max_listings' => 50,
                'max_realtors' => 1,
                'has_ai_tools' => false,
                'has_scraper' => false,
                'has_pdf_contracts' => false,
                'has_analytics' => false,
            ],
            [
                'name' => 'Medium',
                'slug' => 'medium',
                'price_monthly' => 49.00,
                'max_listings' => 500,
                'max_realtors' => 5,
                'has_ai_tools' => true,
                'has_scraper' => true,
                'has_pdf_contracts' => true,
                'has_analytics' => false,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price_monthly' => 89.00,
                'max_listings' => -1,
                'max_realtors' => -1,
                'has_ai_tools' => true,
                'has_scraper' => true,
                'has_pdf_contracts' => true,
                'has_analytics' => true,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
