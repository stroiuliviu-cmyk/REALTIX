<?php

namespace App\Notifications;

use App\Models\Agency;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiringSoon extends Notification
{
    use Queueable, RespectsUserPreferences;

    public function __construct(
        public readonly Agency $agency,
        public readonly int $daysLeft,
    ) {}

    protected function preferenceKey(): string
    {
        return 'subscription_end';
    }

    public function toMail($notifiable): MailMessage
    {
        $url = url('/subscription');
        $when = $this->agency->subscription_ends_at?->locale('ro')->isoFormat('D MMMM YYYY');

        return (new MailMessage)
            ->subject("REALTIX — Abonamentul expiră în {$this->daysLeft} zile")
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Abonamentul **{$this->agency->name}** expiră în {$this->daysLeft} zile" . ($when ? " ({$when})" : '') . '.')
            ->line('Pentru a continua fără întrerupere, prelungește abonamentul.')
            ->action('Prelungește abonamentul', $url);
    }

    public function toArray($notifiable): array
    {
        return [
            'type'      => 'subscription_expiring',
            'title'     => 'Abonament expiră curând',
            'message'   => "Mai ai {$this->daysLeft} zile pe planul curent.",
            'url'       => '/subscription',
            'agency_id' => $this->agency->id,
            'days_left' => $this->daysLeft,
            'icon'      => '⏰',
        ];
    }
}
