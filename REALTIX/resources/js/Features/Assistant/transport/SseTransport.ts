// resources/js/Features/Assistant/transport/SseTransport.ts
//
// Transportul real: UN singur POST fetch către /assistant/chat/{conversationId?}
// cu {text, language} + header X-XSRF-TOKEN (CSRF standard Laravel). Răspunsul
// este `text/event-stream`; citim ReadableStream-ul, tăiem pe „\n\n", parsăm
// liniile „data:" în ChatEvent și le pasăm la onEvent. Suportă AbortSignal
// (anularea încheie liniștit stream-ul, fără eveniment de eroare).

import type { ChatEvent } from '../types';
import type { ChatTransport, SendOptions } from './ChatTransport';

export interface SseTransportOptions {
  /** endpoint-ul backend-ului care emite SSE (implicit /assistant/chat) */
  endpoint?: string;
  /** header-e extra, dacă va fi nevoie */
  headers?: Record<string, string>;
}

/** Citește token-ul CSRF din cookie-ul XSRF-TOKEN (setat de Laravel). */
function readXsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Parsează un frame SSE: fiecare linie „data: {json}" devine un ChatEvent. */
function emitFrame(frame: string, onEvent: (event: ChatEvent) => void): void {
  for (const line of frame.split('\n')) {
    if (!line.startsWith('data:')) continue;
    try {
      onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
    } catch {
      // linie coruptă / parțială — ignorată; frame-urile valide continuă
    }
  }
}

export class SseTransport implements ChatTransport {
  constructor(private readonly options: SseTransportOptions = {}) {}

  async send({ conversationId, text, language, onEvent, signal }: SendOptions): Promise<void> {
    const base = this.options.endpoint ?? '/assistant/chat';
    const url = conversationId ? `${base}/${encodeURIComponent(conversationId)}` : base;
    const xsrf = readXsrfToken();

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'X-Requested-With': 'XMLHttpRequest',
          ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
          ...this.options.headers,
        },
        body: JSON.stringify({ text, language }),
        signal,
      });

      if (!response.ok || !response.body) {
        onEvent({ type: 'error', code: 'server_error', message: `HTTP ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // frame-urile SSE sunt separate de linie goală („\n\n")
        let separator: number;
        while ((separator = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          emitFrame(frame, onEvent);
        }
      }

      // frame rezidual fără terminator (stream închis brusc)
      if (buffer.trim() !== '') {
        emitFrame(buffer, onEvent);
      }
    } catch (error) {
      // anulare cerută de UI → încheiere liniștită, fără eveniment de eroare
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      onEvent({
        type: 'error',
        code: 'server_error',
        message: error instanceof Error ? error.message : 'Conexiunea a eșuat.',
      });
    }
  }
}
