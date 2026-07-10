<?php

declare(strict_types=1);

use App\Models\User;
use Spatie\Permission\Models\Role;

// Poarta de vizibilitate a rutelor /assistant (middleware assistant.gate).
// IP-urile folosite sunt din blocurile de documentare RFC 5737 (TEST-NET).

beforeEach(function () {
    // Pagina /assistant e Inertia; nu depindem de manifestul Vite din build.
    $this->withoutVite();
    // Spatie cache-uiește rolurile per-proces; golim ca RefreshDatabase să nu lase reziduu.
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
});

/** Un user cu rolul Spatie super_admin (guard-ul default 'web'). */
function superAdmin(): User
{
    Role::findOrCreate('super_admin');

    return tap(User::factory()->create())->assignRole('super_admin');
}

it('returns 404 for everyone when access is disabled', function () {
    config(['assistant.access' => 'disabled']);

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
        ->get('/assistant')
        ->assertNotFound();
});

it('404s even an authenticated super_admin when access is disabled', function () {
    config(['assistant.access' => 'disabled']);

    $this->actingAs(superAdmin())
        ->get('/assistant')
        ->assertNotFound();
});

it('allows an authenticated super_admin in preview regardless of IP', function () {
    // fără niciun IP allowlistat → accesul vine strict din rol
    config(['assistant.access' => 'preview', 'assistant.preview_ips' => []]);

    $this->actingAs(superAdmin())
        ->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])
        ->get('/assistant')
        ->assertOk();
});

it('404s a regular user and an anonymous visitor in preview without an IP match', function () {
    config(['assistant.access' => 'preview', 'assistant.preview_ips' => ['203.0.113.7']]);

    // user obișnuit (fără rol), IP în afara listei → 404.
    // is_active explicit: default-ul DB nu se reflectă pe modelul ne-refreshat,
    // iar CheckUserActive (global) ar redirecta un user „inactiv" înainte de gate.
    $this->actingAs(User::factory()->create(['is_active' => true]))
        ->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])
        ->get('/assistant')
        ->assertNotFound();

    // anonim, IP în afara listei → 404
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])
        ->get('/assistant')
        ->assertNotFound();
});

it('still honors the preview IP allowlist as a secondary option', function () {
    config(['assistant.access' => 'preview', 'assistant.preview_ips' => ['203.0.113.7']]);

    // anonim, dar IP în listă → 200
    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
        ->get('/assistant')
        ->assertOk();

    // alt IP → 404
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])
        ->get('/assistant')
        ->assertNotFound();
});

it('allows everyone when access is public', function () {
    config(['assistant.access' => 'public']);

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])
        ->get('/assistant')
        ->assertOk();
});

it('gates the chat endpoint too, not just the page', function () {
    config(['assistant.access' => 'disabled']);

    // ruta de chat e în același grup → 404 înainte de orice streaming
    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
        ->post('/assistant/chat', ['text' => 'salut', 'language' => 'ro'])
        ->assertNotFound();
});
