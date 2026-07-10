// resources/js/Features/Assistant/transport/ChatTransport.ts
//
// Contractul UI ↔ date. Întregul UI vorbește DOAR cu această interfață.
// La început injectăm MockTransport; când backend-ul e gata, injectăm
// SseTransport — fără a schimba componentele.

import type { ChatEvent } from '../types';

export interface SendOptions {
  /** id-ul conversației curente, null pentru o conversație nouă */
  conversationId: string | null;
  /** textul utilizatorului */
  text: string;
  /** limba curentă a interfeței (RO/RU) */
  language: 'ro' | 'ru';
  /** callback apelat pentru fiecare eveniment din stream */
  onEvent: (event: ChatEvent) => void;
  /** semnal de anulare (utilizatorul a oprit / a plecat din pagină) */
  signal?: AbortSignal;
}

export interface ChatTransport {
  /**
   * Trimite un mesaj și consumă streamul de evenimente.
   * Promisiunea se rezolvă când streamul s-a încheiat (după 'done' sau 'error').
   */
  send(options: SendOptions): Promise<void>;
}
