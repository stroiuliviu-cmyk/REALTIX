<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renders the generic "Section coming soon" placeholder for Super Admin sections
 * not yet implemented in Phase 0. Real controllers replace these incrementally.
 */
class PlaceholderController extends Controller
{
    public function __invoke(string $section, ?string $description = null): Response
    {
        return Inertia::render('SuperAdmin/Placeholder', [
            'section'     => $section,
            'description' => $description,
        ]);
    }
}
