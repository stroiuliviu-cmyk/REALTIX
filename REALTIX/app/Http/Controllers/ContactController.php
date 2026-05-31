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

        // Properties roster shipped to the CloseContactWizard (triggered from
        // the per-row StatusDropdown when an agent flips a contact to closed).
        // Same projection as Show(), without the per-contact linkedIds filter
        // since the list view has no "current contact" context. Property uses
        // the BelongsToAgency global scope, so the query is auto-restricted.
        $availableProperties = Property::query()
            ->select('id', 'title', 'address', 'city', 'price', 'currency', 'type', 'transaction_type')
            ->latest()
            ->limit(100)
            ->get();

        return Inertia::render('Contacts/Index', [
            'contacts'            => $contacts,
            'filters'             => $request->only(['search', 'status', 'type', 'forgotten']),
            'availableProperties' => $availableProperties,
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

        $user = request()->user();
        $agencyAgents = $user->isAdmin()
            ? \App\Models\User::withoutGlobalScopes()
                ->where('agency_id', $user->agency_id)
                ->where('id', '!=', $contact->user_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
            : collect();

        // Activity log for this contact (transfers etc). Resolve user names
        // once via an in() lookup instead of N+1 inside the map.
        $rawLogs = \App\Models\ActivityLog::query()
            ->where('subject_type', Contact::class)
            ->where('subject_id', $contact->id)
            ->whereIn('action', ['contact.transfer'])
            ->latest('created_at')
            ->limit(20)
            ->get();

        $userIds = $rawLogs->flatMap(fn ($l) => [
            $l->properties['from_user_id'] ?? null,
            $l->properties['to_user_id']   ?? null,
        ])->filter()->unique()->all();
        $userNames = \App\Models\User::withoutGlobalScopes()
            ->whereIn('id', $userIds)
            ->pluck('name', 'id');

        $activityLogs = $rawLogs->map(function ($log) use ($userNames) {
            $props = $log->properties ?? [];
            $resolve = fn ($id) => $id ? ($userNames[$id] ?? "User #{$id}") : null;
            return [
                'id'          => $log->id,
                'action'      => $log->action,
                'description' => $log->description,
                'notes'       => $props['notes'] ?? null,
                'from_user'   => $resolve($props['from_user_id'] ?? null),
                'to_user'     => $resolve($props['to_user_id'] ?? null),
                'created_at'  => $log->created_at->toIso8601String(),
            ];
        });

        return Inertia::render('Contacts/Show', [
            'contact'             => $contact,
            'contracts'           => $contracts,
            'meetings'            => $meetings,
            'availableProperties' => $availableProperties,
            'isAdmin'             => $user->isAdmin(),
            'agencyAgents'        => $agencyAgents,
            'activityLogs'        => $activityLogs,
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

    public function transfer(Request $request, Contact $contact)
    {
        $admin = $request->user();
        abort_unless($admin->isAdmin() && $contact->agency_id === $admin->agency_id, 403);

        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'notes'   => 'nullable|string|max:500',
        ]);

        $target = \App\Models\User::withoutGlobalScopes()->find($data['user_id']);
        if (! $target || $target->agency_id !== $admin->agency_id) {
            return back()->with('error', 'Agentul țintă nu aparține agenției tale.');
        }

        if ($target->id === $contact->user_id) {
            return back()->with('error', "Clientul este deja atribuit lui {$target->name}.");
        }

        $oldUserId = $contact->user_id;
        $contact->update(['user_id' => $target->id]);

        \App\Models\ActivityLog::record(
            'contact.transfer',
            $contact,
            "Client transferat de la user #{$oldUserId} la {$target->name}",
            ['from_user_id' => $oldUserId, 'to_user_id' => $target->id, 'notes' => $data['notes'] ?? null]
        );

        // Notify the new owner (bell + email). Skip self-transfers so the admin
        // who reassigns a client to themselves doesn't get pinged.
        if ($target->id !== $oldUserId) {
            $target->notify(new \App\Notifications\ContactTransferred(
                $contact->fresh(),
                $admin,
                $data['notes'] ?? null,
            ));
        }

        return back()->with('success', "Client transferat către {$target->name}.");
    }

    public function updateStatus(Request $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $data = $request->validate([
            'status' => 'required|in:lead,active,closed',
        ]);

        $contact->update($data);

        return back()->with('success', 'Status actualizat.');
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

    public function updateInteraction(Request $request, Contact $contact, ContactInteraction $interaction)
    {
        Gate::authorize('update', $contact);
        // Bind by parent — refuze rute cross-contact.
        abort_unless($interaction->contact_id === $contact->id, 404);

        $data = $request->validate([
            'type' => 'required|in:note,call,email,viewing,contract',
            'body' => 'required|string',
            'scheduled_at' => 'nullable|date',
        ]);

        $interaction->update($data);

        return back()->with('success', 'Interacțiunea a fost actualizată.');
    }

    public function destroyInteraction(Request $request, Contact $contact, ContactInteraction $interaction)
    {
        Gate::authorize('update', $contact);
        abort_unless($interaction->contact_id === $contact->id, 404);

        $interaction->delete();

        return back()->with('success', 'Interacțiunea a fost ștearsă.');
    }
}
