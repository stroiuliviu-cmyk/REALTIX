<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_path' => $user->avatar_path,
                    'locale' => $user->locale,
                    'is_admin' => $user->isAdmin(),
                    'is_super_admin' => $user->isSuperAdmin(),
                    'agency' => $user->agency ? [
                        'id' => $user->agency->id,
                        'name' => $user->agency->name,
                        'slug' => $user->agency->slug,
                        'logo_path' => $user->agency->logo_path,
                        'subscription_plan' => $user->agency->subscription_plan,
                        'trial_ends_at' => $user->agency->trial_ends_at,
                        'on_trial' => $user->agency->onTrial(),
                        'trial_days_left' => $user->agency->trialDaysLeft(),
                        'subscription_active' => $user->agency->isSubscriptionActive(),
                        'features' => $user->agency->planFeatures(),
                    ] : null,
                    'linked_agencies' => $user->linkedAgencies()
                        ->select('agencies.id', 'agencies.name', 'agencies.slug', 'agencies.logo_path', 'agencies.subscription_plan')
                        ->get()
                        // Show in switcher only the currently active agency + any team-plan agencies the user has been invited to
                        ->filter(function ($a) use ($user) {
                            if ($a->id === $user->agency_id) return true;
                            $teamPlans = config('realtix.team_plans', ['medium', 'pro']);
                            return in_array($a->subscription_plan, $teamPlans, true);
                        })
                        ->map(fn ($a) => [
                            'id'        => $a->id,
                            'name'      => $a->name,
                            'slug'      => $a->slug,
                            'logo_path' => $a->logo_path,
                            'plan'      => $a->subscription_plan,
                            'role'      => $a->pivot->role ?? 'realtor',
                            'is_active' => $a->id === $user->agency_id,
                        ])
                        ->values(),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'locale' => app()->getLocale(),
            'translations' => fn () => $this->loadTranslations(),
        ];
    }

    private function loadTranslations(): array
    {
        $locale = app()->getLocale();
        $path = lang_path("{$locale}");
        $translations = [];

        if (is_dir($path)) {
            foreach (glob("{$path}/*.php") as $file) {
                $key = basename($file, '.php');
                $translations[$key] = require $file;
            }
        }

        return $translations;
    }
}
