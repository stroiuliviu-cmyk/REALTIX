<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EmailSystemController extends Controller
{
    public function index(): Response
    {
        $pendingJobs = DB::table('jobs')->count();
        $failedJobs  = DB::table('failed_jobs')->count();

        $recentFailed = DB::table('failed_jobs')
            ->orderByDesc('failed_at')
            ->limit(15)
            ->get(['id', 'queue', 'payload', 'exception', 'failed_at']);

        // Try to extract notification class name from payload JSON
        $recentFailed = $recentFailed->map(function ($f) {
            $payload = json_decode($f->payload, true);
            $f->displayName = $payload['displayName'] ?? ($payload['data']['commandName'] ?? 'Unknown');
            $f->exception_short = substr($f->exception, 0, 300);
            unset($f->payload, $f->exception);
            return $f;
        });

        $notificationActions = ActivityLog::where('action', 'like', 'notification.%')
            ->orWhere('action', 'like', 'mail.%')
            ->latest()->take(20)->get(['id', 'action', 'description', 'created_at']);

        $config = [
            'mailer'      => config('mail.default'),
            'host'        => config('mail.mailers.smtp.host'),
            'port'        => config('mail.mailers.smtp.port'),
            'from_addr'   => config('mail.from.address'),
            'from_name'   => config('mail.from.name'),
            'queue_driver' => config('queue.default'),
        ];

        return Inertia::render('SuperAdmin/EmailSystem/Index', [
            'pendingJobs'         => $pendingJobs,
            'failedJobs'          => $failedJobs,
            'recentFailed'        => $recentFailed,
            'notificationActions' => $notificationActions,
            'config'              => $config,
        ]);
    }

    public function retryFailed(Request $request, AuditLogger $audit): RedirectResponse
    {
        \Illuminate\Support\Facades\Artisan::call('queue:retry', ['id' => ['all']]);
        $audit->record('email.retry_all_failed', null, 'Retried all failed queue jobs');
        return back()->with('success', 'Toate failed jobs reîncercate.');
    }

    public function flushFailed(Request $request, AuditLogger $audit): RedirectResponse
    {
        $count = DB::table('failed_jobs')->count();
        \Illuminate\Support\Facades\Artisan::call('queue:flush');
        $audit->record('email.flush_failed', null, "Flushed {$count} failed jobs");
        return back()->with('success', "{$count} failed jobs șterse.");
    }
}
