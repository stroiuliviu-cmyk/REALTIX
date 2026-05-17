<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\SuperAdmin\SystemHealthService;
use Inertia\Inertia;
use Inertia\Response;

class SystemHealthController extends Controller
{
    public function index(SystemHealthService $health): Response
    {
        return Inertia::render('SuperAdmin/SystemHealth/Index', [
            'snapshot' => $health->snapshot(),
        ]);
    }
}
