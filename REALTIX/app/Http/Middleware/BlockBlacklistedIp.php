<?php

namespace App\Http\Middleware;

use App\Models\IpBlacklist;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockBlacklistedIp
{
    public function handle(Request $request, Closure $next): Response
    {
        if (IpBlacklist::isBlocked($request->ip())) {
            abort(403, 'Access from your IP has been restricted.');
        }
        return $next($request);
    }
}
