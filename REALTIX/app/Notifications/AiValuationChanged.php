<?php

namespace App\Notifications;

use App\Models\Property;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AiValuationChanged extends Notification
{
    use Queueable, RespectsUserPreferences;

    public function __construct(
        public readonly Property $property,
        public readonly ?int $oldMin,
        public readonly ?int $oldMax,
        public readonly ?int $newMin,
        public readonly ?int $newMax,
    ) {}

    protected function preferenceKey(): string
    {
        return 'ai_valuation_change';
    }

    public function toMail($notifiable): MailMessage
    {
        $url = url("/properties/{$this->property->id}");
        $oldRange = $this->oldMin ? "€{$this->oldMin} – €{$this->oldMax}" : '—';
        $newRange = $this->newMin ? "€{$this->newMin} – €{$this->newMax}" : '—';

        return (new MailMessage)
            ->subject('REALTIX — Estimare AI actualizată')
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Estimarea AI pentru proprietatea **{$this->property->title}** s-a schimbat.")
            ->line("Înainte: {$oldRange}")
            ->line("Acum: {$newRange}")
            ->action('Vezi proprietatea', $url);
    }

    public function toArray($notifiable): array
    {
        return [
            'type'        => 'ai_valuation_change',
            'title'       => 'Estimare AI actualizată',
            'message'     => 'Prețul estimat pentru „' . $this->property->title . '" s-a schimbat.',
            'url'         => "/properties/{$this->property->id}",
            'property_id' => $this->property->id,
            'old_min'     => $this->oldMin,
            'old_max'     => $this->oldMax,
            'new_min'     => $this->newMin,
            'new_max'     => $this->newMax,
            'icon'        => '🔮',
        ];
    }
}
