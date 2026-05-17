<?php

namespace App\Notifications;

use App\Models\Agency;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialExpiringSoon extends Notification
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
        $url  = url('/subscription');
        $when = $this->agency->trial_ends_at?->locale('ro')->isoFormat('D MMMM YYYY');

        return (new MailMessage)
            ->subject("REALTIX — Trial-ul expiră în {$this->daysLeft} zile")
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Perioada de trial gratuit pentru **{$this->agency->name}** expiră în {$this->daysLeft} zile" . ($when ? " ({$when})" : '') . '.')
            ->line('Pentru a continua fără întrerupere, alege un plan și activează plata.')
            ->action('Vezi planuri & activează', $url);
    }

    public function toArray($notifiable): array
    {
        return [
            'type'      => 'trial_expiring',
            'title'     => 'Trial-ul expiră curând',
            'message'   => "Mai ai {$this->daysLeft} zile de trial gratuit.",
            'url'       => '/subscription',
            'agency_id' => $this->agency->id,
            'days_left' => $this->daysLeft,
            'icon'      => '🎁',
        ];
    }
}
