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
 *   - 'preview'  → doar IP-urile din config('assistant.preview_ips'); restul 404;
 *   - 'public'   → toți.
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
            && in_array($request->ip(), config('assistant.preview_ips', []), true)) {
            return $next($request);
        }

        abort(404);
    }
}
