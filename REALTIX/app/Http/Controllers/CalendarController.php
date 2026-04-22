<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function __construct(private GoogleCalendarService $gcal) {}

    public function index(Request $request): Response
    {
        $user  = $request->user();
        $month = $request->month ?? now()->month;
        $year  = $request->year  ?? now()->year;

        $events = CalendarEvent::with(['contact', 'property'])
            ->when(! $user->isAdmin(), fn($q) => $q->where('user_id', $user->id))
            ->whereYear('starts_at', $year)
            ->whereMonth('starts_at', $month)
            ->orderBy('starts_at')
            ->get();

        return Inertia::render('Calendar/Index', [
            'events'           => $events,
            'month'            => (int) $month,
            'year'             => (int) $year,
            'googleConnected'  => (bool) $user->google_access_token,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'type'        => 'required|in:viewing,meeting,call,contract,other',
            'starts_at'   => 'required|date',
            'ends_at'     => 'nullable|date|after:starts_at',
            'contact_id'  => 'nullable|exists:contacts,id',
            'property_id' => 'nullable|exists:properties,id',
            'description' => 'nullable|string',
        ]);

        $event = CalendarEvent::create(array_merge($data, ['user_id' => $request->user()->id]));

        // Push to Google Calendar if user has connected
        $googleId = $this->gcal->push($request->user(), $event);
        if ($googleId) {
            $event->update(['google_event_id' => $googleId]);
        }

        return redirect()->back()->with('success', 'Evenimentul a fost creat.' . ($googleId ? ' ✅ Sincronizat cu Google.' : ''));
    }

    public function destroy(CalendarEvent $calendarEvent)
    {
        $user = request()->user();

        // Remove from Google Calendar if synced
        if ($calendarEvent->google_event_id) {
            $this->gcal->delete($user, $calendarEvent->google_event_id);
        }

        $calendarEvent->delete();

        return redirect()->back()->with('success', 'Evenimentul a fost șters.');
    }
}
