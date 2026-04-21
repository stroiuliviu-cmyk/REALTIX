<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactInteraction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = Contact::with('user')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->when($request->search, fn ($q, $s) =>
                $q->where(fn ($q) =>
                    $q->where('first_name', 'ilike', "%{$s}%")
                      ->orWhere('last_name', 'ilike', "%{$s}%")
                      ->orWhere('phone', 'ilike', "%{$s}%")
                )
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->latest();

        return Inertia::render('Contacts/Index', [
            'contacts' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'type' => 'required|in:buyer,seller,landlord,tenant',
            'status' => 'required|in:lead,active,closed',
            'notes' => 'nullable|string',
            'source' => 'nullable|string|max:100',
        ]);

        Contact::create(array_merge($data, ['user_id' => $request->user()->id]));

        return redirect()->route('contacts.index')
            ->with('success', 'Contactul a fost adăugat.');
    }

    public function show(Contact $contact): Response
    {
        Gate::authorize('view', $contact);

        return Inertia::render('Contacts/Show', [
            'contact' => $contact->load('interactions.user', 'deals.property'),
        ]);
    }

    public function update(Request $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'type' => 'required|in:buyer,seller,landlord,tenant',
            'status' => 'required|in:lead,active,closed',
            'notes' => 'nullable|string',
        ]);

        $contact->update($data);

        return redirect()->back()->with('success', 'Contact actualizat.');
    }

    public function destroy(Contact $contact)
    {
        Gate::authorize('delete', $contact);
        $contact->delete();

        return redirect()->route('contacts.index')
            ->with('success', 'Contactul a fost șters.');
    }

    public function addInteraction(Request $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $data = $request->validate([
            'type' => 'required|in:note,call,email,viewing,contract',
            'body' => 'required|string',
            'scheduled_at' => 'nullable|date',
        ]);

        $contact->interactions()->create(array_merge($data, ['user_id' => $request->user()->id]));

        return redirect()->back()->with('success', 'Interacțiunea a fost adăugată.');
    }
}
