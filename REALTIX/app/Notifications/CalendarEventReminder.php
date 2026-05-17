<?php

namespace App\Notifications;

use App\Models\CalendarEvent;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CalendarEventReminder extends Notification
{
    use Queueable, RespectsUserPreferences;

    public function __construct(public readonly CalendarEvent $event) {}

    protected function preferenceKey(): string
    {
        return 'calendar_reminders';
    }

    public function toMail($notifiable): MailMessage
    {
        $when = $this->event->starts_at->locale('ro')->isoFormat('D MMMM, HH:mm');
        $url = url("/calendar?event={$this->event->id}");

        return (new MailMessage)
            ->subject("REALTIX — Reminder: {$this->event->title}")
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Ai un eveniment în curând: **{$this->event->title}**.")
            ->line("Programat la: {$when}")
            ->when($this->event->description, fn ($m) => $m->line($this->event->description))
            ->action('Vezi calendarul', $url);
    }

    public function toArray($notifiable): array
    {
        return [
            'type'     => 'calendar_reminder',
            'title'    => 'Reminder: ' . $this->event->title,
            'message'  => 'Începe la ' . $this->event->starts_at->locale('ro')->isoFormat('HH:mm'),
            'url'      => "/calendar?event={$this->event->id}",
            'event_id' => $this->event->id,
            'icon'     => '📅',
        ];
    }
}
