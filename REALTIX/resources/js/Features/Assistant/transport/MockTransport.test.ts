// resources/js/Features/Assistant/transport/MockTransport.test.ts

import { describe, expect, it } from 'vitest';
import { MockTransport } from './MockTransport';
import type { ChatEvent } from '../types';

async function collect(text: string): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  const transport = new MockTransport();
  await transport.send({
    conversationId: null,
    text,
    language: 'ro',
    onEvent: (e) => events.push(e),
  });
  return events;
}

describe('MockTransport', () => {
  it('emite tool_running → cards → token-e → done', async () => {
    const events = await collect('apartament 2 camere în Buiucani');
    const types = events.map((e) => e.type);

    expect(types[0]).toBe('tool_running');

    const cardsIdx = types.indexOf('cards');
    const firstTokenIdx = types.indexOf('token');
    expect(cardsIdx).toBeGreaterThan(0);
    expect(firstTokenIdx).toBeGreaterThan(cardsIdx); // cardurile înainte de text

    const tokenCount = types.filter((x) => x === 'token').length;
    expect(tokenCount).toBeGreaterThanOrEqual(3); // cel puțin token×3

    const last = events[events.length - 1];
    expect(last.type).toBe('done');
    if (last.type === 'done') expect(last.conversationId).toBeTruthy();

    const cards = events[cardsIdx];
    if (cards.type === 'cards') expect((cards.listings ?? []).length).toBeGreaterThan(0);
  });

  it('mapează scenariul "rate" la error code=rate_limited', async () => {
    const events = await collect('am atins limita de mesaje');
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.type).toBe('error');
    if (e.type === 'error') expect(e.code).toBe('rate_limited');
  });
});
