<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->get('status', 'open');

        $tickets = SupportTicket::with(['user:id,name,email', 'agency:id,name', 'assignedTo:id,name'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($request->priority, fn ($q, $p) => $q->where('priority', $p))
            ->when($request->search, fn ($q, $s) => $q->where('subject', 'ilike', "%{$s}%"))
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END")
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $counts = [
            'open'     => SupportTicket::where('status', 'open')->count(),
            'pending'  => SupportTicket::where('status', 'pending')->count(),
            'resolved' => SupportTicket::where('status', 'resolved')->count(),
            'closed'   => SupportTicket::where('status', 'closed')->count(),
        ];

        return Inertia::render('SuperAdmin/Support/Index', [
            'tickets' => $tickets,
            'status'  => $status,
            'counts'  => $counts,
            'filters' => $request->only(['priority', 'search']),
        ]);
    }

    public function show(SupportTicket $ticket): Response
    {
        $ticket->load([
            'user:id,name,email',
            'agency:id,name,subscription_plan',
            'assignedTo:id,name',
            'replies.user:id,name',
        ]);

        return Inertia::render('SuperAdmin/Support/Show', [
            'ticket' => $ticket,
        ]);
    }

    public function reply(Request $request, SupportTicket $ticket, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'body'             => 'required|string|max:5000',
            'is_internal_note' => 'boolean',
        ]);

        SupportTicketReply::create([
            'ticket_id'        => $ticket->id,
            'user_id'          => $request->user()->id,
            'body'             => $data['body'],
            'is_internal_note' => $data['is_internal_note'] ?? false,
        ]);

        $update = ['last_reply_at' => now()];
        if (! ($data['is_internal_note'] ?? false) && $ticket->status === 'pending') {
            $update['status'] = 'open';
        }
        $ticket->update($update);

        $audit->record('support.reply', $ticket, "Reply on ticket #{$ticket->id}", [
            'is_internal' => $data['is_internal_note'] ?? false,
        ]);

        return back()->with('success', 'Răspuns trimis.');
    }

    public function updateStatus(Request $request, SupportTicket $ticket, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate(['status' => 'required|in:open,pending,resolved,closed']);
        $old = $ticket->status;
        $ticket->update($data);
        $audit->record('support.status_changed', $ticket, "Status {$old} → {$data['status']}");
        return back()->with('success', 'Status actualizat.');
    }

    public function assign(Request $request, SupportTicket $ticket, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate(['assigned_to_user_id' => 'nullable|exists:users,id']);
        $ticket->update($data);
        $audit->record('support.assign', $ticket, "Assigned to user #{$data['assigned_to_user_id']}");
        return back()->with('success', 'Asignare actualizată.');
    }
}
