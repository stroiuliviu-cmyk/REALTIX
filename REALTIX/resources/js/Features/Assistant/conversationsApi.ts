// resources/js/Features/Assistant/conversationsApi.ts
//
// Client subțire peste API-ul de istoric (JSON, scop pe owner). Doar citire.

import type { AgencyCard, Language, ListingCard, MessageRole } from './types';

export interface ConversationSummary {
  id: string;
  title: string | null;
  language: Language;
  lastActivityAt: string | null;
  messageCount: number;
}

export interface LoadedMessage {
  role: MessageRole;
  text: string;
  listings?: ListingCard[];
  agencies?: AgencyCard[];
}

export interface LoadedConversation {
  id: string;
  language: Language;
  messages: LoadedMessage[];
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Lista de conversații a owner-ului curent (mai nouă prima). */
export async function listConversations(): Promise<ConversationSummary[]> {
  const data = await apiGet<{
    conversations: Array<{
      id: string;
      title: string | null;
      language: Language;
      last_activity_at: string | null;
      message_count: number;
    }>;
  }>('/assistant/api/conversations');

  return data.conversations.map((c) => ({
    id: c.id,
    title: c.title,
    language: c.language,
    lastActivityAt: c.last_activity_at,
    messageCount: c.message_count,
  }));
}

/** Mesajele unei conversații (pentru rehidratarea chatului). */
export async function fetchConversation(id: string): Promise<LoadedConversation> {
  return apiGet<LoadedConversation>(`/assistant/api/conversations/${encodeURIComponent(id)}`);
}
