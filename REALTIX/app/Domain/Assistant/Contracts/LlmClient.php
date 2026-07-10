<?php

declare(strict_types=1);

namespace App\Domain\Assistant\Contracts;

/**
 * Streaming LLM seam. ChatService (Application) depends on THIS interface;
 * the concrete Anthropic implementation lives in App\Infrastructure\Llm.
 *
 * The stream yields NORMALIZED events (plain arrays), provider-agnostic:
 *
 *   ['type' => 'text',     'text' => string]                          // text delta
 *   ['type' => 'tool_use', 'id' => string, 'name' => string,
 *                          'input' => array]                          // input = fully-assembled JSON object
 *   ['type' => 'usage',    'tokensIn' => int, 'tokensOut' => int]
 *   ['type' => 'stop',     'reason' => string]                        // end_turn | tool_use | max_tokens | ...
 *   ['type' => 'error',    'message' => string, 'status' => ?int]     // failures are events, never raw exceptions; status = HTTP code (429, 5xx) or null
 */
interface LlmClient
{
    /**
     * Open a streaming completion and yield normalized events.
     *
     * @param string $system system prompt ('' = none)
     * @param list<array<string,mixed>> $messages Anthropic-style messages (role + content)
     * @param list<array<string,mixed>> $tools tool definitions (ToolRegistry::definitions() shape)
     * @param string $model model id (config/assistant.php: model_intent|model_answer)
     * @return iterable<array<string,mixed>>
     */
    public function createStream(
        string $system,
        array $messages,
        array $tools,
        string $model,
        int $maxTokens,
    ): iterable;
}
