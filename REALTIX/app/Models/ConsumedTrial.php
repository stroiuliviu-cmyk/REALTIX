<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Email-uri care au consumat deja perioada de trial (la ștergere cont).
 * Stocăm doar SHA-256 al adresei normalizate (lowercase + trim) — adresa nu
 * mai poate fi recuperată din DB, dar putem verifica dacă o adresă cunoscută
 * a mai avut trial.
 */
class ConsumedTrial extends Model
{
    protected $fillable = ['email_hash', 'consumed_at'];

    protected $casts = [
        'consumed_at' => 'datetime',
    ];

    public static function hashEmail(string $email): string
    {
        return hash('sha256', mb_strtolower(trim($email)));
    }

    public static function wasConsumed(string $email): bool
    {
        return static::where('email_hash', static::hashEmail($email))->exists();
    }

    public static function markConsumed(string $email): void
    {
        static::firstOrCreate(
            ['email_hash' => static::hashEmail($email)],
            ['consumed_at' => now()],
        );
    }
}
