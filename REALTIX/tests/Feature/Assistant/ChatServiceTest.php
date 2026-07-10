<?php

declare(strict_types=1);

use App\Application\Assistant\Tools\ToolDispatcher;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Assistant\ChatEvent;
use App\Services\Assistant\ChatService;
use App\Services\Assistant\ConversationManager;
use App\Services\Assistant\QuotaService;
use Tests\Support\CatalogSeed;
use Tests\Support\FakeLlmClient;

/** Build a ChatService around a scripted LlmClient (real manager + dispatcher). */
function chatWith(FakeLlmClient $fake): ChatService
{
    return new ChatService($fake, new ConversationManager(), app(ToolDispatcher::class), new QuotaService());
}

/** Run a turn and return the emitted ChatEvents as wire arrays. */
function runTurn(FakeLlmClient $fake, Conversation $c, string $text): array
{
    return array_map(
        fn (ChatEvent $e): array => $e->toArray(),
        iterator_to_array(chatWith($fake)->stream($c, $text), false),
    );
}

function usage(int $in, int $out): array
{
    return ['type' => 'usage', 'tokensIn' => $in, 'tokensOut' => $out];
}

beforeEach(function () {
    config([
        'assistant.model_intent' => 'claude-haiku-4-5',
        'assistant.model_answer' => 'claude-sonnet-5',
        'assistant.max_tokens' => 1024,
        'assistant.history_token_limit' => 100000, // fără compactare în teste
    ]);
});

it('runs a tool dialog: tool_running → cards → tokens → done, and persists everything', function () {
    $ag = CatalogSeed::agency('chat-tool');
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Apartament A', 'published_at' => now()]);
    CatalogSeed::scraped(['agency_id' => $ag, 'title' => 'Apartament B', 'published_at' => now()]);

    $fake = new FakeLlmClient([
        // HOP 1 (intent): cere unealta
        [
            ['type' => 'tool_use', 'id' => 'toolu_1', 'name' => 'search_listings', 'input' => ['deal_type' => 'sale']],
            usage(100, 5),
            ['type' => 'stop', 'reason' => 'tool_use'],
        ],
        // HOP 2 (answer): text final
        [
            ['type' => 'text', 'text' => 'Am găsit '],
            ['type' => 'text', 'text' => 'câteva opțiuni.'],
            usage(200, 10),
            ['type' => 'stop', 'reason' => 'end_turn'],
        ],
    ]);

    $c = (new ConversationManager())->findOrCreate('owner-tool', null, 'ro');
    $events = runTurn($fake, $c, 'Vreau un apartament de vânzare');

    // 1) ordinea exactă a ChatEvent-urilor
    expect(array_column($events, 'type'))->toBe(['tool_running', 'cards', 'token', 'token', 'done']);
    expect($events[0]['tool'])->toBe('search_listings')
        ->and($events[1]['listings'])->toHaveCount(2)
        ->and($events[2]['text'] . $events[3]['text'])->toBe('Am găsit câteva opțiuni.')
        ->and($events[4]['conversationId'])->toBe((string) $c->id);

    // 2) modelele apelate: intent apoi answer
    expect(array_column($fake->calls, 'model'))->toBe(['claude-haiku-4-5', 'claude-sonnet-5']);

    // 3) mesaje persistate: user, assistant(tool_use), tool(tool_result), assistant(text)
    $messages = Message::where('conversation_id', $c->id)->orderBy('id')->get();
    expect($messages->pluck('role')->all())->toBe(['user', 'assistant', 'tool', 'assistant']);

    expect($messages[1]->content[0]['type'])->toBe('tool_use')
        ->and($messages[1]->content[0]['name'])->toBe('search_listings')
        ->and($messages[2]->content[0]['type'])->toBe('tool_result')
        ->and($messages[2]->content[0]['tool_use_id'])->toBe('toolu_1')
        ->and($messages[2]->content[0]['is_error'])->toBeFalse();

    // 4) mesajul assistant final: text + carduri + tokeni însumați + model
    $final = $messages[3];
    expect($final->content[0]['text'])->toBe('Am găsit câteva opțiuni.')
        ->and($final->cards['listings'])->toHaveCount(2)
        ->and($final->tokens_in)->toBe(300)   // 100 + 200
        ->and($final->tokens_out)->toBe(15)   // 5 + 10
        ->and($final->model)->toBe('claude-sonnet-5');

    // 5) niciun câmp privat în cardurile emise / salvate
    $json = json_encode([$events, $final->cards]);
    expect($json)->not->toContain('"phone"')->and($json)->not->toContain('"raw_data"');
});

it('runs smalltalk (no tool): only tokens then done', function () {
    $fake = new FakeLlmClient([
        [usage(20, 1), ['type' => 'stop', 'reason' => 'end_turn']],                 // hop1: fără tool
        [['type' => 'text', 'text' => 'Salut! '], ['type' => 'text', 'text' => 'Cu ce te ajut?'], usage(30, 8), ['type' => 'stop', 'reason' => 'end_turn']],
    ]);

    $c = (new ConversationManager())->findOrCreate('owner-chat', null, 'ro');
    $events = runTurn($fake, $c, 'Bună');

    expect(array_column($events, 'type'))->toBe(['token', 'token', 'done']);

    $messages = Message::where('conversation_id', $c->id)->orderBy('id')->get();
    expect($messages->pluck('role')->all())->toBe(['user', 'assistant'])
        ->and($messages[1]->content[0]['text'])->toBe('Salut! Cu ce te ajut?')
        ->and($messages[1]->cards)->toBeNull()
        ->and($messages[1]->tokens_in)->toBe(50)   // 20 + 30
        ->and($messages[1]->tokens_out)->toBe(9);  // 1 + 8
});

it('enforces max 10 conversations per owner (11th drops the oldest)', function () {
    $manager = new ConversationManager();

    $oldest = null;
    for ($i = 0; $i < 11; $i++) {
        $conv = $manager->findOrCreate('owner-cap', null, 'ro');
        $conv->last_activity_at = now()->addSeconds($i); // ordine deterministă
        $conv->save();
        if ($i === 0) {
            $oldest = $conv->id;
        }
    }

    expect(Conversation::where('owner_token', 'owner-cap')->count())->toBe(11);

    $manager->enforceLimit('owner-cap');

    expect(Conversation::where('owner_token', 'owner-cap')->count())->toBe(10)
        ->and(Conversation::whereKey($oldest)->exists())->toBeFalse();
});

it('maps a 429 LlmClient error to a rate_limited ChatEvent and stops cleanly', function () {
    $fake = new FakeLlmClient([
        [['type' => 'error', 'status' => 429, 'message' => 'Too many requests']],
    ]);

    $c = (new ConversationManager())->findOrCreate('owner-429', null, 'ro');
    $events = runTurn($fake, $c, 'Caut ceva');

    expect($events)->toHaveCount(1)
        ->and($events[0]['type'])->toBe('error')
        ->and($events[0]['code'])->toBe('rate_limited')
        ->and($events[0]['message'])->toBe('Too many requests');

    // doar mesajul user a fost salvat; niciun assistant final
    expect(Message::where('conversation_id', $c->id)->pluck('role')->all())->toBe(['user']);
});

it('maps a non-429 LlmClient error to server_error', function () {
    $fake = new FakeLlmClient([
        [['type' => 'error', 'status' => 500, 'message' => 'Internal error']],
    ]);

    $c = (new ConversationManager())->findOrCreate('owner-500', null, 'ru');
    $events = runTurn($fake, $c, 'ищу квартиру');

    expect($events)->toHaveCount(1)
        ->and($events[0]['code'])->toBe('server_error');
});

it('rebuilds the API history from jsonb, tool_use/tool_result included', function () {
    $c = (new ConversationManager())->findOrCreate('owner-hist', null, 'ro');

    Message::create(['conversation_id' => $c->id, 'role' => 'user', 'content' => [['type' => 'text', 'text' => 'caut apartament în chirie']], 'created_at' => now()]);
    Message::create(['conversation_id' => $c->id, 'role' => 'assistant', 'content' => [['type' => 'tool_use', 'id' => 'toolu_9', 'name' => 'search_listings', 'input' => ['deal_type' => 'rent']]], 'created_at' => now()]);
    Message::create(['conversation_id' => $c->id, 'role' => 'tool', 'content' => [['type' => 'tool_result', 'tool_use_id' => 'toolu_9', 'content' => '{"count":3}', 'is_error' => false]], 'created_at' => now()]);
    Message::create(['conversation_id' => $c->id, 'role' => 'assistant', 'content' => [['type' => 'text', 'text' => 'Am găsit 3 anunțuri.']], 'created_at' => now()]);

    $api = (new ConversationManager())->buildApiHistory($c->fresh());

    expect($api)->toHaveCount(4);
    // rolurile: user, assistant, tool→user, assistant
    expect(array_column($api, 'role'))->toBe(['user', 'assistant', 'user', 'assistant']);
    expect($api[1]['content'][0]['type'])->toBe('tool_use')
        ->and($api[1]['content'][0]['name'])->toBe('search_listings')
        ->and($api[2]['content'][0]['type'])->toBe('tool_result')   // rolul 'tool' → mesaj 'user'
        ->and($api[2]['content'][0]['tool_use_id'])->toBe('toolu_9')
        ->and($api[3]['content'][0]['text'])->toBe('Am găsit 3 anunțuri.');
});
