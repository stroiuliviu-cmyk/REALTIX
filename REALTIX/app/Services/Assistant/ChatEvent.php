<?php

declare(strict_types=1);

namespace App\Services\Assistant;

use JsonSerializable;

/**
 * A single event streamed to the client. The wire shape mirrors the frontend
 * `ChatEvent` union in resources/js/Features/Assistant/types.ts EXACTLY, so the
 * (future) SseTransport maps it 1:1 with no translation:
 *
 *   { type: 'token',        text }
 *   { type: 'tool_running', tool }                       // search_listings|search_agencies|get_listing_details
 *   { type: 'cards',        listings?, agencies? }
 *   { type: 'quota',        used, remaining, limit, exceeded }
 *   { type: 'done',         conversationId }
 *   { type: 'error',        code, message }               // rate_limited|server_error|no_results
 */
final class ChatEvent implements JsonSerializable
{
    /** @param array<string,mixed> $payload */
    private function __construct(
        public readonly string $type,
        private readonly array $payload,
    ) {
    }

    public static function token(string $text): self
    {
        return new self('token', ['text' => $text]);
    }

    public static function toolRunning(string $tool): self
    {
        return new self('tool_running', ['tool' => $tool]);
    }

    /**
     * @param list<array<string,mixed>>|null $listings
     * @param list<array<string,mixed>>|null $agencies
     */
    public static function cards(?array $listings = null, ?array $agencies = null): self
    {
        $payload = [];
        if ($listings !== null) {
            $payload['listings'] = $listings;
        }
        if ($agencies !== null) {
            $payload['agencies'] = $agencies;
        }

        return new self('cards', $payload);
    }

    public static function quota(int $used, int $remaining, int $limit, bool $exceeded): self
    {
        return new self('quota', [
            'used' => $used,
            'remaining' => $remaining,
            'limit' => $limit,
            'exceeded' => $exceeded,
        ]);
    }

    public static function done(string $conversationId): self
    {
        return new self('done', ['conversationId' => $conversationId]);
    }

    /** @param 'rate_limited'|'server_error'|'no_results' $code */
    public static function error(string $code, string $message): self
    {
        return new self('error', ['code' => $code, 'message' => $message]);
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return ['type' => $this->type, ...$this->payload];
    }

    /** @return array<string,mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
