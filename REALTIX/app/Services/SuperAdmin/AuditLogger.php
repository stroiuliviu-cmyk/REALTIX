<?php

namespace App\Services\SuperAdmin;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Thin wrapper over ActivityLog with super-admin specific action prefixes.
 * Every destructive or sensitive action from /super-admin should go through this.
 */
class AuditLogger
{
    public function record(string $action, ?Model $subject = null, ?string $description = null, array $context = []): void
    {
        ActivityLog::record(
            action: 'super_admin.' . $action,
            subject: $subject,
            description: $description,
            properties: $context,
        );
    }

    public function impersonationStart(int $targetUserId, ?string $reason = null): void
    {
        $this->record('user.impersonate.start', null, "Impersonate user #{$targetUserId}", [
            'target_user_id' => $targetUserId,
            'reason'         => $reason,
        ]);
    }

    public function impersonationStop(int $targetUserId): void
    {
        $this->record('user.impersonate.stop', null, "Impersonate user #{$targetUserId} stopped", [
            'target_user_id' => $targetUserId,
        ]);
    }

    public function billingRefund(int $invoiceId, int $amountCents, ?string $reason = null): void
    {
        $this->record('billing.refund', null, "Refund €" . number_format($amountCents / 100, 2), [
            'invoice_id' => $invoiceId,
            'amount'     => $amountCents,
            'reason'     => $reason,
        ]);
    }

    public function moderationAction(string $verb, Model $subject, ?string $notes = null): void
    {
        $this->record("moderation.{$verb}", $subject, ucfirst($verb), ['notes' => $notes]);
    }

    public function settingsChanged(string $key, $oldValue, $newValue): void
    {
        $this->record('settings.update', null, "Setting {$key} changed", [
            'key' => $key,
            'old' => $oldValue,
            'new' => $newValue,
        ]);
    }

    public function ipBlacklisted(string $ip, ?string $reason = null): void
    {
        $this->record('security.ip.blacklist', null, "IP {$ip} blacklisted", [
            'ip' => $ip, 'reason' => $reason,
        ]);
    }
}
