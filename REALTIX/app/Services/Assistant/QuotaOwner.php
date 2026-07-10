<?php

declare(strict_types=1);

namespace App\Services\Assistant;

/**
 * Identity used to count and charge the free-result quota.
 *
 * Authenticated → identity is user_id.
 * Anonymous     → identity is owner_token OR ip_hash (objects are counted
 *                 distinctly across BOTH, so clearing the cookie does not reset
 *                 the quota — anti-abuse, TZ §4.10 / FR-QUOTA-6).
 */
final class QuotaOwner
{
    public function __construct(
        public readonly string $ownerToken,
        public readonly ?int $userId = null,
        public readonly ?string $ipHash = null,
    ) {
    }

    public function isAuthenticated(): bool
    {
        return $this->userId !== null;
    }
}
