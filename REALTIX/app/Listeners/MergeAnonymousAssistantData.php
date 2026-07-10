<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Http\Middleware\AssistantSession;
use App\Models\Conversation;
use App\Services\Assistant\FavoritesService;
use App\Services\Assistant\QuotaService;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;

/**
 * On successful login/registration, transfer the anonymous assistant data tied
 * to the visitor's owner_token cookie (+ ip_hash) onto the new account:
 * favorites, the free-result quota, and conversations.
 *
 * Reads owner_token from the request cookie (the auth POST carries it — the
 * cookie is same-site). Fully idempotent and a no-op when no owner_token is
 * present (e.g. a returning user who never used the assistant anonymously).
 */
class MergeAnonymousAssistantData
{
    public function __construct(
        private readonly FavoritesService $favorites,
        private readonly QuotaService $quota,
    ) {
    }

    public function handle(Login|Registered $event): void
    {
        $request = request();
        $ownerToken = $request->cookie(AssistantSession::COOKIE);
        if (! is_string($ownerToken) || $ownerToken === '') {
            return;
        }

        $userId = (int) $event->user->getAuthIdentifier();
        $ipHash = hash('sha256', ($request->ip() ?? '') . '|' . (string) config('app.key'));

        $this->favorites->mergeIntoAccount($ownerToken, $userId);
        $this->quota->mergeIntoAccount($ownerToken, $ipHash, $userId);

        Conversation::where('owner_token', $ownerToken)
            ->whereNull('user_id')
            ->update(['user_id' => $userId]);
    }
}
