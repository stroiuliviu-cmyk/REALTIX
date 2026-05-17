<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

class PlatformSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('SuperAdmin/Settings/Index', [
            'platform' => [
                'app_name'     => config('app.name'),
                'app_env'      => app()->environment(),
                'app_debug'    => config('app.debug'),
                'app_url'      => config('app.url'),
                'timezone'     => config('app.timezone'),
                'locale'       => config('app.locale'),
                'maintenance'  => app()->isDownForMaintenance(),
            ],
            'integrations' => [
                'stripe'    => $this->mask(config('cashier.key'), config('cashier.secret'), config('cashier.webhook.secret')),
                'mail'      => [
                    'mailer'   => config('mail.default'),
                    'host'     => config('mail.mailers.smtp.host'),
                    'port'     => config('mail.mailers.smtp.port'),
                    'from'     => config('mail.from.address'),
                    'configured' => !empty(config('mail.mailers.smtp.host')) && !empty(config('mail.mailers.smtp.username')),
                ],
                'queue'     => ['driver' => config('queue.default')],
                'cache'     => ['driver' => config('cache.default')],
                'session'   => ['driver' => config('session.driver')],
                'database'  => ['driver' => config('database.default')],
            ],
            'plans' => [
                'starter_price_id' => config('realtix.stripe_prices.starter'),
                'medium_price_id'  => config('realtix.stripe_prices.medium'),
                'pro_price_id'     => config('realtix.stripe_prices.pro'),
                'extra_seat_id'    => config('realtix.stripe_extra_seat_prices.pro'),
            ],
        ]);
    }

    private function mask(?string $key, ?string $secret, ?string $webhook): array
    {
        $hint = fn ($v) => $v ? substr($v, 0, 7) . '…' . substr($v, -4) : null;
        return [
            'key_set'        => !empty($key),
            'secret_set'     => !empty($secret),
            'webhook_set'    => !empty($webhook),
            'key_hint'       => $hint($key),
        ];
    }

    public function toggleMaintenance(Request $request, AuditLogger $audit): RedirectResponse
    {
        try {
            if (app()->isDownForMaintenance()) {
                Artisan::call('up');
                $audit->record('settings.maintenance.off', null, 'Maintenance mode disabled');
                return back()->with('success', 'Maintenance mode dezactivat — site online.');
            }
            Artisan::call('down', ['--render' => 'errors::503']);
            $audit->record('settings.maintenance.on', null, 'Maintenance mode enabled');
            return back()->with('warning', 'Maintenance mode ACTIV — site offline pentru utilizatori.');
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'Eroare: ' . $e->getMessage());
        }
    }

    public function clearCache(Request $request, AuditLogger $audit): RedirectResponse
    {
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        Artisan::call('view:clear');
        Artisan::call('route:clear');
        $audit->record('settings.cache.clear', null, 'All caches cleared');
        return back()->with('success', 'Cache + config + view + route — toate șterse.');
    }
}
