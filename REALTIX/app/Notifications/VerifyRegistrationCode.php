<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyRegistrationCode extends Notification
{
    public function __construct(private string $code) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Codul tău de verificare REALTIX: ' . $this->code)
            ->greeting('Bună ziua!')
            ->line('Ai solicitat crearea unui cont pe platforma **REALTIX**.')
            ->line('Codul tău de verificare este:')
            ->line('# ' . $this->code)
            ->line('Codul este valabil timp de **10 minute**.')
            ->line('Introdu acest cod în pagina de înregistrare pentru a-ți confirma adresa de email.')
            ->line('---')
            ->line('Dacă nu ai solicitat înregistrarea, ignoră acest email. Nimeni nu poate accesa contul tău fără codul de verificare.')
            ->salutation('Cu stimă, Echipa REALTIX');
    }
}
