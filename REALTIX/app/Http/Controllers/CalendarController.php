<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $month = $request->month ?? now()->month;
        $year = $request->year ?? now()->year;

        $events = CalendarEvent::with(['contact', 'property'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->whereYear('starts_at', $year)
            ->whereMonth('starts_at', $month)
            ->orderBy('starts_at')
            ->get();

        return Inertia::render('Calendar/Index', [
            'events' => $events,
            'month' => (int) $month,
            'year' => (int) $year,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:viewing,meeting,call,contract,other',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'contact_id' => 'nullable|exists:contacts,id',
            'property_id' => 'nullable|exists:properties,id',
            'description' => 'nullable|string',
        ]);

        CalendarEvent::create(array_merge($data, ['user_id' => $request->user()->id]));

        return redirect()->back()->with('success', 'Evenimentul a fost creat.');
    }

    public function destroy(CalendarEvent $calendarEvent)
    {
        $calendarEvent->delete();
        return redirect()->back()->with('success', 'Evenimentul a fost șters.');
    }
}
