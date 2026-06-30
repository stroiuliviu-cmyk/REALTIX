// resources/js/Features/Assistant/types.ts
//
// Tipurile pe care le consumă întregul UI al asistentului.
// IMPORTANT: aceste forme trebuie să coincidă cu ce emite backend-ul
// (ChatService / SSE). Le definim o singură dată, aici.

export type ListingSource = 'internal' | 'external';
export type DealType = 'sale' | 'rent';
export type Currency = 'EUR' | 'MDL';
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'        // „Vilă" — distinct de „Casă" în platforma reală
  | 'commercial'
  | 'land'
  | 'office'
  | 'garage';

/** Tip proprietar (filtrul „TIP PROPRIETAR" din Web Oferte). */
export type OwnerType = 'owner' | 'agency'; // Proprietar | Agenție

/** Sub-sursa anunțurilor externe (scraped). */
export type ExternalSite = '999.md' | 'imobiliare.md' | 'piata.md';

/** Perioada de chirie, când dealType = 'rent'. */
export type RentPeriod = 'month' | 'day';

export type Language = 'ro' | 'ru';

/** Card de obiect — forma publică (FĂRĂ date de contact ale agentului). */
export interface ListingCard {
  id: string;
  source: ListingSource;
  title: string;
  dealType: DealType;
  propertyType: PropertyType;
  price: number;
  currency: Currency;
  city: string;
  district?: string;
  rooms?: number;
  /** suprafață în m² */
  area?: number;
  /** preț pe m² (afișat în card; calculat când area > 0) */
  pricePerM2?: number;
  /** perioada, dacă e chirie (ex. „/lună") */
  rentPeriod?: RentPeriod;
  /** Proprietar sau Agenție (filtrul TIP PROPRIETAR) */
  ownerType?: OwnerType;
  /** sub-sursa, doar pentru obiecte externe */
  sourceSite?: ExternalSite;
  /** link către anunțul original la sursă (doar extern) */
  externalUrl?: string;
  /** număr de poze disponibile */
  photoCount?: number;
  photoUrl?: string;
  /** galerie de poze pentru detaliu (carusel); photoUrl == photos[0] */
  photos?: string[];
  /** ruta internă către pagina obiectului */
  url: string;
  /** true dacă obiectul provine din scraped_listings */
  isExternal: boolean;
  /** true dacă obiectul nu mai e disponibil (afișat din snapshot) */
  unavailable?: boolean;
  postedAt?: string; // ISO date
}

/** Date publice extinse pentru pagina obiectului. */
export interface ListingDetails extends ListingCard {
  description?: string;
  photos: string[];
  agency?: AgencyCard;
}

/** Card de agenție — fără date de contact directe. */
export interface AgencyCard {
  id: string;
  name: string;
  city?: string;
  specializations: string[];
  publicListingsCount: number;
  url: string;
}

/**
 * Evenimentele streamului de chat.
 * MockTransport le emite simulat; SseTransport le va mapa din SSE-ul real
 * (token | tool_running | cards | done | error).
 */
export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_running'; tool: 'search_listings' | 'search_agencies' | 'get_listing_details' }
  | { type: 'cards'; listings?: ListingCard[]; agencies?: AgencyCard[] }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; code: ChatErrorCode; message: string };

export type ChatErrorCode =
  | 'rate_limited'   // limita de mesaje pe sesiune atinsă → invită la înregistrare
  | 'server_error'   // eroare generică → buton reîncearcă
  | 'no_results';    // (opțional) marcaj semantic; de obicei vine ca text + cards goale

/** Rolurile mesajelor în UI. */
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  /** textul acumulat (pentru assistant crește în timpul streamingului) */
  text: string;
  listings?: ListingCard[];
  agencies?: AgencyCard[];
  /** marcaje de stare pentru bula assistant */
  pending?: boolean;          // încă se generează
  error?: ChatErrorCode;      // bula s-a încheiat cu eroare
}

/** Element de istoric (până la 10 pe owner). */
export interface ConversationSummary {
  id: string;
  title: string;
  language: Language;
  lastActivityAt: string; // ISO
}
