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
                    'agency' => $user->agency ? [
                        'id' => $user->agency->id,
                        'name' => $user->agency->name,
                        'slug' => $user->agency->slug,
                        'logo_path' => $user->agency->logo_path,
                        'subscription_plan' => $user->agency->subscription_plan,
                    ] : null,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
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
