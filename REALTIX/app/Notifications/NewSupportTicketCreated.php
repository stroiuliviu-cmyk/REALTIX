<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewSupportTicketCreated extends Notification
{
    use Queueable;

    public function __construct(public SupportTicket $ticket)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $user = $this->ticket->user;
        $url  = url('/super-admin/support/' . $this->ticket->id);

        return (new MailMessage)
            ->subject("[Suport REALTIX] Ticket nou #{$this->ticket->id}: {$this->ticket->subject}")
            ->greeting("Salut, " . $notifiable->name . "!")
            ->line("Un utilizator a deschis un ticket nou pe REALTIX.")
            ->line("**De la:** {$user->name} ({$user->email})")
            ->line("**Subiect:** {$this->ticket->subject}")
            ->line("**Prioritate:** {$this->ticket->priority}")
            ->action('Vezi ticket-ul', $url)
            ->line('Răspunde rapid pentru un UX bun.');
    }
}
