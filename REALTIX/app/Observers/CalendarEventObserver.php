<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use Illuminate\Support\Facades\Auth;

class CalendarEventObserver
{
    public function created(CalendarEvent $event): void
    {
        if (Auth::check()) {
            ActivityLog::record('calendar.created', $event, "Eveniment calendar: {$event->title}");
        }
    }

    public function deleted(CalendarEvent $event): void
    {
        if (Auth::check()) {
            ActivityLog::record('calendar.deleted', $event, "Eveniment șters: {$event->title}");
        }
    }
}
