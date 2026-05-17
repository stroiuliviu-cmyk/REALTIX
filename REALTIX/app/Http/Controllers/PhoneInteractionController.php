<?php

namespace App\Http\Controllers;

use App\Models\PhoneInteraction;
use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PhoneInteractionController extends Controller
{
    private const SUBJECT_MAP = [
        'property'        => Property::class,
        'scraped_listing' => ScrapedListing::class,
    ];

    public function show(Request $request, string $subjectType, int $subjectId): JsonResponse
    {
        $subject = $this->resolveSubject($subjectType, $subjectId);
        $this->authorizeSubject($request, $subject);

        return response()->json([
            'phone'   => $this->phoneFor($subject),
            'history' => $this->historyFor($subject),
            'owner'   => $this->ownerFor($subject),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_type' => ['required', Rule::in(array_keys(self::SUBJECT_MAP))],
            'subject_id'   => ['required', 'integer'],
            'outcome'      => ['required', Rule::in(PhoneInteraction::OUTCOMES)],
            'note'         => ['nullable', 'string', 'max:2000'],
        ]);

        $subject = $this->resolveSubject($data['subject_type'], $data['subject_id']);
        $this->authorizeSubject($request, $subject);

        $interaction = PhoneInteraction::record(
            $subject,
            $data['outcome'],
            $data['note'] ?? null,
            $this->phoneFor($subject),
        );
        $interaction->load('user:id,name');

        return response()->json([
            'interaction' => $interaction,
            'history'     => $this->historyFor($subject),
        ]);
    }

    public function lastBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_type' => ['required', Rule::in(array_keys(self::SUBJECT_MAP))],
            'ids'          => ['required', 'array', 'max:200'],
            'ids.*'        => ['integer'],
        ]);

        $morphType = self::SUBJECT_MAP[$data['subject_type']];

        $rows = PhoneInteraction::query()
            ->where('subject_type', $morphType)
            ->whereIn('subject_id', $data['ids'])
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get();

        $latestPerSubject = [];
        foreach ($rows as $row) {
            $key = $row->subject_id;
            if (!isset($latestPerSubject[$key])) {
                $latestPerSubject[$key] = [
                    'at'         => $row->created_at?->toIso8601String(),
                    'agent_name' => $row->user?->name,
                    'outcome'    => $row->outcome,
                ];
            }
        }

        return response()->json($latestPerSubject);
    }

    private function resolveSubject(string $subjectType, int $subjectId)
    {
        $class = self::SUBJECT_MAP[$subjectType] ?? abort(404, 'Unknown subject type');

        return $class::query()->findOrFail($subjectId);
    }

    private function authorizeSubject(Request $request, $subject): void
    {
        $userAgencyId = $request->user()?->agency_id;

        if ($subject instanceof Property) {
            abort_unless(
                $subject->agency_id === $userAgencyId,
                403,
                'Property not in your agency.',
            );
            return;
        }

        // ScrapedListing is platform-wide public data (see CLAUDE.md: scraped
        // listings have no agency scope). Any authenticated user can view it on
        // /web-offers and therefore must be able to read/log interactions.
        // The PhoneInteraction row itself is still scoped by BelongsToAgency,
        // so each agency only sees its own history.
    }

    private function phoneFor($subject): ?string
    {
        if ($subject instanceof ScrapedListing) {
            return $subject->phone;
        }
        if ($subject instanceof Property) {
            // Prefer the linked owner contact's phone; fall back to the phone
            // captured at import time (property.meta.phone — set by
            // WebOffersController@import from the scraped listing).
            $owner = $subject->owners()->first();
            if ($owner?->phone) return $owner->phone;
            return $subject->meta['phone'] ?? null;
        }
        return null;
    }

    private function ownerFor($subject): ?array
    {
        if ($subject instanceof Property) {
            $owner = $subject->owners()->first();
            if (!$owner) return null;
            return [
                'id'         => $owner->id,
                'first_name' => $owner->first_name,
                'last_name'  => $owner->last_name,
                'phone'      => $owner->phone,
                'notes'      => $owner->interactions()
                    ->where('type', 'note')
                    ->latest()
                    ->limit(10)
                    ->with('user:id,name')
                    ->get(['id', 'contact_id', 'user_id', 'type', 'body', 'created_at']),
            ];
        }
        return null;
    }

    private function historyFor($subject): array
    {
        return $subject->phoneInteractions()
            ->with('user:id,name')
            ->limit(20)
            ->get(['id', 'subject_type', 'subject_id', 'user_id', 'outcome', 'note', 'created_at'])
            ->toArray();
    }
}
