<?php

declare(strict_types=1);

namespace App\Services\Assistant;

/**
 * Outcome of QuotaService::consume().
 *
 *  - countedNew: unique NEW objects charged to the quota this call.
 *  - used/remaining/limit: post-consume totals (feed the 'quota' ChatEvent).
 *  - exceeded: there were more new objects than remaining allowed.
 *  - keptCount: leading-prefix length of the input list that fits the quota —
 *    ChatService slices cards to this so no unpaid object is shown.
 */
final class QuotaConsumeResult
{
    public function __construct(
        public readonly int $countedNew,
        public readonly int $used,
        public readonly int $remaining,
        public readonly int $limit,
        public readonly bool $exceeded,
        public readonly int $keptCount,
    ) {
    }
}
