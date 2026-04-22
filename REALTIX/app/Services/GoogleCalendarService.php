<?php

namespace App\Services;

use App\Models\CalendarEvent;
use App\Models\User;
use Carbon\Carbon;
use Google\Client as GoogleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\Event as GoogleEvent;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private GoogleClient $client;

    public function __construct()
    {
        $this->client = new GoogleClient();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect'));
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent select_account');
        $this->client->setScopes([Calendar::CALENDAR]);
        $this->client->setIncludeGrantedScopes(true);
    }

    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    public function exchangeCode(string $code): array
    {
        $token = $this->client->fetchAccessTokenWithAuthCode($code);

        if (isset($token['error'])) {
            throw new \RuntimeException('Google OAuth error: ' . ($token['error_description'] ?? $token['error']));
        }

        return $token;
    }

    public function buildForUser(User $user): ?Calendar
    {
        if (! $user->google_access_token) {
            return null;
        }

        $tokenData = [
            'access_token'  => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
            'expires_in'    => 3600,
        ];

        if ($user->google_token_expires_at) {
            $tokenData['created'] = $user->google_token_expires_at->subHour()->timestamp;
        }

        $this->client->setAccessToken($tokenData);

        // Auto-refresh expired token
        if ($this->client->isAccessTokenExpired()) {
            if (! $user->google_refresh_token) {
                return null;
            }

            $newToken = $this->client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);

            if (isset($newToken['error'])) {
                Log::warning('Google token refresh failed for user ' . $user->id);
                return null;
            }

            $user->update([
                'google_access_token'    => $newToken['access_token'],
                'google_token_expires_at'=> Carbon::now()->addSeconds($newToken['expires_in'] ?? 3600),
            ]);

            $this->client->setAccessToken($newToken);
        }

        return new Calendar($this->client);
    }

    public function push(User $user, CalendarEvent $event): ?string
    {
        $service = $this->buildForUser($user);
        if (! $service) return null;

        $calendarId = $user->google_calendar_id ?? 'primary';

        $gEvent = $this->buildGoogleEvent($event);

        try {
            if ($event->google_event_id) {
                $result = $service->events->update($calendarId, $event->google_event_id, $gEvent);
            } else {
                $result = $service->events->insert($calendarId, $gEvent);
            }
            return $result->getId();
        } catch (\Exception $e) {
            Log::error('Google Calendar push failed: ' . $e->getMessage());
            return null;
        }
    }

    public function delete(User $user, string $googleEventId): void
    {
        $service = $this->buildForUser($user);
        if (! $service) return;

        $calendarId = $user->google_calendar_id ?? 'primary';

        try {
            $service->events->delete($calendarId, $googleEventId);
        } catch (\Exception $e) {
            Log::warning('Google Calendar delete failed: ' . $e->getMessage());
        }
    }

    public function importFromGoogle(User $user): int
    {
        $service = $this->buildForUser($user);
        if (! $service) return 0;

        $calendarId = $user->google_calendar_id ?? 'primary';

        $params = [
            'timeMin'      => Carbon::now()->startOfMonth()->toRfc3339String(),
            'timeMax'      => Carbon::now()->addMonths(3)->endOfMonth()->toRfc3339String(),
            'singleEvents' => true,
            'orderBy'      => 'startTime',
            'maxResults'   => 250,
        ];

        try {
            $results = $service->events->listEvents($calendarId, $params);
        } catch (\Exception $e) {
            Log::error('Google Calendar import failed: ' . $e->getMessage());
            return 0;
        }

        $count = 0;

        foreach ($results->getItems() as $gEvent) {
            if ($gEvent->getStatus() === 'cancelled') {
                CalendarEvent::where('google_event_id', $gEvent->getId())->delete();
                continue;
            }

            $start = $gEvent->getStart();
            $end   = $gEvent->getEnd();

            $startsAt = $start->getDateTime()
                ? Carbon::parse($start->getDateTime())
                : Carbon::parse($start->getDate())->startOfDay();

            $endsAt = $end?->getDateTime()
                ? Carbon::parse($end->getDateTime())
                : ($end?->getDate() ? Carbon::parse($end->getDate())->endOfDay() : null);

            CalendarEvent::updateOrCreate(
                ['google_event_id' => $gEvent->getId()],
                [
                    'agency_id'   => $user->agency_id,
                    'user_id'     => $user->id,
                    'title'       => $gEvent->getSummary() ?? '(fără titlu)',
                    'description' => $gEvent->getDescription(),
                    'type'        => $this->guessType($gEvent->getSummary()),
                    'starts_at'   => $startsAt,
                    'ends_at'     => $endsAt,
                ]
            );

            $count++;
        }

        return $count;
    }

    private function buildGoogleEvent(CalendarEvent $event): GoogleEvent
    {
        $gEvent = new GoogleEvent();
        $gEvent->setSummary($event->title);
        $gEvent->setDescription($event->description ?? '');

        $start = new EventDateTime();
        $start->setDateTime($event->starts_at->toRfc3339String());
        $start->setTimeZone(config('app.timezone', 'Europe/Chisinau'));
        $gEvent->setStart($start);

        $end = new EventDateTime();
        $endTime = $event->ends_at ?? $event->starts_at->addHour();
        $end->setDateTime($endTime->toRfc3339String());
        $end->setTimeZone(config('app.timezone', 'Europe/Chisinau'));
        $gEvent->setEnd($end);

        $gEvent->setColorId($this->colorId($event->type));

        return $gEvent;
    }

    private function colorId(string $type): string
    {
        return match($type) {
            'viewing'  => '1',  // blue
            'meeting'  => '3',  // purple
            'call'     => '5',  // banana
            'contract' => '2',  // green
            default    => '8',  // graphite
        };
    }

    private function guessType(string $title = ''): string
    {
        $t = mb_strtolower($title);
        if (str_contains($t, 'vizion') || str_contains($t, 'viewing')) return 'viewing';
        if (str_contains($t, 'contract'))                               return 'contract';
        if (str_contains($t, 'apel') || str_contains($t, 'call'))      return 'call';
        if (str_contains($t, 'întâln') || str_contains($t, 'meeting')) return 'meeting';
        return 'other';
    }
}
