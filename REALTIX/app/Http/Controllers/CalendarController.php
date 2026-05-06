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

        $conflict = $this->findConflict($request->user(), $data['starts_at'], $data['ends_at'] ?? null);

        $event    = CalendarEvent::create(array_merge($data, ['user_id' => $request->user()->id]));
        $googleId = $this->gcal->push($request->user(), $event);
        if ($googleId) {
            $event->update(['google_event_id' => $googleId]);
        }

        $msg = 'Evenimentul a fost creat.' . ($googleId ? ' ✅ Sincronizat cu Google.' : '');
        if ($conflict) {
            return back()->with('warning', $msg . ' ⚠ Atenție: se suprapune cu „' . $conflict->title . '" (' . $conflict->starts_at->format('H:i') . ').');
        }
        return back()->with('success', $msg);
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

        $conflict = $this->findConflict(
            $request->user(),
            $data['starts_at'],
            $data['ends_at'] ?? null,
            $calendarEvent->id,
        );

        $calendarEvent->update($data);
        $googleId = $this->gcal->push($request->user(), $calendarEvent->fresh());
        if ($googleId && ! $calendarEvent->google_event_id) {
            $calendarEvent->update(['google_event_id' => $googleId]);
        }

        if ($conflict) {
            return back()->with('warning', 'Evenimentul a fost actualizat. ⚠ Atenție: se suprapune cu „' . $conflict->title . '" (' . $conflict->starts_at->format('H:i') . ').');
        }
        return back()->with('success', 'Evenimentul a fost actualizat.');
    }

    /**
     * Detect any other event from the same user that overlaps the given window.
     * Empty ends_at is treated as a 1-hour window starting at starts_at.
     */
    private function findConflict($user, string $startsAt, ?string $endsAt, ?int $excludeId = null): ?CalendarEvent
    {
        $start = \Carbon\Carbon::parse($startsAt);
        $end   = $endsAt ? \Carbon\Carbon::parse($endsAt) : $start->copy()->addHour();

        return CalendarEvent::query()
            ->where('user_id', $user->id)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->whereNotIn('status', ['rejected', 'no_show'])
            ->where(function ($q) use ($start, $end) {
                // Existing event starts before our end AND ends after our start.
                // For events without ends_at, treat as 1h slot.
                $q->where('starts_at', '<', $end)
                  ->where(function ($q2) use ($start) {
                      $q2->where('ends_at', '>', $start)
                         ->orWhere(function ($q3) use ($start) {
                             $q3->whereNull('ends_at')
                                ->whereRaw("datetime(starts_at, '+1 hour') > ?", [$start->toDateTimeString()]);
                         });
                  });
            })
            ->orderBy('starts_at')
            ->first();
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
