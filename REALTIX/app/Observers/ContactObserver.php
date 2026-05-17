<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Contact;
use Illuminate\Support\Facades\Auth;

class ContactObserver
{
    public function created(Contact $contact): void
    {
        if (Auth::check()) {
            ActivityLog::record('contact.created', $contact, "Contact nou: {$contact->name}");
        }
    }

    public function updated(Contact $contact): void
    {
        if (! Auth::check()) {
            return;
        }
        $changes = array_diff_key($contact->getChanges(), array_flip(['updated_at']));
        if (! empty($changes)) {
            ActivityLog::record('contact.updated', $contact, "Contact actualizat: {$contact->name}", ['changes' => array_keys($changes)]);
        }
    }

    public function deleted(Contact $contact): void
    {
        if (Auth::check()) {
            ActivityLog::record('contact.deleted', $contact, "Contact șters: {$contact->name}");
        }
    }
}
