<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewIpLoginDetected extends Notification
{
    use Queueable;

    public function __construct(
        public readonly User $agent,
        public readonly string $ip,
        public readonly ?string $userAgent,
    ) {}

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("REALTIX — Login din IP nou: {$this->agent->name}")
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Agentul **{$this->agent->name}** ({$this->agent->email}) s-a autentificat dintr-un IP nou:")
            ->line("**IP**: {$this->ip}")
            ->line("**Dispozitiv**: " . ($this->userAgent ?? '—'))
            ->line('Dacă nu recunoști această activitate, dezactivează contul din Setări → Utilizatori.')
            ->action('Verifică în Setări', url('/settings?tab=users'));
    }

    public function toArray($notifiable): array
    {
        return [
            'type'      => 'new_ip_login',
            'title'     => 'Login din IP nou',
            'message'   => "{$this->agent->name} s-a autentificat dintr-un IP nou ({$this->ip})",
            'url'       => '/settings?tab=users',
            'agent_id'  => $this->agent->id,
            'ip'        => $this->ip,
            'icon'      => '🌐',
        ];
    }
}
