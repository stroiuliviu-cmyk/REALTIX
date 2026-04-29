<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    private const ALLOWED = ['google', 'apple', 'microsoft'];

    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::ALLOWED), 404);

        // Microsoft uses 'azure' driver internally
        $driver = $provider === 'microsoft' ? 'azure' : $provider;

        return Socialite::driver($driver)
            ->redirectUrl(route('social.callback', $provider))
            ->redirect();
    }

    public function callback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::ALLOWED), 404);

        $driver = $provider === 'microsoft' ? 'azure' : $provider;

        try {
            $social = Socialite::driver($driver)
                ->redirectUrl(route('social.callback', $provider))
                ->user();
        } catch (\Throwable) {
            return redirect()->route('login')
                ->withErrors(['email' => 'Autentificarea cu ' . ucfirst($provider) . ' a eșuat. Încearcă din nou.']);
        }

        $email = $social->getEmail();

        // Find by social provider first (fastest path)
        $user = User::where('social_provider', $provider)
            ->where('social_id', $social->getId())
            ->first();

        if (! $user && $email) {
            // Email exists → link social to existing account
            $user = User::where('email', strtolower($email))->first();

            if ($user) {
                $user->update([
                    'social_provider' => $provider,
                    'social_id'       => $social->getId(),
                ]);
            }
        }

        if (! $user) {
            // New user — create account automatically
            $name       = $social->getName() ?? $social->getNickname() ?? 'Utilizator';
            $agencyName = $name . "'s Agency";
            $slug       = $baseSlug = Str::slug($agencyName);
            $i = 1;
            while (Agency::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $i++;
            }

            $agency = Agency::create([
                'name'              => $agencyName,
                'slug'              => $slug,
                'subscription_plan' => 'starter',
            ]);

            $user = User::create([
                'name'            => $name,
                'email'           => $email ? strtolower($email) : null,
                'social_provider' => $provider,
                'social_id'       => $social->getId(),
                'agency_id'       => $agency->id,
                'locale'          => 'ro',
                'email_verified_at' => now(), // social = email confirmed
            ]);

            $user->assignRole('admin');
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
