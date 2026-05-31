<?php

namespace App\Notifications;

use App\Models\Contact;
use App\Models\User;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactTransferred extends Notification
{
    use Queueable, RespectsUserPreferences;

    public function __construct(
        public readonly Contact $contact,
        public readonly User $fromUser,
        public readonly ?string $notes = null,
    ) {}

    // Not gated by an explicit preference key — `RespectsUserPreferences::via()`
    // defaults unknown keys to enabled, so transfers go through unless a user
    // explicitly opts out by storing `contact_transfers => false`.
    protected function preferenceKey(): string
    {
        return 'contact_transfers';
    }

    public function toMail($notifiable): MailMessage
    {
        $name = trim($this->contact->first_name.' '.($this->contact->last_name ?? ''));
        $url  = url("/contacts/{$this->contact->id}");

        return (new MailMessage)
            ->subject('REALTIX — Client transferat către tine')
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Ți-a fost transferat clientul **{$name}** de către {$this->fromUser->name}.")
            ->when($this->notes, fn ($m) => $m->line("Notă: {$this->notes}"))
            ->action('Vezi clientul', $url)
            ->line('Mulțumim că folosești REALTIX.');
    }

    public function toArray($notifiable): array
    {
        $name = trim($this->contact->first_name.' '.($this->contact->last_name ?? ''));

        return [
            'type'       => 'contact_transfer',
            'title'      => 'Client transferat',
            'message'    => "Ți-a fost transferat clientul „{$name}” de către {$this->fromUser->name}.",
            'url'        => "/contacts/{$this->contact->id}",
            'contact_id' => $this->contact->id,
            'icon'       => 'user-plus',
        ];
    }
}
