<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Poarta de vizibilitate a rutelor /assistant. Rulează ÎNAINTE de
 * assistant.session, ca să putem deploya feature-ul pe producția live fără
 * expunere publică până e gata Faza 1. Controlată de config('assistant.access'):
 *
 *   - 'disabled' → 404 pentru toți (feature-ul pare inexistent);
 *   - 'preview'  → super_admin autentificat SAU IP din config('assistant.preview_ips');
 *   - 'public'   → toți.
 *
 * În 'preview', super_admin e calea PRIMARĂ: site-ul e în spatele Cloudflare,
 * deci $request->ip() e IP-ul edge-ului (nesigur), iar allowlist-ul de IP rămâne
 * doar opțiune secundară (utilă local / fără proxy).
 *
 * Răspundem cu 404 (nu 403) intenționat: nu dezvăluim existența rutei celor
 * neautorizați. Orice valoare necunoscută pentru 'access' e tratată ca
 * 'disabled' (fail-closed).
 */
class AssistantGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $access = config('assistant.access', 'disabled');

        if ($access === 'public') {
            return $next($request);
        }

        if ($access === 'preview'
            && ($request->user()?->hasRole('super_admin')
                || in_array($request->ip(), config('assistant.preview_ips', []), true))) {
            return $next($request);
        }

        abort(404);
    }
}
