<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactInteraction;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = Contact::with('user')
            ->withCount('interactions')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->when($request->search, fn ($q, $s) =>
                $q->where(fn ($q) =>
                    $q->where('first_name', 'like', "%{$s}%")
                      ->orWhere('last_name', 'like', "%{$s}%")
                      ->orWhere('phone', 'like', "%{$s}%")
                )
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->forgotten, fn ($q) => $q->where(function ($q) {
                $q->whereDoesntHave('interactions', fn ($iq) => $iq->where('created_at', '>=', now()->subDays(30)))
                  ->where('updated_at', '<', now()->subDays(30));
            }))
            ->latest();

        $contacts = $query->paginate(20)->withQueryString();

        // Add `is_forgotten` flag to each: no interaction in last 30 days AND not recently updated
        $thirtyDaysAgo = now()->subDays(30);
        $contactIds = $contacts->getCollection()->pluck('id');
        $recentInteractionIds = \App\Models\ContactInteraction::whereIn('contact_id', $contactIds)
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->pluck('contact_id')
            ->unique()
            ->all();

        $contacts->getCollection()->transform(function ($c) use ($recentInteractionIds, $thirtyDaysAgo) {
            $hasRecent = in_array($c->id, $recentInteractionIds, true);
            $c->is_forgotten = ! $hasRecent && $c->updated_at?->lt($thirtyDaysAgo);
            return $c;
        });

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'filters'  => $request->only(['search', 'status', 'type', 'forgotten']),
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

        $user      = $request->user();
        $duplicate = null;

        // Phone duplicate detection within the agency
        if (! empty($data['phone'])) {
            $normalizedPhone = preg_replace('/\s+/', '', $data['phone']);
            $duplicate = Contact::where('phone', 'like', "%{$normalizedPhone}%")
                ->with('user:id,name')
                ->first();
        }

        Contact::create(array_merge($data, ['user_id' => $user->id]));

        if ($duplicate) {
            $owner = $duplicate->user?->name ?? 'altcineva';
            $name  = trim($duplicate->first_name . ' ' . $duplicate->last_name);
            return redirect()->route('contacts.index')
                ->with('warning', '⚠ Telefonul ' . $data['phone'] . ' există deja la „' . $name . '" (agent: ' . $owner . '). Contactul a fost totuși adăugat.');
        }

        return redirect()->route('contacts.index')
            ->with('success', 'Contactul a fost adăugat.');
    }

    public function show(Contact $contact): Response
    {
        Gate::authorize('view', $contact);

        $contracts = \App\Models\GeneratedContract::with(['template', 'property'])
            ->where('contact_id', $contact->id)
            ->latest()
            ->get();

        $meetings = \App\Models\CalendarEvent::with(['property', 'user'])
            ->where('contact_id', $contact->id)
            ->orderBy('starts_at', 'desc')
            ->limit(15)
            ->get();

        $contact->load([
            'interactions.user',
            'deals.property',
            'properties' => fn ($q) => $q->select('properties.id', 'title', 'address', 'city', 'price', 'currency', 'type', 'transaction_type', 'status'),
        ]);

        // Available properties (not yet linked) for the "add" picker
        $linkedIds = $contact->properties->pluck('id')->all();
        $availableProperties = Property::whereNotIn('id', $linkedIds)
            ->select('id', 'title', 'address', 'city', 'price', 'currency')
            ->latest()
            ->limit(100)
            ->get();

        return Inertia::render('Contacts/Show', [
            'contact'             => $contact,
            'contracts'           => $contracts,
            'meetings'            => $meetings,
            'availableProperties' => $availableProperties,
        ]);
    }

    public function attachProperty(Request $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $data = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'relation'    => 'required|in:owner,interested,tenant',
            'notes'       => 'nullable|string|max:500',
        ]);

        $contact->properties()->syncWithoutDetaching([
            $data['property_id'] => [
                'relation' => $data['relation'],
                'notes'    => $data['notes'] ?? null,
            ],
        ]);

        return back()->with('success', 'Proprietatea a fost asociată contactului.');
    }

    public function detachProperty(Contact $contact, Property $property)
    {
        Gate::authorize('update', $contact);

        $contact->properties()->detach($property->id);

        return back()->with('success', 'Asocierea a fost eliminată.');
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
