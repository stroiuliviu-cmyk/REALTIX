<?php

declare(strict_types=1);

namespace App\Http\Controllers\Assistant;

use App\Http\Controllers\Controller;
use App\Services\Assistant\ConversationManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only history API for the assistant, consumed by the SPA via fetch.
 * Everything is scoped to the current owner (owner_token, or user_id when
 * authenticated) — a visitor can never read another owner's conversations.
 */
class ConversationsController extends Controller
{
    /** GET /assistant/api/conversations — list summaries for the owner. */
    public function index(Request $request, ConversationManager $conversations): JsonResponse
    {
        return response()->json([
            'conversations' => $conversations->listForOwner(
                (string) $request->attributes->get('assistant_owner_token'),
                $this->userId($request),
            ),
        ]);
    }

    /** GET /assistant/api/conversations/{conversation} — messages for rehydration. */
    public function show(Request $request, ConversationManager $conversations, string $conversation): JsonResponse
    {
        $conv = $conversations->findForOwner(
            (string) $request->attributes->get('assistant_owner_token'),
            $this->userId($request),
            $conversation,
        );

        if ($conv === null) {
            return response()->json(['message' => 'Conversația nu a fost găsită.'], 404);
        }

        return response()->json([
            'id' => (string) $conv->id,
            'language' => $conv->language,
            'messages' => $conversations->messagesForClient($conv),
        ]);
    }

    private function userId(Request $request): ?int
    {
        $userId = $request->attributes->get('assistant_user_id');

        return $userId !== null ? (int) $userId : null;
    }
}
