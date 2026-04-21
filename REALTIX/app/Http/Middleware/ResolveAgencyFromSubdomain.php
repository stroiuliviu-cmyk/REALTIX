<?php

namespace App\Http\Middleware;

use App\Models\Agency;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveAgencyFromSubdomain
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();
        $appHost = parse_url(config('app.url'), PHP_URL_HOST) ?? 'localhost';

        if ($host !== $appHost && str_ends_with($host, '.' . $appHost)) {
            $subdomain = str_replace('.' . $appHost, '', $host);
            $agency = Agency::where('slug', $subdomain)->first();
            if ($agency) {
                app()->instance('current_agency_id', $agency->id);
                app()->instance('current_agency', $agency);
            }
        } elseif ($request->user()?->agency_id) {
            app()->instance('current_agency_id', $request->user()->agency_id);
            app()->instance('current_agency', $request->user()->agency);
        }

        return $next($request);
    }
}
