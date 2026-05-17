<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ModerationReport;
use App\Models\Property;
use App\Models\User;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModerationController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->get('status', 'pending');

        $reports = ModerationReport::with(['reporter:id,name,email', 'reviewer:id,name'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        // Resolve subjects (properties / users) for display
        $subjects = [];
        foreach ($reports->items() as $r) {
            $key = "{$r->subject_type}:{$r->subject_id}";
            if (isset($subjects[$key])) continue;
            if ($r->subject_type === Property::class) {
                $p = Property::withoutGlobalScopes()->find($r->subject_id);
                $subjects[$key] = $p ? [
                    'type'  => 'property',
                    'id'    => $p->id,
                    'title' => $p->title,
                    'url'   => "/properties/{$p->id}",
                    'meta'  => "{$p->city} · {$p->type}",
                ] : null;
            } elseif ($r->subject_type === User::class) {
                $u = User::withoutGlobalScopes()->find($r->subject_id);
                $subjects[$key] = $u ? [
                    'type'  => 'user',
                    'id'    => $u->id,
                    'title' => $u->name,
                    'url'   => "/super-admin/users#{$u->id}",
                    'meta'  => $u->email,
                ] : null;
            } else {
                $subjects[$key] = null;
            }
        }

        $reports->getCollection()->transform(function ($r) use ($subjects) {
            $r->subject_data = $subjects["{$r->subject_type}:{$r->subject_id}"] ?? null;
            return $r;
        });

        return Inertia::render('SuperAdmin/Moderation/Index', [
            'reports' => $reports,
            'status'  => $status,
            'counts'  => [
                'pending'   => ModerationReport::where('status', 'pending')->count(),
                'reviewing' => ModerationReport::where('status', 'reviewing')->count(),
                'approved'  => ModerationReport::where('status', 'approved')->count(),
                'rejected'  => ModerationReport::where('status', 'rejected')->count(),
                'spam'      => ModerationReport::where('status', 'spam')->count(),
            ],
        ]);
    }

    public function review(Request $request, ModerationReport $report, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'decision' => 'required|in:approved,rejected,spam',
            'notes'    => 'nullable|string|max:2000',
            'action'   => 'nullable|in:hide_subject,delete_subject,suspend_user',
        ]);

        $report->update([
            'status'              => $data['decision'],
            'reviewed_by_user_id' => $request->user()->id,
            'reviewed_at'         => now(),
            'review_notes'        => $data['notes'] ?? null,
        ]);

        // Apply downstream action against the subject if requested
        if (! empty($data['action'])) {
            $this->applySubjectAction($report, $data['action'], $audit);
        }

        $audit->record('moderation.review', $report, "Decision: {$data['decision']}", [
            'subject_type' => $report->subject_type,
            'subject_id'   => $report->subject_id,
            'action'       => $data['action'] ?? null,
        ]);

        return back()->with('success', 'Raport procesat.');
    }

    private function applySubjectAction(ModerationReport $report, string $action, AuditLogger $audit): void
    {
        if ($report->subject_type === Property::class) {
            $property = Property::withoutGlobalScopes()->find($report->subject_id);
            if (! $property) return;
            if ($action === 'hide_subject') {
                $property->update(['status' => 'inactive']);
                $audit->moderationAction('listing.hidden', $property);
            } elseif ($action === 'delete_subject') {
                $property->delete();
                $audit->moderationAction('listing.deleted', $property);
            }
        } elseif ($report->subject_type === User::class) {
            $user = User::withoutGlobalScopes()->find($report->subject_id);
            if (! $user) return;
            if ($action === 'suspend_user') {
                $user->update(['is_active' => false]);
                $audit->moderationAction('user.suspended', $user);
            }
        }
    }
}
