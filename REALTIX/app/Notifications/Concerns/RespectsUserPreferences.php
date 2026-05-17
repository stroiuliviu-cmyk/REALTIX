<?php

namespace App\Notifications\Concerns;

use App\Models\User;

trait RespectsUserPreferences
{
    /**
     * The preference key (e.g. 'new_deals') that gates this notification.
     * Override in the notification class.
     */
    abstract protected function preferenceKey(): string;

    /**
     * Build delivery channels list based on user preferences.
     * `database` is always on (in-app feed); mail/push only if both the event
     * type AND the channel are enabled in `notification_prefs`.
     */
    public function via(User $notifiable): array
    {
        $prefs = $notifiable->notification_prefs ?? [];
        $eventEnabled = $prefs[$this->preferenceKey()] ?? true;

        if (! $eventEnabled) {
            return [];
        }

        $channels = ['database'];

        if (($prefs['email_enabled'] ?? true) && $notifiable->email) {
            $channels[] = 'mail';
        }

        return $channels;
    }
}
