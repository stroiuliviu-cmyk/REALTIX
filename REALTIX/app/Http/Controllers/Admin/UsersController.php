<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()
            ->with(['agency:id,name,slug', 'roles:id,name'])
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name',  'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            }))
            ->when($request->agency_id, fn ($q, $id) => $q->where('agency_id', $id))
            ->when($request->role, function ($q, $role) {
                $q->whereHas('roles', fn ($rq) => $rq->where('name', $role));
            })
            ->when($request->status === 'active',   fn ($q) => $q->where('is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false));

        return Inertia::render('Admin/Users', [
            'users'    => $query->latest()->paginate(25)->withQueryString(),
            'filters'  => $request->only(['search', 'agency_id', 'role', 'status']),
            'agencies' => Agency::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function toggleActive(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Nu îți poți dezactiva propriul cont.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', $user->is_active
            ? "Contul {$user->email} a fost activat."
            : "Contul {$user->email} a fost dezactivat.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Nu îți poți șterge propriul cont.');
        }

        $email = $user->email;
        $user->delete();

        return back()->with('success', "Contul {$email} a fost șters.");
    }
}
