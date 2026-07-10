// resources/js/Features/Assistant/hooks/useChatStream.ts
//
// Hook-ul central al chat-ului. Streamingul trece DOAR prin `chatTransport`
// (sau un transport injectat — util pentru teste). Citește istoricul prin
// conversationsApi și ține conversationId activ în localStorage (reload →
// aceeași conversație continuă unde a rămas).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatErrorCode, ChatEvent, ChatMessage, Language, QuotaState } from '../types';
import { chatTransport, type ChatTransport } from '../transport';
import { fetchConversation, type LoadedConversation } from '../conversationsApi';
import { translate, type TranslationKey } from '../i18n';

let idSeq = 0;
const nextId = (prefix: string): string => `${prefix}${++idSeq}`;

const CID_KEY = 'rt-assistant-cid';
const readCid = (): string | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(CID_KEY) : null;
  } catch {
    return null;
  }
};
const writeCid = (id: string | null): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (id) localStorage.setItem(CID_KEY, id);
    else localStorage.removeItem(CID_KEY);
  } catch {
    /* localStorage indisponibil — ignorăm */
  }
};

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
  /** Ultima stare a cotei de rezultate gratuite; null până la prima căutare. */
  quota: QuotaState | null;
  sendMessage: (text: string) => Promise<void>;
  /** Încarcă o conversație din istoric în chat (rehidratare). */
  loadConversation: (id: string) => Promise<void>;
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
  const [conversationId, setConversationId] = useState<string | null>(() => readCid());
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hydrate = useCallback((loaded: LoadedConversation): void => {
    setMessages(
      loaded.messages.map((m) => ({
        id: nextId(m.role === 'user' ? 'u' : 'a'),
        role: m.role,
        text: m.text,
        listings: m.listings,
        agencies: m.agencies,
      })),
    );
    setConversationId(loaded.id);
    writeCid(loaded.id);
  }, []);

  const loadConversation = useCallback(
    async (id: string): Promise<void> => {
      try {
        hydrate(await fetchConversation(id));
      } catch {
        // conversație inaccesibilă / offline → nu schimbăm nimic
      }
    },
    [hydrate],
  );

  // La montare: dacă avem un conversationId salvat, continuăm acolo (reload-safe).
  useEffect(() => {
    const cid = readCid();
    if (cid) void loadConversation(cid);
    // o singură dată, la montare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          case 'quota':
            setQuota({
              used: event.used,
              remaining: event.remaining,
              limit: event.limit,
              exceeded: event.exceeded,
            });
            break;
          case 'done':
            setConversationId(event.conversationId);
            writeCid(event.conversationId); // reload → aceeași conversație
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
    writeCid(null); // conversație nouă → nu mai continuăm cea veche
    setCurrentTool(null);
    setIsStreaming(false);
    // NB: cota NU se resetează la conversație nouă — e per owner, nu per chat.
  }, []);

  return { messages, isStreaming, currentTool, conversationId, quota, sendMessage, loadConversation, stop, reset };
}
