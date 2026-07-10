<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// TrustProxies (Cloudflare): $request->ip() = IP-ul REAL al vizitatorului doar când
// conexiunea vine dintr-un range Cloudflare; un X-Forwarded-For din afara range-urilor
// (hit direct pe origin) e ignorat, ca IP-ul să nu poată fi falsificat.
// IP-uri de test din blocurile de documentare RFC 5737 (TEST-NET).

beforeEach(function () {
    // Rută minimală care întoarce IP-ul rezolvat de framework. TrustProxies e middleware
    // GLOBAL, deci se aplică și pe această rută în afara grupului web.
    Route::get('/__test_client_ip', fn (Request $r) => $r->ip());
});

it('honors X-Forwarded-For when the connection comes from a Cloudflare IPv4 range', function () {
    $this->withServerVariables([
        'REMOTE_ADDR' => '172.64.0.1',            // edge Cloudflare (în 172.64.0.0/13)
        'HTTP_X_FORWARDED_FOR' => '203.0.113.50', // vizitatorul real
    ])->get('/__test_client_ip')
        ->assertOk()
        ->assertSee('203.0.113.50')
        ->assertDontSee('172.64.0.1');
});

it('honors X-Forwarded-For when the connection comes from a Cloudflare IPv6 range', function () {
    $this->withServerVariables([
        'REMOTE_ADDR' => '2606:4700::1',          // edge Cloudflare (în 2606:4700::/32)
        'HTTP_X_FORWARDED_FOR' => '203.0.113.77',
    ])->get('/__test_client_ip')
        ->assertOk()
        ->assertSee('203.0.113.77');
});

it('ignores a spoofed X-Forwarded-For from a non-Cloudflare source', function () {
    $this->withServerVariables([
        'REMOTE_ADDR' => '198.51.100.20',         // NU e Cloudflare (hit direct pe origin)
        'HTTP_X_FORWARDED_FOR' => '203.0.113.50', // fals → trebuie ignorat
    ])->get('/__test_client_ip')
        ->assertOk()
        ->assertSee('198.51.100.20')
        ->assertDontSee('203.0.113.50');
});
