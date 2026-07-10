<?php

declare(strict_types=1);

namespace App\Services\Assistant;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Owns conversation + message persistence for the assistant: lookup/creation,
 * the "max 10 per owner" cap, message writes, and lossless reconstruction of
 * the Anthropic Messages-API history from the `messages.content` jsonb column.
 */
final class ConversationManager
{
    private const MAX_PER_OWNER = 10;

    /**
     * Find an existing conversation for this owner (by id) or create a new one.
     * The optional $conversationId keeps the method a real find-or-create; when
     * omitted (or not owned by $ownerToken), a fresh conversation is created.
     *
     * @param 'ro'|'ru' $language
     */
    public function findOrCreate(
        string $ownerToken,
        ?int $userId,
        string $language,
        ?string $conversationId = null,
    ): Conversation {
        if ($conversationId !== null) {
            // Scope the continuation the same way the history list does: by
            // user_id when authenticated, else by owner_token. This lets an
            // authenticated user resume a conversation they opened from history
            // even if the anonymous owner_token has since changed.
            $existing = $this->ownerScope(Conversation::query(), $ownerToken, $userId)
                ->whereKey($conversationId)
                ->first();
            if ($existing !== null) {
                return $existing;
            }
        }

        return Conversation::create([
            'owner_token' => $ownerToken,
            'user_id' => $userId,
            'language' => $language,
            'last_activity_at' => Carbon::now(),
        ]);
    }

    /**
     * Keep at most MAX_PER_OWNER conversations for an owner, deleting the oldest
     * by last_activity_at. Cascade removes their messages.
     *
     * (Hard delete rather than archive: the schema has no archived_at column;
     * these are throwaway anonymous chats. Easy to switch to soft-delete later.)
     */
    public function enforceLimit(string $ownerToken): int
    {
        $ids = Conversation::where('owner_token', $ownerToken)
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->pluck('id');

        $stale = $ids->slice(self::MAX_PER_OWNER);
        if ($stale->isEmpty()) {
            return 0;
        }

        return Conversation::whereIn('id', $stale->all())->delete();
    }

    // ---- message writes ----

    public function saveUserMessage(Conversation $c, string $text): Message
    {
        // Auto-title from the first user message (for the history list).
        if ($c->title === null || $c->title === '') {
            $c->title = Str::limit(trim($text), 60);
            $c->save();
        }

        return $this->insert($c, 'user', [
            ['type' => 'text', 'text' => $text],
        ]);
    }

    // ---- history (owner-scoped) ----

    /**
     * Conversation summaries for an owner — authenticated → by user_id, else by
     * owner_token — newest first. A visitor never sees another owner's chats.
     *
     * @return list<array{id:string,title:?string,language:string,last_activity_at:?string,message_count:int}>
     */
    public function listForOwner(string $ownerToken, ?int $userId): array
    {
        return $this->ownerScope(Conversation::query(), $ownerToken, $userId)
            ->withCount('messages')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Conversation $c): array => [
                'id' => (string) $c->id,
                'title' => $c->title,
                'language' => $c->language,
                'last_activity_at' => optional($c->last_activity_at)->toIso8601String(),
                'message_count' => (int) $c->messages_count,
            ])
            ->all();
    }

    /** Find a conversation by id scoped to the owner (null if not theirs). */
    public function findForOwner(string $ownerToken, ?int $userId, string $conversationId): ?Conversation
    {
        return $this->ownerScope(Conversation::query(), $ownerToken, $userId)
            ->whereKey($conversationId)
            ->first();
    }

    /**
     * UI-facing message list for rehydrating a chat: user texts + assistant
     * answers with their card snapshot. Internal tool_use / tool_result rows are
     * omitted (they are transport detail, not shown in the chat).
     *
     * @return list<array<string,mixed>>
     */
    public function messagesForClient(Conversation $c): array
    {
        $out = [];
        foreach ($c->messages()->get() as $m) {
            $text = '';
            foreach ((is_array($m->content) ? $m->content : []) as $block) {
                if (is_array($block) && ($block['type'] ?? '') === 'text') {
                    $text .= (string) ($block['text'] ?? '');
                }
            }

            if ($m->role === 'user') {
                $out[] = ['role' => 'user', 'text' => $text];
            } elseif ($m->role === 'assistant' && $text !== '') {
                $entry = ['role' => 'assistant', 'text' => $text];
                $cards = is_array($m->cards) ? $m->cards : [];
                if (! empty($cards['listings'])) {
                    $entry['listings'] = $cards['listings'];
                }
                if (! empty($cards['agencies'])) {
                    $entry['agencies'] = $cards['agencies'];
                }
                $out[] = $entry;
            }
        }

        return $out;
    }

    /** @param Builder<Conversation> $query @return Builder<Conversation> */
    private function ownerScope(Builder $query, string $ownerToken, ?int $userId): Builder
    {
        return $userId !== null
            ? $query->where('user_id', $userId)
            : $query->where('owner_token', $ownerToken);
    }

    /**
     * Persist the assistant turn that requested tools.
     *
     * @param list<array<string,mixed>> $toolUseBlocks {type:'tool_use', id, name, input}
     */
    public function saveAssistantToolUse(Conversation $c, array $toolUseBlocks): Message
    {
        return $this->insert($c, 'assistant', $toolUseBlocks);
    }

    /**
     * Persist the tool results (one row carrying all tool_result blocks — the
     * Messages API requires them together in the following user turn).
     *
     * @param list<array<string,mixed>> $toolResultBlocks {type:'tool_result', tool_use_id, content, is_error?}
     */
    public function saveToolResult(Conversation $c, array $toolResultBlocks): Message
    {
        return $this->insert($c, 'tool', $toolResultBlocks);
    }

    /**
     * Persist the final assistant answer with its card snapshot + token usage.
     *
     * @param array<string,mixed>|null $cards
     */
    public function saveAssistantAnswer(
        Conversation $c,
        string $text,
        ?array $cards,
        int $tokensIn,
        int $tokensOut,
        string $model,
    ): Message {
        return $this->insert(
            $c,
            'assistant',
            [['type' => 'text', 'text' => $text]],
            $cards,
            $tokensIn,
            $tokensOut,
            $model,
        );
    }

    public function touch(Conversation $c): void
    {
        $c->last_activity_at = Carbon::now();
        $c->save();
    }

    /**
     * Rebuild the Messages-API `messages` array from stored content blocks.
     * DB role 'tool' maps to an API 'user' message (tool_result blocks live in
     * the user turn). Ordered by id (insertion order). Applies token-budget
     * compaction when the reconstructed history grows too large.
     *
     * @return list<array{role:string,content:array<int,mixed>}>
     */
    public function buildApiHistory(Conversation $c): array
    {
        $api = $c->messages()->get()->map(function (Message $m): array {
            return [
                'role' => $m->role === 'tool' ? 'user' : $m->role,
                'content' => is_array($m->content) ? $m->content : [],
            ];
        })->all();

        return $this->compact($api, $c->language);
    }

    /**
     * Token-budget compaction. Estimate ~4 chars/token; when over the limit,
     * first blank out old tool_result payloads, then drop the oldest turns
     * while always keeping the most recent ones.
     *
     * @param list<array{role:string,content:array<int,mixed>}> $api
     * @param 'ro'|'ru' $language
     * @return list<array{role:string,content:array<int,mixed>}>
     */
    private function compact(array $api, string $language): array
    {
        $limit = (int) config('assistant.history_token_limit', 12000);
        if ($this->estimateTokens($api) <= $limit) {
            return $api;
        }

        $omitted = $language === 'ru' ? '(результаты опущены)' : '(rezultate omise)';

        // 1) Redact tool_result payloads everywhere except the last 4 messages.
        $keepFrom = max(0, count($api) - 4);
        foreach ($api as $i => &$message) {
            if ($i >= $keepFrom) {
                continue;
            }
            foreach ($message['content'] as &$block) {
                if (is_array($block) && ($block['type'] ?? '') === 'tool_result') {
                    $block['content'] = $omitted;
                }
            }
            unset($block);
        }
        unset($message);

        // 2) Still over budget → drop oldest turns, keeping at least the last 6.
        while ($this->estimateTokens($api) > $limit && count($api) > 6) {
            array_shift($api);
        }

        return array_values($api);
    }

    /** @param list<array<string,mixed>> $api */
    private function estimateTokens(array $api): int
    {
        return (int) (strlen((string) json_encode($api)) / 4);
    }

    /**
     * @param list<array<string,mixed>> $content
     * @param array<string,mixed>|null $cards
     */
    private function insert(
        Conversation $c,
        string $role,
        array $content,
        ?array $cards = null,
        int $tokensIn = 0,
        int $tokensOut = 0,
        ?string $model = null,
    ): Message {
        return Message::create([
            'conversation_id' => $c->id,
            'role' => $role,
            'content' => $content,
            'cards' => $cards,
            'tokens_in' => $tokensIn,
            'tokens_out' => $tokensOut,
            'model' => $model,
            'created_at' => Carbon::now(),
        ]);
    }
}
