<?php

declare(strict_types=1);

namespace App\Services\Assistant;

use App\Application\Assistant\Tools\ToolDispatcher;
use App\Application\Assistant\Tools\ToolRegistry;
use App\Domain\Assistant\Contracts\LlmClient;
use App\Models\Conversation;
use Generator;

/**
 * Drives one assistant turn as a stream of ChatEvents.
 *
 * Two hops:
 *   HOP 1 (model_intent + tools) decides whether a tool is needed. If the model
 *   emits tool_use, we run it via ToolDispatcher, stream the resulting cards,
 *   and append the tool_use + tool_result to the history.
 *   HOP 2 (model_answer) writes the user-facing answer; its text is streamed as
 *   `token` events. Smalltalk (no tool in hop 1) simply produces tokens in hop 2.
 *
 * Every LlmClient error becomes a clean `error` ChatEvent (rate_limited on 429,
 * else server_error) and stops the stream — never a raw exception to the caller.
 */
final class ChatService
{
    public function __construct(
        private readonly LlmClient $llm,
        private readonly ConversationManager $conversations,
        private readonly ToolDispatcher $dispatcher,
        private readonly QuotaService $quota,
    ) {
    }

    /**
     * @param QuotaOwner|null $quotaOwner when set, search-result listings are
     *   charged to the free-result quota (owner_token/user_id + ip_hash from the
     *   request); null disables quota (used by unit tests without an owner).
     * @return Generator<int,ChatEvent>
     */
    public function stream(Conversation $c, string $userText, ?QuotaOwner $quotaOwner = null): Generator
    {
        $this->conversations->saveUserMessage($c, $userText);

        // Intent hop uses a LEAN prompt (just the tool decision); the answer hop
        // uses the FULL prompt with domain knowledge — keeps the first call cheap.
        $intentSystem = SystemPrompt::intent($c->language);
        $answerSystem = SystemPrompt::build($c->language);
        $tools = ToolRegistry::definitions();
        $model = fn (string $key): string => (string) config("assistant.{$key}");
        $maxTokens = (int) config('assistant.max_tokens', 2048);

        $history = $this->conversations->buildApiHistory($c);
        $tokensIn = 0;
        $tokensOut = 0;

        // ---- HOP 1: intent / tool decision ----
        $toolUses = [];
        foreach ($this->llm->createStream($intentSystem, $history, $tools, $model('model_intent'), $maxTokens) as $ev) {
            switch ($ev['type']) {
                case 'tool_use':
                    $toolUses[] = $ev;
                    break;
                case 'usage':
                    $tokensIn += (int) ($ev['tokensIn'] ?? 0);
                    $tokensOut += (int) ($ev['tokensOut'] ?? 0);
                    break;
                case 'error':
                    yield $this->mapError($ev);

                    return;
                    // text / stop from the intent pass are not surfaced — hop 2 writes the answer.
            }
        }

        // ---- run tools, if any ----
        $snapshotListings = [];
        $snapshotAgencies = [];

        if ($toolUses !== []) {
            $assistantBlocks = array_map(fn (array $t): array => [
                'type' => 'tool_use',
                'id' => $t['id'],
                'name' => $t['name'],
                'input' => $t['input'],
            ], $toolUses);

            $this->conversations->saveAssistantToolUse($c, $assistantBlocks);
            $history[] = ['role' => 'assistant', 'content' => $assistantBlocks];

            $toolResultBlocks = [];
            foreach ($toolUses as $tool) {
                yield ChatEvent::toolRunning($tool['name']);

                $result = $this->dispatcher->run($tool['name'], $tool['input']);

                if ($result->ok) {
                    $forModel = $result->forModel;
                    $cards = array_map(
                        fn (object $card): array => method_exists($card, 'toArray') ? $card->toArray() : (array) $card,
                        $result->cards,
                    );
                    if ($tool['name'] === ToolRegistry::SEARCH_AGENCIES) {
                        $snapshotAgencies = array_merge($snapshotAgencies, $cards);
                        yield ChatEvent::cards(agencies: $cards);
                    } elseif ($quotaOwner !== null && $tool['name'] === ToolRegistry::SEARCH_LISTINGS) {
                        // Only search results consume quota. get_listing_details is a
                        // re-view and never charges (handled by the plain branch below).
                        $q = $this->quota->consume($quotaOwner, $result->cards);
                        if ($q->exceeded) {
                            // Truncate BOTH the cards and what the model sees, so it
                            // cannot enumerate hidden objects. A short notice tells it
                            // to stop at the free limit and point the user to sign-up.
                            $cards = array_slice($cards, 0, $q->keptCount);
                            $forModel = $this->trimForModel($forModel, $q);
                        }
                        $snapshotListings = array_merge($snapshotListings, $cards);
                        yield ChatEvent::cards(listings: $cards);
                        yield ChatEvent::quota($q->used, $q->remaining, $q->limit, $q->exceeded);
                    } else {
                        $snapshotListings = array_merge($snapshotListings, $cards);
                        yield ChatEvent::cards(listings: $cards);
                    }
                    $content = (string) json_encode($forModel, JSON_UNESCAPED_UNICODE);
                    $isError = false;
                } else {
                    $content = (string) $result->error;
                    $isError = true;
                }

                $toolResultBlocks[] = [
                    'type' => 'tool_result',
                    'tool_use_id' => $tool['id'],
                    'content' => $content,
                    'is_error' => $isError,
                ];
            }

            $this->conversations->saveToolResult($c, $toolResultBlocks);
            $history[] = ['role' => 'user', 'content' => $toolResultBlocks];
        }

        // ---- HOP 2: final answer ----
        // No tools here: hop 2 only writes text (a tool_use would be ignored), and
        // dropping the tool schemas keeps this bigger-prompt call cheaper.
        $answer = '';
        foreach ($this->llm->createStream($answerSystem, $history, [], $model('model_answer'), $maxTokens) as $ev) {
            switch ($ev['type']) {
                case 'text':
                    $text = (string) ($ev['text'] ?? '');
                    if ($text !== '') {
                        $answer .= $text;
                        yield ChatEvent::token($text);
                    }
                    break;
                case 'usage':
                    $tokensIn += (int) ($ev['tokensIn'] ?? 0);
                    $tokensOut += (int) ($ev['tokensOut'] ?? 0);
                    break;
                case 'error':
                    yield $this->mapError($ev);

                    return;
                    // a tool_use in hop 2 is ignored: this is a strict two-hop turn.
            }
        }

        // ---- persist final assistant message + housekeeping ----
        $cardsSnapshot = [];
        if ($snapshotListings !== []) {
            $cardsSnapshot['listings'] = $snapshotListings;
        }
        if ($snapshotAgencies !== []) {
            $cardsSnapshot['agencies'] = $snapshotAgencies;
        }

        $this->conversations->saveAssistantAnswer(
            $c,
            $answer,
            $cardsSnapshot === [] ? null : $cardsSnapshot,
            $tokensIn,
            $tokensOut,
            $model('model_answer'),
        );
        $this->conversations->touch($c);
        $this->conversations->enforceLimit($c->owner_token);

        yield ChatEvent::done((string) $c->id);
    }

    /** @param array<string,mixed> $ev */
    private function mapError(array $ev): ChatEvent
    {
        $code = ($ev['status'] ?? null) === 429 ? 'rate_limited' : 'server_error';

        return ChatEvent::error($code, (string) ($ev['message'] ?? 'A apărut o eroare.'));
    }

    /**
     * Trim a search tool_result to what the quota allowed and append a notice so
     * the model does not describe hidden objects. Keeps the same order as the
     * shown cards (results[] and cards[] are built in lockstep).
     *
     * @param array<string,mixed> $forModel
     * @return array<string,mixed>
     */
    private function trimForModel(array $forModel, QuotaConsumeResult $q): array
    {
        if (isset($forModel['results']) && is_array($forModel['results'])) {
            $forModel['results'] = array_slice($forModel['results'], 0, $q->keptCount);
            $forModel['count'] = count($forModel['results']);
        }

        $forModel['quota_notice'] = sprintf(
            'Utilizatorul a atins limita gratuită de %d rezultate. Sunt afișate doar %d. '
            . 'NU enumera alte obiecte; spune-i pe scurt că a atins limita gratuită și poate '
            . 'debloca mai multe rezultate creând cont.',
            $q->limit,
            $q->keptCount,
        );

        return $forModel;
    }
}
