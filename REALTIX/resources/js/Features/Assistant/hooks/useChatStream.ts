// resources/js/Features/Assistant/hooks/useChatStream.ts
//
// Hook-ul central al chat-ului. Vorbește DOAR cu `chatTransport` din transport/index
// (sau cu un transport injectat — util pentru teste). Nu apelează fetch direct.

import { useCallback, useRef, useState } from 'react';
import type { ChatErrorCode, ChatEvent, ChatMessage, Language } from '../types';
import { chatTransport, type ChatTransport } from '../transport';
import { translate, type TranslationKey } from '../i18n';

let idSeq = 0;
const nextId = (prefix: string): string => `${prefix}${++idSeq}`;

function errorKey(code: ChatErrorCode): TranslationKey {
  switch (code) {
    case 'rate_limited':
      return 'state.rate_limited';
    case 'no_results':
      return 'state.no_results';
    case 'server_error':
    default:
      return 'state.error';
  }
}

export interface UseChatStream {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentTool: string | null;
  conversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * @param language limba curentă (din useLanguage) — folosită pentru textele de eroare
 * @param transport implementarea de transport; implicit `chatTransport` (mock/SSE)
 */
export function useChatStream(
  language: Language,
  transport: ChatTransport = chatTransport,
): UseChatStream {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (rawText: string): Promise<void> => {
      const text = rawText.trim();
      if (text === '' || isStreaming) return;

      const assistantId = nextId('a');
      setMessages((prev) => [
        ...prev,
        { id: nextId('u'), role: 'user', text },
        { id: assistantId, role: 'assistant', text: '', pending: true },
      ]);
      setIsStreaming(true);
      setCurrentTool(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (updater: (m: ChatMessage) => ChatMessage): void =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? updater(m) : m)));

      const onEvent = (event: ChatEvent): void => {
        switch (event.type) {
          case 'token':
            patch((m) => ({ ...m, text: m.text + event.text }));
            break;
          case 'tool_running':
            setCurrentTool(event.tool);
            break;
          case 'cards':
            patch((m) => ({
              ...m,
              listings: event.listings ?? m.listings,
              agencies: event.agencies ?? m.agencies,
            }));
            break;
          case 'done':
            setConversationId(event.conversationId);
            setCurrentTool(null);
            patch((m) => ({ ...m, pending: false }));
            break;
          case 'error': {
            const friendly = translate(language, errorKey(event.code));
            setCurrentTool(null);
            patch((m) => ({
              ...m,
              pending: false,
              error: event.code,
              text: m.text !== '' ? m.text : friendly,
            }));
            break;
          }
        }
      };

      try {
        await transport.send({
          conversationId,
          text,
          language,
          onEvent,
          signal: controller.signal,
        });
      } catch {
        // transportul a aruncat neașteptat (rețea etc.) → marcăm bula ca eroare
        patch((m) => ({
          ...m,
          pending: false,
          error: m.error ?? 'server_error',
          text: m.text !== '' ? m.text : translate(language, 'state.error'),
        }));
      } finally {
        setIsStreaming(false);
        setCurrentTool(null);
        abortRef.current = null;
      }
    },
    [isStreaming, language, transport, conversationId],
  );

  const stop = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setCurrentTool(null);
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)));
  }, []);

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId(null);
    setCurrentTool(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, currentTool, conversationId, sendMessage, stop, reset };
}
