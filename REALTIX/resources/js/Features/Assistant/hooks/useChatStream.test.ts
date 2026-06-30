// resources/js/Features/Assistant/hooks/useChatStream.test.ts

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStream } from './useChatStream';
import type { ChatTransport, SendOptions } from '../transport/ChatTransport';
import type { ListingCard } from '../types';

/** Construiește un ChatTransport fals dintr-un script de emitere de evenimente. */
function transportFrom(script: (options: SendOptions) => void): ChatTransport {
  return {
    send: (options: SendOptions): Promise<void> => {
      script(options);
      return Promise.resolve();
    },
  };
}

const sampleCard: ListingCard = {
  id: 'rt-1',
  source: 'internal',
  title: 'Apartament test',
  dealType: 'sale',
  propertyType: 'apartment',
  price: 50000,
  currency: 'EUR',
  city: 'Chișinău',
  url: '/properties/rt-1',
  isExternal: false,
};

describe('useChatStream', () => {
  it('reflectă corect streamingul: token×3 → cards → done', async () => {
    const transport = transportFrom(({ onEvent, conversationId }) => {
      onEvent({ type: 'token', text: 'Am ' });
      onEvent({ type: 'token', text: 'găsit ' });
      onEvent({ type: 'token', text: '1 obiect' });
      onEvent({ type: 'cards', listings: [sampleCard] });
      onEvent({ type: 'done', conversationId: conversationId ?? 'c1' });
    });

    const { result } = renderHook(() => useChatStream('ro', transport));

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', text: 'test' });

    const assistant = result.current.messages[1];
    expect(assistant.role).toBe('assistant');
    expect(assistant.text).toBe('Am găsit 1 obiect');
    expect(assistant.listings).toEqual([sampleCard]);
    expect(assistant.pending).toBe(false);
    expect(assistant.error).toBeUndefined();

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.currentTool).toBeNull();
    expect(result.current.conversationId).toBe('c1');
  });

  it('tratează eroarea code=rate_limited', async () => {
    const transport = transportFrom(({ onEvent }) => {
      onEvent({ type: 'error', code: 'rate_limited', message: 'limit reached' });
    });

    const { result } = renderHook(() => useChatStream('ro', transport));

    await act(async () => {
      await result.current.sendMessage('prea multe mesaje');
    });

    const assistant = result.current.messages[1];
    expect(assistant.error).toBe('rate_limited');
    expect(assistant.pending).toBe(false);
    // text prietenos în limba curentă (RO), nu gol
    expect(assistant.text.length).toBeGreaterThan(0);
    expect(result.current.isStreaming).toBe(false);
  });
});
