<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Notifications\NewSupportTicketCreated;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function index(): Response
    {
        $tickets = SupportTicket::query()
            ->where('user_id', Auth::id())
            ->with(['replies' => function ($q) {
                $q->where('is_internal_note', false)
                  ->orderBy('created_at', 'desc')
                  ->limit(1);
            }])
            ->orderByDesc('last_reply_at')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Support/Index', [
            'tickets'  => $tickets,
            'statuses' => SupportTicket::STATUSES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Support/Create', [
            'priorities' => SupportTicket::PRIORITIES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject'  => 'required|string|max:255',
            'body'     => 'required|string|min:10|max:10000',
            'priority' => 'required|in:' . implode(',', SupportTicket::PRIORITIES),
        ]);

        $user = Auth::user();

        $ticket = DB::transaction(function () use ($validated, $user) {
            $ticket = SupportTicket::create([
                'user_id'       => $user->id,
                'agency_id'     => $user->agency_id ?? null,
                'subject'       => $validated['subject'],
                'priority'      => $validated['priority'],
                'status'        => 'open',
                'last_reply_at' => now(),
            ]);

            SupportTicketReply::create([
                'ticket_id'        => $ticket->id,
                'user_id'          => $user->id,
                'body'             => $validated['body'],
                'is_internal_note' => false,
            ]);

            return $ticket;
        });

        // Email super-admins (try/catch — ticket creation must not fail if mail config is broken).
        try {
            $this->notifySuperAdmins($ticket);
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()
            ->route('support.show', $ticket->id)
            ->with('success', '✅ Ticket creat. Vei primi un răspuns în curând.');
    }

    public function show(SupportTicket $ticket): Response
    {
        // Authorization: only the creator can view (NOT same-agency colleagues).
        if ($ticket->user_id !== Auth::id()) {
            abort(403);
        }

        $ticket->load([
            'replies' => function ($q) {
                // Hide internal notes — user never sees super-admin sidebar comments.
                $q->where('is_internal_note', false)
                  ->with('user:id,name,email')
                  ->orderBy('created_at', 'asc');
            },
        ]);

        return Inertia::render('Support/Show', [
            'ticket' => $ticket,
        ]);
    }

    public function reply(Request $request, SupportTicket $ticket): RedirectResponse
    {
        if ($ticket->user_id !== Auth::id()) {
            abort(403);
        }

        if ($ticket->status === 'closed') {
            return back()->with('error', 'Ticket-ul e închis. Deschide unul nou dacă mai ai întrebări.');
        }

        $validated = $request->validate([
            'body' => 'required|string|min:5|max:10000',
        ]);

        DB::transaction(function () use ($validated, $ticket) {
            SupportTicketReply::create([
                'ticket_id'        => $ticket->id,
                'user_id'          => Auth::id(),
                'body'             => $validated['body'],
                'is_internal_note' => false,
            ]);

            $ticket->update([
                'last_reply_at' => now(),
                // Re-open resolved tickets when user replies; otherwise keep status.
                'status'        => $ticket->status === 'resolved' ? 'open' : $ticket->status,
            ]);
        });

        return back()->with('success', 'Răspuns trimis.');
    }

    /**
     * Notify all super-admins about a new ticket. Uses Spatie role() scope.
     */
    private function notifySuperAdmins(SupportTicket $ticket): void
    {
        $superAdmins = \App\Models\User::role('super_admin')->get();
        if ($superAdmins->isEmpty()) {
            return;
        }
        Notification::send($superAdmins, new NewSupportTicketCreated($ticket));
    }
}
