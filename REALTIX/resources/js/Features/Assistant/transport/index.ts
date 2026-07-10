// resources/js/Features/Assistant/transport/index.ts
//
// Punctul unic prin care UI-ul obține transportul. Tot UI-ul importă DOAR
// `chatTransport` de aici — nu instanțiază transporturi direct și nu apelează fetch.
//
// Implicit: MockTransport (dezvoltare fără backend/API). Setează
// VITE_ASSISTANT_MOCK=false în .env pentru transportul SSE real.

import type { ChatTransport } from './ChatTransport';
import { MockTransport } from './MockTransport';
import { SseTransport } from './SseTransport';

export type { ChatTransport, SendOptions } from './ChatTransport';
export { MockTransport } from './MockTransport';
export { SseTransport } from './SseTransport';
export type { SseTransportOptions } from './SseTransport';

const useMock = (import.meta.env.VITE_ASSISTANT_MOCK ?? 'true') !== 'false';

export const chatTransport: ChatTransport = useMock ? new MockTransport() : new SseTransport();
