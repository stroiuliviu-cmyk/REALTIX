<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Site-ul e în spatele Cloudflare. Onorăm X-Forwarded-* DOAR când conexiunea
        // vine dintr-un range Cloudflare publicat (https://www.cloudflare.com/ips).
        // Range-uri EXPLICITE (nu '*'): un client care lovește direct origin-ul NU poate
        // falsifica X-Forwarded-For → $request->ip() = IP-ul REAL al vizitatorului, corect
        // pentru anti-abuzul cotei (ip_hash), rate-limit login, blacklist, audit impersonare.
        // De actualizat dacă Cloudflare își schimbă range-urile.
        $middleware->trustProxies(at: [
            // IPv4 — cloudflare.com/ips-v4
            '173.245.48.0/20',
            '103.21.244.0/22',
            '103.22.200.0/22',
            '103.31.4.0/22',
            '141.101.64.0/18',
            '108.162.192.0/18',
            '190.93.240.0/20',
            '188.114.96.0/20',
            '197.234.240.0/22',
            '198.41.128.0/17',
            '162.158.0.0/15',
            '104.16.0.0/13',
            '104.24.0.0/14',
            '172.64.0.0/13',
            '131.0.72.0/22',
            // IPv6 — cloudflare.com/ips-v6
            '2400:cb00::/32',
            '2606:4700::/32',
            '2803:f800::/32',
            '2405:b500::/32',
            '2405:8100::/32',
            '2a06:98c0::/29',
            '2c0f:f248::/32',
        ], headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\ResolveAgencyFromSubdomain::class,
            \App\Http\Middleware\SetLocale::class,
            \App\Http\Middleware\BlockBlacklistedIp::class,
            \App\Http\Middleware\CheckUserActive::class,
        ]);

        $middleware->alias([
            'assistant.gate' => \App\Http\Middleware\AssistantGate::class,
            'assistant.session' => \App\Http\Middleware\AssistantSession::class,
            'agency.subscription' => \App\Http\Middleware\EnsureAgencySubscription::class,
            'subscription.manage' => \App\Http\Middleware\EnsureCanManageSubscription::class,
            'onboarded' => \App\Http\Middleware\EnsureOnboardingDone::class,
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
