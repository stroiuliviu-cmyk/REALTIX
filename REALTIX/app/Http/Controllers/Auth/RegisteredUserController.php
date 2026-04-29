<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'phone'       => 'nullable|string|max:30',
            'password'    => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()],
            'agency_name' => 'nullable|string|max:255',
            'terms'       => 'accepted',
        ], [
            'name.required'      => 'Numele este obligatoriu.',
            'email.required'     => 'Adresa de email este obligatorie.',
            'email.email'        => 'Adresa de email nu este validă.',
            'email.unique'       => 'Există deja un cont pe acest email. Poți să te autentifici.',
            'password.required'  => 'Parola este obligatorie.',
            'password.confirmed' => 'Parolele nu coincid.',
            'password.min'       => 'Parola trebuie să aibă cel puțin 8 caractere.',
            'password.mixed'     => 'Parola trebuie să conțină cel puțin o literă mare și una mică.',
            'password.letters'   => 'Parola trebuie să conțină cel puțin o literă.',
            'password.numbers'   => 'Parola trebuie să conțină cel puțin o cifră.',
            'terms.accepted'     => 'Trebuie să accepți Termenii și Condițiile.',
        ]);

        $agencyName = $request->agency_name ?: $request->name . "'s Agency";
        $slug       = $baseSlug = Str::slug($agencyName);
        $i = 1;
        while (Agency::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $agency = Agency::create([
            'name'              => $agencyName,
            'slug'              => $slug,
            'subscription_plan' => 'starter',
            'trial_ends_at'     => now()->addDays(14),
        ]);

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'phone'     => $request->phone,
            'password'  => Hash::make($request->password),
            'agency_id' => $agency->id,
            'locale'    => 'ro',
        ]);

        $user->assignRole('admin');

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('onboarding', absolute: false));
    }
}
