<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces an immediate logout when the authenticated user has been deactivated
 * (is_active = false). Super admins are exempt — they shouldn't be locked out
 * by their own toggle.
 */
class CheckUserActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active && ! $user->hasRole('super_admin')) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Contul tău a fost dezactivat.'], 403);
            }
            return redirect('/login')->with('error', 'Contul tău a fost dezactivat de administrator.');
        }

        return $next($request);
    }
}
