<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgenciesController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Agency::query()
            ->withCount(['users', 'properties', 'contacts', 'deals'])
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('slug', 'like', "%{$s}%");
            }))
            ->when($request->plan, fn ($q, $p) => $q->where('subscription_plan', $p));

        return Inertia::render('Admin/Agencies', [
            'agencies' => $query->latest()->paginate(25)->withQueryString(),
            'filters'  => $request->only(['search', 'plan']),
        ]);
    }

    public function destroy(Agency $agency): RedirectResponse
    {
        $name = $agency->name;
        $agency->delete();

        return back()->with('success', "Agenția {$name} a fost ștearsă.");
    }
}
