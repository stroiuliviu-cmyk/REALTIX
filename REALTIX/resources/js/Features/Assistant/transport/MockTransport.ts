// resources/js/Features/Assistant/transport/MockTransport.ts
//
// Implementare de dezvoltare a ChatTransport: rutează textul prin scenarii
// (../mock/scenarios) și emite evenimentele cu mici întârzieri, ca un stream real.

import type { ChatTransport, SendOptions } from './ChatTransport';
import type { ChatEvent } from '../types';
import { pickScenario, scenarioToEvents } from '../mock/scenarios';

const STEP_DELAY = 220; // pauză „tool runs" / „searching"
const CARD_DELAY = 140; // după ce apar cardurile
const TOKEN_DELAY = 18; // între token-e

const isAbort = (e: unknown): boolean =>
  e instanceof DOMException ? e.name === 'AbortError' : (e as { name?: string })?.name === 'AbortError';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/** Împarte textul în „token-e" (cuvânt + spațiu) și le emite pe rând. */
async function streamText(
  text: string,
  onEvent: (e: ChatEvent) => void,
  signal: AbortSignal | undefined,
): Promise<void> {
  const tokens = text.match(/\S+\s*/g) ?? [text];
  for (const token of tokens) {
    if (signal?.aborted) return;
    onEvent({ type: 'token', text: token });
    await delay(TOKEN_DELAY, signal);
  }
}

export class MockTransport implements ChatTransport {
  private seq = 0;

  async send({ conversationId, text, language, onEvent, signal }: SendOptions): Promise<void> {
    const convId = conversationId ?? `mock-${++this.seq}`;
    const scenario = pickScenario(text);
    const { preToolText, events } = scenarioToEvents(scenario, language, convId);

    try {
      // Stări de eroare: o mică pauză apoi evenimentul de eroare.
      const errorEvent = events.find((e) => e.type === 'error');
      if (errorEvent) {
        await delay(STEP_DELAY, signal);
        onEvent(errorEvent);
        return;
      }

      // Ordinea reproduce comportamentul prototipului:
      // tool_running → cards → token-e text → done.

      // 1) tool_running (dacă scenariul folosește un tool)
      if (scenario.tool) {
        onEvent({ type: 'tool_running', tool: scenario.tool });
        await delay(STEP_DELAY, signal);
      }

      // 2) cardurile (rezultatele apar înainte ca textul să fie „tastat")
      const cardsEvent = events.find((e) => e.type === 'cards');
      if (cardsEvent) {
        onEvent(cardsEvent);
        await delay(CARD_DELAY, signal);
      }

      // 3) textul asistentului, streamat token cu token
      if (preToolText) {
        await streamText(preToolText, onEvent, signal);
      }

      // 4) gata
      onEvent({ type: 'done', conversationId: convId });
    } catch (e) {
      if (isAbort(e)) return; // anulare: oprire silențioasă
      throw e;
    }
  }
}
