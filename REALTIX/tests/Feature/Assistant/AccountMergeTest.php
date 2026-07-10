<?php

declare(strict_types=1);

use App\Domain\Assistant\Contracts\LlmClient;
use App\Http\Middleware\AssistantSession;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Assistant\FavoritesService;
use App\Services\Assistant\QuotaOwner;
use App\Services\Assistant\QuotaService;
use Illuminate\Support\Facades\DB;
use Tests\Support\CatalogSeed;
use Tests\Support\FakeLlmClient;

/** Seed anonymous assistant data under an owner_token: favorites + quota + a conversation. */
function seedAnonymous(string $ownerToken): void
{
    DB::table('favorites')->insert([
        ['owner_token' => $ownerToken, 'user_id' => null, 'listing_id' => '101', 'source' => 'external', 'created_at' => now(), 'updated_at' => now()],
        ['owner_token' => $ownerToken, 'user_id' => null, 'listing_id' => '5', 'source' => 'internal', 'created_at' => now(), 'updated_at' => now()],
    ]);

    (new QuotaService())->consume(new QuotaOwner($ownerToken, null, 'ip-seed'), [
        ['id' => '1', 'source' => 'external'],
        ['id' => '2', 'source' => 'external'],
        ['id' => '3', 'source' => 'external'],
        ['id' => '4', 'source' => 'external'],
        ['id' => '5', 'source' => 'external'],
    ]);

    Conversation::create(['owner_token' => $ownerToken, 'language' => 'ro', 'last_activity_at' => now()]);
}

it('transfers anonymous favorites, quota and conversations to the account on login', function () {
    $user = User::factory()->create(['is_active' => true]);
    seedAnonymous('owner-merge');

    $response = $this->withCookie(AssistantSession::COOKIE, 'owner-merge')
        ->post('/login', ['email' => $user->email, 'password' => 'password']);

    $response->assertRedirect(); // login reușit → redirect (nu ne interesează ținta)

    // favorite: atașate la cont, niciunul rămas anonim
    expect(DB::table('favorites')->where('user_id', $user->id)->count())->toBe(2)
        ->and(DB::table('favorites')->whereNull('user_id')->where('owner_token', 'owner-merge')->count())->toBe(0);

    // cotă: cele 5 obiecte consumate anonim se numără acum pe user_id
    expect((new QuotaService())->status(new QuotaOwner('other', $user->id, 'other'))['used'])->toBe(5);

    // dialoguri: legate de cont
    expect(Conversation::where('owner_token', 'owner-merge')->first()->user_id)->toBe($user->id);
});

it('merge is idempotent — a second run does not duplicate', function () {
    $user = User::factory()->create();
    seedAnonymous('owner-idem');

    $ipHash = 'irrelevant';
    $run = function () use ($user, $ipHash): void {
        (new FavoritesService())->mergeIntoAccount('owner-idem', $user->id);
        (new QuotaService())->mergeIntoAccount('owner-idem', $ipHash, $user->id);
        Conversation::where('owner_token', 'owner-idem')->whereNull('user_id')->update(['user_id' => $user->id]);
    };

    $run();
    $run(); // a doua rulare

    expect(DB::table('favorites')->where('user_id', $user->id)->count())->toBe(2)
        ->and((new QuotaService())->status(new QuotaOwner('x', $user->id, 'y'))['used'])->toBe(5)
        ->and(Conversation::where('user_id', $user->id)->count())->toBe(1);
});

it('counts quota on user_id (not owner_token/ip) after login', function () {
    $ag = CatalogSeed::agency('merge-search');
    for ($i = 0; $i < 3; $i++) {
        CatalogSeed::scraped(['agency_id' => $ag, 'title' => "Anunț $i", 'published_at' => now()]);
    }

    $user = User::factory()->create(['is_active' => true]);

    app()->instance(LlmClient::class, new FakeLlmClient([
        [['type' => 'tool_use', 'id' => 'toolu_m', 'name' => 'search_listings', 'input' => ['deal_type' => 'sale']], ['type' => 'stop', 'reason' => 'tool_use']],
        [['type' => 'text', 'text' => 'Gata.'], ['type' => 'stop', 'reason' => 'end_turn']],
    ]));

    // autentificat → middleware expune user_id → ChatController îl pune în QuotaOwner
    $response = $this->actingAs($user)
        ->withCookie(AssistantSession::COOKIE, 'owner-auth')
        ->post('/assistant/chat', ['text' => 'apartament', 'language' => 'ro']);
    $response->assertOk();
    $response->streamedContent(); // consumă stream-ul → rulează ChatService (consume-ul de cotă)

    // rândurile de cotă poartă user_id (nu doar owner_token)
    expect(DB::table('assistant_quota_seen')->where('user_id', $user->id)->count())->toBe(3)
        ->and((new QuotaService())->status(new QuotaOwner('alt-cookie', $user->id, 'alt-ip'))['used'])->toBe(3);
});

it('routes the assistant auth links through the real auth with returnTo=/assistant', function () {
    $this->get('/assistant/login')
        ->assertRedirect(route('login'));
    expect(session('url.intended'))->toBe(url('/assistant'));

    $this->get('/assistant/register')
        ->assertRedirect(route('register'));
    expect(session('url.intended'))->toBe(url('/assistant'));
});
