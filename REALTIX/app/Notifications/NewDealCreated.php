<?php

namespace App\Notifications;

use App\Models\Deal;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDealCreated extends Notification
{
    use Queueable, RespectsUserPreferences;

    public function __construct(public readonly Deal $deal) {}

    protected function preferenceKey(): string
    {
        return 'new_deals';
    }

    public function toMail($notifiable): MailMessage
    {
        $deal = $this->deal;
        $url = url("/deals/{$deal->id}");

        return (new MailMessage)
            ->subject('REALTIX — Tranzacție nouă creată')
            ->greeting("Salut, {$notifiable->name}!")
            ->line("S-a creat o tranzacție nouă: **{$deal->title}**.")
            ->when($deal->price, fn ($m) => $m->line("Valoare: {$deal->price} {$deal->currency}"))
            ->action('Vezi tranzacția', $url)
            ->line('Mulțumim că folosești REALTIX.');
    }

    public function toArray($notifiable): array
    {
        return [
            'type'    => 'new_deal',
            'title'   => 'Tranzacție nouă',
            'message' => 'S-a creat tranzacția „' . $this->deal->title . '".',
            'url'     => "/deals/{$this->deal->id}",
            'deal_id' => $this->deal->id,
            'icon'    => '💼',
        ];
    }
}
