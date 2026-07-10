<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guarantees an anonymous `owner_token` for the assistant (long-lived httpOnly
 * cookie, SameSite=Lax) and exposes it — plus the authenticated user id, when
 * present — as request attributes for the chat controller.
 */
class AssistantSession
{
    public const COOKIE = 'assistant_owner';

    private const ONE_YEAR_MINUTES = 60 * 24 * 365;

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie(self::COOKIE);

        if (! is_string($token) || $token === '') {
            $token = Str::random(40);
            // Queued cookie — attached to the response by the web group's
            // AddQueuedCookiesToResponse (and encrypted by EncryptCookies).
            Cookie::queue(cookie(
                name: self::COOKIE,
                value: $token,
                minutes: self::ONE_YEAR_MINUTES,
                httpOnly: true,
                sameSite: 'lax',
            ));
        }

        $request->attributes->set('assistant_owner_token', $token);
        $request->attributes->set('assistant_user_id', $request->user()?->id);

        return $next($request);
    }
}
