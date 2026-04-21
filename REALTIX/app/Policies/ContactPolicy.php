<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    public function view(User $user, Contact $contact): bool
    {
        if ($user->agency_id !== $contact->agency_id) {
            return false;
        }
        return $user->isAdmin() || $user->id === $contact->user_id;
    }

    public function update(User $user, Contact $contact): bool
    {
        return $this->view($user, $contact);
    }

    public function delete(User $user, Contact $contact): bool
    {
        if ($user->agency_id !== $contact->agency_id) {
            return false;
        }
        return $user->isAdmin() || $user->id === $contact->user_id;
    }
}
