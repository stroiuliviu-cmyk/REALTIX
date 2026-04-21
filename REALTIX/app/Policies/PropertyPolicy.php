<?php

namespace App\Policies;

use App\Models\Property;
use App\Models\User;

class PropertyPolicy
{
    public function view(User $user, Property $property): bool
    {
        return $user->agency_id === $property->agency_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('properties.create');
    }

    public function update(User $user, Property $property): bool
    {
        if ($user->isAdmin() && $user->agency_id === $property->agency_id) {
            return true;
        }
        return $user->id === $property->user_id;
    }

    public function delete(User $user, Property $property): bool
    {
        if ($user->isAdmin() && $user->agency_id === $property->agency_id) {
            return true;
        }
        return $user->id === $property->user_id;
    }
}
