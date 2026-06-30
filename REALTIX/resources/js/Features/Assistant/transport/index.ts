// resources/js/Features/Assistant/transport/index.ts
//
// Punctul unic prin care UI-ul obține transportul. Tot UI-ul importă DOAR
// `chatTransport` de aici — nu instanțiază transporturi direct și nu apelează fetch.
//
// Acum: MockTransport. La Faza C (backend gata): `new SseTransport()`.

import type { ChatTransport } from './ChatTransport';
import { MockTransport } from './MockTransport';

export type { ChatTransport, SendOptions } from './ChatTransport';
export { MockTransport } from './MockTransport';
export { SseTransport } from './SseTransport';
export type { SseTransportOptions } from './SseTransport';

export const chatTransport: ChatTransport = new MockTransport();
