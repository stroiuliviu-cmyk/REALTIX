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
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'agency_name' => 'nullable|string|max:255',
        ]);

        $agencyName = $request->agency_name ?: $request->name . "'s Agency";
        $slug = Str::slug($agencyName);

        // Ensure unique slug
        $baseSlug = $slug;
        $i = 1;
        while (Agency::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $agency = Agency::create([
            'name' => $agencyName,
            'slug' => $slug,
            'subscription_plan' => 'starter',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'agency_id' => $agency->id,
            'locale' => 'ro',
        ]);

        $user->assignRole('admin');

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
