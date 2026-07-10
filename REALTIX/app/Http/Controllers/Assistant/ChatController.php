<?php

declare(strict_types=1);

namespace App\Http\Controllers\Assistant;

use App\Http\Controllers\Controller;
use App\Services\Assistant\ChatEvent;
use App\Services\Assistant\ChatService;
use App\Services\Assistant\ConversationManager;
use App\Services\Assistant\QuotaOwner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * POST /assistant/chat/{conversation?} — the assistant's SSE endpoint.
 *
 * Validates the message, applies the per-owner rate limit, resolves the
 * conversation and streams ChatService's ChatEvents as `data: {json}\n\n`
 * frames. Rate-limit hits are delivered as a normal SSE `error` event with
 * code `rate_limited` (HTTP 200) so the UI can show the sign-up gate — never
 * as a raw 429. CSRF runs through the standard web stack (X-XSRF-TOKEN).
 */
class ChatController extends Controller
{
    public function stream(
        Request $request,
        ChatService $chat,
        ConversationManager $conversations,
        ?string $conversation = null,
    ): StreamedResponse {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:1000'],
            'language' => ['required', 'in:ro,ru'],
        ]);

        $ownerToken = (string) $request->attributes->get('assistant_owner_token');
        $userId = $request->attributes->get('assistant_user_id');
        $language = $validated['language'];

        // Rate limit pe owner_token + IP; răspunsul e un eveniment SSE, nu un 429.
        $key = 'assistant-chat:' . sha1($ownerToken . '|' . $request->ip());
        if (RateLimiter::tooManyAttempts($key, (int) config('assistant.anon_msg_limit', 20))) {
            return $this->sse(function () use ($language): void {
                $this->write(ChatEvent::error('rate_limited', $language === 'ru'
                    ? 'Достигнут лимит сообщений для этой сессии. Создайте аккаунт, чтобы продолжить.'
                    : 'Ai atins limita de mesaje pentru această sesiune. Creează-ți un cont pentru a continua.'));
            });
        }
        RateLimiter::hit($key, (int) config('assistant.anon_msg_window', 86400));

        $conv = $conversations->findOrCreate($ownerToken, $userId, $language, $conversation);

        // Identitatea de cotă: owner_token/user_id + ip_hash (hash cu sarea app-ului
        // ca IP-ul brut să nu fie stocat). ip_hash face anti-abuzul (TZ §4.10).
        $owner = new QuotaOwner(
            ownerToken: $ownerToken,
            userId: $userId !== null ? (int) $userId : null,
            ipHash: hash('sha256', ($request->ip() ?? '') . '|' . (string) config('app.key')),
        );

        return $this->sse(function () use ($chat, $conv, $validated, $owner): void {
            foreach ($chat->stream($conv, $validated['text'], $owner) as $event) {
                $this->write($event);
            }
        });
    }

    private function sse(callable $body): StreamedResponse
    {
        return response()->stream($body, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    private function write(ChatEvent $event): void
    {
        echo 'data: ' . json_encode($event->toArray(), JSON_UNESCAPED_UNICODE) . "\n\n";

        // In tests streamedContent() captures via output buffering — flushing
        // there would drain the capture buffer into the console.
        if (! app()->runningUnitTests()) {
            if (ob_get_level() > 0) {
                @ob_flush();
            }
            @flush();
        }
    }
}
