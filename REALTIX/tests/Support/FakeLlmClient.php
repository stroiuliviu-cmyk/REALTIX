<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Assistant\Contracts\LlmClient;

/**
 * Scripted LlmClient for tests — no HTTP. Each createStream() call pops the
 * next script (a list of normalized event arrays) and yields its events, so a
 * two-hop turn is driven by two scripts. Records each call's model + messages.
 */
final class FakeLlmClient implements LlmClient
{
    /** @var list<array{model:string,messages:array,tools:array}> */
    public array $calls = [];

    /** @param list<list<array<string,mixed>>> $scripts one script per createStream() call */
    public function __construct(private array $scripts)
    {
    }

    public function createStream(
        string $system,
        array $messages,
        array $tools,
        string $model,
        int $maxTokens,
    ): iterable {
        $this->calls[] = ['model' => $model, 'messages' => $messages, 'tools' => $tools];

        foreach (array_shift($this->scripts) ?? [] as $event) {
            yield $event;
        }
    }
}
