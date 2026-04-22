<?php

namespace App\Http\Controllers;

use App\Services\GoogleCalendarService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoogleCalendarController extends Controller
{
    public function __construct(private GoogleCalendarService $gcal) {}

    public function redirect(): RedirectResponse
    {
        return redirect($this->gcal->getAuthUrl());
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return redirect()->route('settings.index', ['tab' => 'integrations'])
                ->with('error', 'Autorizarea Google a fost refuzată.');
        }

        $code = $request->get('code');

        try {
            $token = $this->gcal->exchangeCode($code);
        } catch (\Throwable $e) {
            return redirect()->route('settings.index', ['tab' => 'integrations'])
                ->with('error', 'Eroare la conectarea Google: ' . $e->getMessage());
        }

        $user = $request->user();
        $user->update([
            'google_access_token'    => $token['access_token'],
            'google_refresh_token'   => $token['refresh_token'] ?? $user->google_refresh_token,
            'google_token_expires_at'=> Carbon::now()->addSeconds($token['expires_in'] ?? 3600),
        ]);

        return redirect()->route('settings.index', ['tab' => 'integrations'])
            ->with('success', 'Google Calendar a fost conectat cu succes! ✅');
    }

    public function disconnect(Request $request): RedirectResponse
    {
        $request->user()->update([
            'google_access_token'    => null,
            'google_refresh_token'   => null,
            'google_token_expires_at'=> null,
            'google_calendar_id'     => null,
        ]);

        return back()->with('success', 'Google Calendar a fost deconectat.');
    }

    public function sync(Request $request): RedirectResponse
    {
        $count = $this->gcal->importFromGoogle($request->user());

        return back()->with('success', "Sincronizare completă: {$count} evenimente importate din Google Calendar.");
    }
}
