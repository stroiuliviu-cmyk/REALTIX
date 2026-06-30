// resources/js/Features/Assistant/transport/SseTransport.ts
//
// STUB — implementarea reală (Faza C) va citi un stream `text/event-stream`
// de la backend și va mapa fiecare frame într-un ChatEvent
// (token | tool_running | cards | done | error).
//
// Are aceeași interfață ca restul transporturilor, ca să poată fi injectat în
// transport/index.ts fără a atinge UI-ul. Deocamdată nu face nimic.

import type { ChatTransport, SendOptions } from './ChatTransport';

export interface SseTransportOptions {
  /** endpoint-ul backend-ului care va emite SSE */
  endpoint?: string;
  /** header-e extra (ex. CSRF), dacă va fi nevoie */
  headers?: Record<string, string>;
}

export class SseTransport implements ChatTransport {
  constructor(private readonly options: SseTransportOptions = {}) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_options: SendOptions): Promise<void> {
    // TODO(Faza C): POST către this.options.endpoint, citește response.body ca
    // stream SSE, parsează frame-urile `data:` în ChatEvent și apelează
    // options.onEvent(event); respectă options.signal pentru anulare.
    void this.options;
    throw new Error('SseTransport nu este încă implementat (vezi TODO).');
  }
}
