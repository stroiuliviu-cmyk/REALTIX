<?php

declare(strict_types=1);

// Poarta de vizibilitate a rutelor /assistant (middleware assistant.gate).
// IP-urile folosite sunt din blocurile de documentare RFC 5737 (TEST-NET).

beforeEach(function () {
    // Pagina /assistant e Inertia; nu depindem de manifestul Vite din build.
    $this->withoutVite();
});

it('returns 404 for everyone when access is disabled', function () {
    config(['assistant.access' => 'disabled']);

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
        ->get('/assistant')
        ->assertNotFound();
});

it('allows an allowlisted IP but 404s any other IP when access is preview', function () {
    config([
        'assistant.access' => 'preview',
        'assistant.preview_ips' => ['203.0.113.7'],
    ]);

    // IP-ul din listă → poarta trece, pagina se randează
    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
        ->get('/assistant')
        ->assertOk();

    // alt IP → 404 (feature-ul pare inexistent)
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
