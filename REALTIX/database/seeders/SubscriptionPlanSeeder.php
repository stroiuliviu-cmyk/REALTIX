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
                'name' => 'Solo',
                'slug' => 'starter',
                'price_monthly' => 15.00,
                'max_listings' => 10,
                'max_realtors' => 1,
                'seats_included' => 1,
                'price_per_extra_seat' => null,
                'has_ai_tools' => true,
                'has_scraper' => true,
                'has_pdf_contracts' => true,
                'has_analytics' => true,
            ],
            [
                'name' => 'Team',
                'slug' => 'medium',
                'price_monthly' => 49.00,
                'max_listings' => 100,
                'max_realtors' => 5,
                'seats_included' => 5,
                'price_per_extra_seat' => null,
                'has_ai_tools' => true,
                'has_scraper' => true,
                'has_pdf_contracts' => true,
                'has_analytics' => true,
            ],
            [
                'name' => 'Growth',
                'slug' => 'pro',
                'price_monthly' => 49.00,
                'max_listings' => -1,
                'max_realtors' => -1,
                'seats_included' => 5,
                'price_per_extra_seat' => 8.00,
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
