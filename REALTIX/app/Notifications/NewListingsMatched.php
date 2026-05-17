<?php

namespace App\Notifications;

use App\Models\ScrapedListing;
use App\Notifications\Concerns\RespectsUserPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent by NotifyUserOfMatchesJob when one or more freshly-scraped listings
 * match a saved search the user owns.
 */
class NewListingsMatched extends Notification
{
    use Queueable, RespectsUserPreferences;

    /** @var array<int> */
    public array $listingIds;

    public function __construct(array $listingIds)
    {
        $this->listingIds = array_values(array_unique($listingIds));
    }

    protected function preferenceKey(): string
    {
        return 'saved_search_match';
    }

    public function toMail($notifiable): MailMessage
    {
        $count = count($this->listingIds);
        $url   = url('/web-offers?ids=' . implode(',', array_slice($this->listingIds, 0, 50)));

        $msg = (new MailMessage)
            ->subject("REALTIX — {$count} anunțuri noi pentru căutările tale salvate")
            ->greeting("Salut, {$notifiable->name}!")
            ->line("Am găsit {$count} anunț(uri) noi care se potrivesc cu căutările tale salvate.");

        // Embed up to 5 titles as preview.
        $previews = ScrapedListing::query()->whereIn('id', array_slice($this->listingIds, 0, 5))->get();
        foreach ($previews as $listing) {
            $price = $listing->price
                ? number_format((float) $listing->price, 0, '.', ' ') . ' ' . ($listing->currency ?? 'EUR')
                : '—';
            $msg->line("• {$listing->title} — {$price}");
        }

        return $msg->action('Vezi anunțurile', $url);
    }

    public function toArray($notifiable): array
    {
        return [
            'type'        => 'saved_search_match',
            'title'       => 'Anunțuri noi pentru căutările salvate',
            'message'     => count($this->listingIds) . ' anunțuri noi se potrivesc cu căutările tale.',
            'url'         => '/web-offers?ids=' . implode(',', array_slice($this->listingIds, 0, 50)),
            'listing_ids' => $this->listingIds,
            'count'       => count($this->listingIds),
            'icon'        => '🔔',
        ];
    }
}
