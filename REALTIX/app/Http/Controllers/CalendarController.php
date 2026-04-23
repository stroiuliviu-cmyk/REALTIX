<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\Property;
use App\Services\GoogleCalendarService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    private const TYPES    = 'viewing,meeting,call,contract,task,other';
    private const STATUSES = 'pending,done,liked,thinking,rejected,no_show';

    public function __construct(private GoogleCalendarService $gcal) {}

    public function index(Request $request): Response
    {
        $user  = $request->user();
        $month = (int) ($request->month ?? now()->month);
        $year  = (int) ($request->year  ?? now()->year);

        $events = CalendarEvent::with(['contact', 'property', 'user'])
            ->when(! $user->isAdmin(), fn($q) => $q->where('user_id', $user->id))
            ->whereYear('starts_at', $year)
            ->whereMonth('starts_at', $month)
            ->orderBy('starts_at')
            ->get();

        $contacts   = Contact::select('id', 'first_name', 'last_name', 'phone')->latest()->limit(300)->get();
        $properties = Property::select('id', 'title', 'address', 'city')->latest()->limit(300)->get();

        return Inertia::render('Calendar/Index', [
            'events'          => $events,
            'month'           => $month,
            'year'            => $year,
            'googleConnected' => (bool) $user->google_access_token,
            'contacts'        => $contacts,
            'properties'      => $properties,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'type'        => 'required|in:' . self::TYPES,
            'starts_at'   => 'required|date',
            'ends_at'     => 'nullable|date',
            'contact_id'  => 'nullable|exists:contacts,id',
            'property_id' => 'nullable|exists:properties,id',
            'description' => 'nullable|string',
            'all_day'     => 'boolean',
        ]);

        $event    = CalendarEvent::create(array_merge($data, ['user_id' => $request->user()->id]));
        $googleId = $this->gcal->push($request->user(), $event);
        if ($googleId) {
            $event->update(['google_event_id' => $googleId]);
        }

        return back()->with('success', 'Evenimentul a fost creat.' . ($googleId ? ' ✅ Sincronizat cu Google.' : ''));
    }

    public function update(Request $request, CalendarEvent $calendarEvent): RedirectResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'type'        => 'required|in:' . self::TYPES,
            'starts_at'   => 'required|date',
            'ends_at'     => 'nullable|date',
            'contact_id'  => 'nullable|exists:contacts,id',
            'property_id' => 'nullable|exists:properties,id',
            'description' => 'nullable|string',
            'all_day'     => 'boolean',
        ]);

        $calendarEvent->update($data);
        $googleId = $this->gcal->push($request->user(), $calendarEvent->fresh());
        if ($googleId && ! $calendarEvent->google_event_id) {
            $calendarEvent->update(['google_event_id' => $googleId]);
        }

        return back()->with('success', 'Evenimentul a fost actualizat.');
    }

    public function updateStatus(Request $request, CalendarEvent $calendarEvent): RedirectResponse
    {
        $request->validate(['status' => 'required|in:' . self::STATUSES]);
        $calendarEvent->update(['status' => $request->status]);

        return back()->with('success', 'Statusul a fost actualizat.');
    }

    public function destroy(CalendarEvent $calendarEvent): RedirectResponse
    {
        if ($calendarEvent->google_event_id) {
            $this->gcal->delete(request()->user(), $calendarEvent->google_event_id);
        }

        $calendarEvent->delete();

        return back()->with('success', 'Evenimentul a fost șters.');
    }
}
