// resources/js/Features/Assistant/mock/scenarios.ts
//
// Decide ce „răspunde" asistentul mock în funcție de textul întrebării.
// Acoperă toate stările pe care UI-ul trebuie să le trateze:
// rezultate normale, zero rezultate, eroare de server, limită atinsă.

import type { ChatEvent, Language, ListingCard, AgencyCard } from '../types';
import { filterListings, MOCK_LISTINGS } from './listings';
import { filterAgencies } from './agencies';

export type ScenarioKind =
  | 'listings'
  | 'agencies'
  | 'no_results'
  | 'rate_limited'
  | 'server_error'
  | 'smalltalk';

export interface Scenario {
  kind: ScenarioKind;
  tool?: 'search_listings' | 'search_agencies';
  /** textul final al asistentului (poate fi împărțit în token-e la transport) */
  answer: { ro: string; ru: string };
  listings?: ListingCard[];
  agencies?: AgencyCard[];
}

const has = (t: string, ...words: string[]) =>
  words.some((w) => t.includes(w));

/**
 * Rutează textul utilizatorului către un scenariu.
 * Cuvinte-cheie speciale pentru a testa stările:
 *  - „eroare" / „error"        → server_error
 *  - „limita" / „limit"        → rate_limited
 *  - „xyzzy" / „nimic"         → no_results
 */
export function pickScenario(rawText: string): Scenario {
  const t = rawText.toLowerCase();

  // —— Stări forțate (pentru QA) ——
  if (has(t, 'eroare', 'error', 'server'))
    return {
      kind: 'server_error',
      answer: { ro: '', ru: '' },
    };

  if (has(t, 'limita', 'limită', 'limit', 'prea multe'))
    return {
      kind: 'rate_limited',
      answer: { ro: '', ru: '' },
    };

  if (has(t, 'xyzzy', 'nimic', 'inexistent'))
    return {
      kind: 'no_results',
      tool: 'search_listings',
      answer: {
        ro: 'Nu am găsit obiecte care să corespundă criteriilor. Vrei să relaxăm filtrele — de exemplu un buget mai mare sau un sector vecin?',
        ru: 'Я не нашёл объектов по этим критериям. Хотите ослабить фильтры — например, увеличить бюджет или соседний сектор?',
      },
      listings: [],
    };

  // —— Agenții ——
  if (has(t, 'agenți', 'agenție', 'agentie', 'агентств')) {
    const agencies = filterAgencies({});
    return {
      kind: 'agencies',
      tool: 'search_agencies',
      answer: {
        ro: `Am găsit ${agencies.length} agenții relevante. Poți deschide oricare pentru a-i vedea obiectele publice.`,
        ru: `Нашёл ${agencies.length} подходящих агентств. Откройте любое, чтобы посмотреть публичные объекты.`,
      },
      agencies,
    };
  }

  // —— Smalltalk / off-topic ușor ——
  if (has(t, 'salut', 'bună', 'buna', 'привет', 'здравствуй') && t.length < 25)
    return {
      kind: 'smalltalk',
      answer: {
        ro: 'Salut! Spune-mi ce cauți — de exemplu „apartament 2 camere în Buiucani sub 60.000 €" — și caut imediat.',
        ru: 'Привет! Скажите, что ищете — например «2-комнатная в Буюканах до 60 000 €» — и я сразу найду.',
      },
    };

  // —— Căutare de obiecte (implicit) ——
  const dealType = has(t, 'închiri', 'inchiri', 'chirie', 'аренд', 'снять')
    ? 'rent'
    : has(t, 'cumpăr', 'cumpar', 'vânzare', 'vanzare', 'купить', 'продаж')
      ? 'sale'
      : undefined;

  const district =
    has(t, 'buiucani', 'буюкан') ? 'Buiucani'
    : has(t, 'centru', 'центр') ? 'Centru'
    : has(t, 'botanica', 'ботаник') ? 'Botanica'
    : has(t, 'râșcani', 'riscani', 'рышкан') ? 'Râșcani'
    : has(t, 'ciocana', 'чекан') ? 'Ciocana'
    : has(t, 'telecentru', 'телецентр') ? 'Telecentru'
    : undefined;

  const rooms =
    has(t, '1 camer', '1-com', 'однокомн') ? 1
    : has(t, '2 camer', '2-com', 'двухкомн', 'двухкомнат') ? 2
    : has(t, '3 camer', '3-com', 'трёхкомн', 'трехкомн') ? 3
    : undefined;

  const ownerType =
    has(t, 'proprietar', 'de la proprietar', 'собственник', 'хозяин') ? 'owner' as const
    : has(t, 'agenți', 'agenție', 'agentie', 'агентств') ? 'agency' as const
    : undefined;

  let listings = filterListings({ dealType, district, rooms, ownerType });
  if (listings.length === 0) listings = MOCK_LISTINGS.slice(0, 4); // fallback ca să nu fie gol degeaba
  listings = listings.slice(0, 8); // ≤10 (aici max 8)

  const count = listings.length;
  return {
    kind: 'listings',
    tool: 'search_listings',
    answer: {
      ro: `Am găsit ${count} obiect${count === 1 ? '' : 'e'} potrivite${district ? ` în ${district}` : ''}. Iată cele mai relevante — spune-mi dacă vrei să ajustez bugetul, zona sau numărul de camere.`,
      ru: `Нашёл ${count} подходящих объект${count === 1 ? '' : 'ов'}${district ? ` в районе ${district}` : ''}. Вот самые релевантные — скажите, если нужно изменить бюджет, район или число комнат.`,
    },
    listings,
  };
}

/** Transformă scenariul în secvența de evenimente pe care le emite transportul. */
export function scenarioToEvents(
  scenario: Scenario,
  language: Language,
  conversationId: string,
): { preToolText?: string; events: ChatEvent[] } {
  const text = scenario.answer[language];

  if (scenario.kind === 'server_error') {
    return {
      events: [
        { type: 'error', code: 'server_error', message: 'A apărut o eroare. Încearcă din nou.' },
      ],
    };
  }

  if (scenario.kind === 'rate_limited') {
    return {
      events: [
        {
          type: 'error',
          code: 'rate_limited',
          message:
            language === 'ro'
              ? 'Ai atins limita de mesaje pentru această sesiune. Creează un cont ca să continui.'
              : 'Вы достигли лимита сообщений для этой сессии. Создайте аккаунт, чтобы продолжить.',
        },
      ],
    };
  }

  const events: ChatEvent[] = [];

  if (scenario.tool) {
    events.push({ type: 'tool_running', tool: scenario.tool });
    events.push({
      type: 'cards',
      listings: scenario.listings,
      agencies: scenario.agencies,
    });
  }

  // textul final se împarte în token-e la nivelul transportului
  events.push({ type: 'done', conversationId });

  return { preToolText: text, events };
}
