// resources/js/Features/Assistant/AssistantApp.tsx
//
// Componenta UI a asistentului REALTIX. NU conține date sau simulare: tot ce ține
// de „date" vine prin hook-uri care consumă transport.send() → evenimente ChatEvent.
// Aspectul (culori, tipografie, ecrane) e portat 1:1 din designul „Asistent AI REALTIX".

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Markdown } from './Markdown';
import { listConversations, type ConversationSummary } from './conversationsApi';
import type {
  AgencyCard,
  ChatMessage,
  Language,
  ListingCard,
  ListingSource,
} from './types';
import { SUGGESTIONS, type TranslationKey } from './i18n';
import { FEATURES } from './features';
import type { ChatTransport } from './transport';
import { useChatStream } from './hooks/useChatStream';
import { useFavorites } from './hooks/useFavorites';
import { useLanguage } from './hooks/useLanguage';

/* ─────────────────────────── palette (din design) ─────────────────────────── */

interface Palette {
  pageBg: string; bg: string; raised: string; raised2: string;
  text: string; text2: string; muted: string; border: string; border2: string;
  primary: string; primaryH: string; primarySoft: string;
  /** text/icon color ON a primary / userBub fill (white in light, near-black in dark) */
  onPrimary: string;
  userBub: string; asstBub: string; header: string; shadow: string;
  extBg: string; extText: string; danger: string; dangerBg: string; dangerBd: string;
}

const LIGHT: Palette = {
  pageBg: '#e9edf3', bg: '#f4f6fb', raised: '#ffffff', raised2: '#f6f8fc',
  text: '#0f172a', text2: '#475569', muted: '#94a3b8', border: '#e6eaf1', border2: '#cdd5e1',
  primary: '#2563eb', primaryH: '#1d4ed8', primarySoft: '#eff6ff',
  onPrimary: '#ffffff',
  userBub: '#2563eb', asstBub: '#ffffff', header: 'rgba(255,255,255,0.9)', shadow: '0 1px 3px rgba(15,23,42,0.08)',
  extBg: '#eef2ff', extText: '#4338ca', danger: '#dc2626', dangerBg: '#fef2f2', dangerBd: '#fecaca',
};

// Dark = monocrom (alb-negru): zero albastru. Accentul „primary" e alb (#fafafa),
// butoanele = negru pe alb (onPrimary), suprafețele/borderele în scară de gri.
// Roșul de eroare (danger) rămâne pentru semantică — nu e albastru.
const DARK: Palette = {
  pageBg: '#000000', bg: '#0a0a0a', raised: '#1a1a1a', raised2: '#141414',
  text: '#fafafa', text2: '#c8c8c8', muted: '#9ca3af', border: 'rgba(255,255,255,0.12)', border2: 'rgba(255,255,255,0.24)',
  primary: '#fafafa', primaryH: '#e5e5e5', primarySoft: 'rgba(255,255,255,0.12)',
  onPrimary: '#0a0a0a',
  userBub: '#fafafa', asstBub: '#1a1a1a', header: 'rgba(0,0,0,0.85)', shadow: '0 1px 3px rgba(0,0,0,0.6)',
  extBg: 'rgba(255,255,255,0.10)', extText: '#e5e5e5', danger: '#f87171', dangerBg: 'rgba(248,113,113,0.12)', dangerBd: 'rgba(248,113,113,0.30)',
};

/* ─────────────────────────────── icons ─────────────────────────────── */

const ICONS: Record<string, string[]> = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  sparkles: ['M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z', 'M20 3v4', 'M22 5h-4'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  send: ['m22 2-7 20-4-9-9-4z', 'M22 2 11 13'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  paperclip: ['M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'],
  mapPin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  building: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M10 6h4', 'M10 10h4', 'M10 14h4'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z'],
  grid: ['M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z', 'M20 3h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z', 'M10 13H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z', 'M20 13h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z'],
  maximize: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
  message: ['M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z', 'M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', 'M12 9v4', 'M12 17h.01'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  lock: ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  user: ['M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M20 21a8 8 0 0 0-16 0'],
};

function Icon({
  name, size = 18, color = 'currentColor', stroke = 2, filled = false, style,
}: { name: string; size?: number; color?: string; stroke?: number; filled?: boolean; style?: CSSProperties }) {
  const paths = ICONS[name] ?? [];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'} stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* ─────────────────────────── formatting helpers ─────────────────────────── */

function groupThousands(n: number): string {
  const s = Math.round(n).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.';
    out += s[i];
  }
  return out;
}

function formatPrice(card: ListingCard, lang: Language): string {
  const amount = groupThousands(card.price);
  const base = card.currency === 'EUR' ? `€${amount}`
    : card.currency === 'USD' ? `$${amount}`
    : `${amount} lei`;
  if (card.dealType === 'rent' && card.rentPeriod) {
    const per = card.rentPeriod === 'day' ? (lang === 'ru' ? '/день' : '/zi') : (lang === 'ru' ? '/мес' : '/lună');
    return base + per;
  }
  return base;
}

function propertyTypeLabel(card: ListingCard, lang: Language): string {
  const ro: Record<ListingCard['propertyType'], string> = {
    apartment: 'Apartament', house: 'Casă', villa: 'Vilă', commercial: 'Comercial', land: 'Teren', office: 'Birou', garage: 'Garaj',
  };
  const ru: Record<ListingCard['propertyType'], string> = {
    apartment: 'Квартира', house: 'Дом', villa: 'Вилла', commercial: 'Коммерческая', land: 'Участок', office: 'Офис', garage: 'Гараж',
  };
  return (lang === 'ru' ? ru : ro)[card.propertyType];
}

function roomsLabel(rooms: number, lang: Language): string {
  if (lang === 'ru') return `${rooms} комн.`;
  return rooms === 1 ? '1 cameră' : `${rooms} camere`;
}

function metaLine(card: ListingCard, lang: Language): string {
  const parts: string[] = [propertyTypeLabel(card, lang)];
  if (card.rooms) parts.push(roomsLabel(card.rooms, lang));
  if (card.area) parts.push(`${card.area} m²`);
  return parts.join(' · ');
}

function locationLine(card: ListingCard): string {
  return card.district ? `${card.city} · ${card.district}` : card.city;
}

/* ─────────────────────────────── card views ─────────────────────────────── */

interface CardProps {
  card: ListingCard; p: Palette; lang: Language; t: (k: TranslationKey) => string;
  fav: boolean; onOpen: () => void; onFav: () => void; width?: number;
}

function ListingCardView({ card, p, lang, t, fav, onOpen, onFav, width }: CardProps) {
  return (
    <div
      onClick={onOpen}
      style={{
        width: width ? `${width}px` : '100%', background: p.raised, border: `1px solid ${p.border}`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: p.shadow,
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 150, background: p.raised2 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.muted }}>
          <Icon name="building" size={40} stroke={1.6} />
        </div>
        {card.photoUrl ? (
          <img src={card.photoUrl} alt={card.title} loading="lazy" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
        {card.isExternal ? (
          <div style={{ position: 'absolute', top: 9, left: 9, display: 'inline-flex', alignItems: 'center', gap: 4, background: p.extBg, color: p.extText, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>
            <Icon name="globe" size={12} stroke={2.2} /> {t('badge.external')}
          </div>
        ) : null}
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          aria-label={t('btn.favorite')}
          style={{ position: 'absolute', top: 9, right: 9, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,.24)', color: fav ? p.primary : '#64748b' }}
        >
          <Icon name="heart" size={18} filled={fav} color={fav ? p.primary : '#64748b'} />
        </button>
        {card.unavailable ? (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: 'rgba(255,255,255,.95)', color: '#0f172a', fontSize: 12, fontWeight: 700, padding: '6px 13px', borderRadius: 8 }}>{t('badge.unavailable')}</span>
          </div>
        ) : null}
      </div>
      <div style={{ padding: '11px 13px 13px' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: p.text, letterSpacing: '-.01em' }}>{formatPrice(card, lang)}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: p.text, marginTop: 3, lineHeight: 1.3 }}>{card.title}</div>
        <div style={{ fontSize: 12, color: p.text2, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="mapPin" size={12} /> {locationLine(card)}
        </div>
        <div style={{ fontSize: 11.5, color: p.muted, marginTop: 3 }}>{metaLine(card, lang)}</div>
      </div>
    </div>
  );
}

function AgencyCardView({ agency, p, t }: { agency: AgencyCard; p: Palette; t: (k: TranslationKey) => string }) {
  return (
    <div style={{ width: 240, flex: 'none', background: p.raised, border: `1px solid ${p.border}`, borderRadius: 16, padding: 15, boxShadow: p.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="building" size={22} color={p.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: p.text, fontSize: 14.5 }}>{agency.name}</div>
          <div style={{ fontSize: 12.5, color: p.text2 }}>{(agency.city ? `${agency.city} · ` : '') + `${agency.publicListingsCount} ${t('agency.public_suffix')}`}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {agency.specializations.map((s) => (
          <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: p.text2, background: p.raised2, border: `1px solid ${p.border}`, padding: '4px 9px', borderRadius: 8 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── context ─────────────────────────────── */

interface Ctx {
  p: Palette;
  authenticated: boolean;
  /** navigare SPA pentru link-uri interne din markdown; undefined în teste */
  navigate?: (href: string) => void;
  lang: Language;
  t: (k: TranslationKey) => string;
  toggleLang: () => void;
  setLang: (l: Language) => void;
  favCount: number;
  isFav: (id: string, source: ListingSource) => boolean;
  toggleFav: (c: ListingCard) => void;
  favorites: ListingCard[];
  messages: ChatMessage[];
  isStreaming: boolean;
  currentTool: string | null;
  draft: string;
  setDraft: (s: string) => void;
  send: () => void;
  sendText: (s: string) => void;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  newChat: () => void;
  openFavorites: () => void;
  openConversations: () => void;
  /** conversația activă (pentru evidențiere în istoric) */
  conversationId: string | null;
  /** încarcă o conversație din istoric și comută pe chat */
  openPastConversation: (id: string) => void;
  openListing: (c: ListingCard) => void;
  back: () => void;
  openGate: (c: ListingCard | null) => void;
}

/* ─────────────────────────────── header ─────────────────────────────── */

function Header({ ctx }: { ctx: Ctx }) {
  const { p, t, lang, setLang, favCount, newChat, openFavorites, openConversations } = ctx;
  const langBtn = (code: Language) => (
    <button
      onClick={() => setLang(code)}
      style={{ padding: '5px 9px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: lang === code ? p.primary : 'transparent', color: lang === code ? p.onPrimary : p.text2 }}
    >
      {code.toUpperCase()}
    </button>
  );
  return (
    <header style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: p.header, borderBottom: `1px solid ${p.border}` }}>
      <div onClick={newChat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginRight: 'auto' }}>
        <Icon name="home" size={22} color={p.primary} stroke={2.25} />
        <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, letterSpacing: '.15em', fontSize: 15, color: p.text }}>REALTIX</span>
      </div>
      <div style={{ display: 'flex', background: p.raised2, border: `1px solid ${p.border}`, borderRadius: 9, padding: 2, gap: 2 }}>
        {langBtn('ro')}{langBtn('ru')}
      </div>
      <button onClick={openConversations} aria-label={t('nav.conversations')} title={t('nav.conversations')} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${p.border}`, background: p.raised, color: p.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Icon name="clock" size={18} color={p.text2} />
      </button>
      <button onClick={openFavorites} aria-label={t('nav.favorites')} title={t('nav.favorites')} style={{ height: 38, padding: '0 13px 0 11px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.raised, color: p.text, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
        <Icon name="heart" size={17} color={p.primary} filled={favCount > 0} />
        <span style={{ minWidth: 10 }}>{favCount}</span>
      </button>
    </header>
  );
}

/* ─────────────────────────────── chat ─────────────────────────────── */

function ThinkingDots({ p }: { p: Palette }) {
  return (
    <span style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: p.primary, animation: `rtDot 1.1s infinite ${i * 0.16}s` }} />
      ))}
    </span>
  );
}

function AssistantBlocks({ ctx, m }: { ctx: Ctx; m: ChatMessage }) {
  const { p, t, lang, isFav, toggleFav, openListing, expanded, toggleExpand, sendText } = ctx;
  const listings = m.listings ?? [];
  const agencies = m.agencies ?? [];
  const isExpanded = expanded.has(m.id);
  const visible = isExpanded ? listings : listings.slice(0, 2);
  const hiddenCount = listings.length - visible.length;

  return (
    <>
      {listings.length > 0 ? (
        <>
          <div className="rt-scroll" style={{ display: 'flex', gap: 12, marginTop: 12, overflowX: 'auto', paddingBottom: 5 }}>
            {visible.map((c) => (
              <div key={`${c.source}:${c.id}`} style={{ flex: 'none', width: 240 }}>
                <ListingCardView card={c} p={p} lang={lang} t={t} fav={isFav(c.id, c.source)} onOpen={() => openListing(c)} onFav={() => toggleFav(c)} />
              </div>
            ))}
          </div>
          {hiddenCount > 0 ? (
            <button onClick={() => toggleExpand(m.id)} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: p.primary, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', padding: '4px 0' }}>
              {t('btn.show_more')} ({hiddenCount}) <Icon name="chevronDown" size={15} color={p.primary} stroke={2.2} />
            </button>
          ) : null}
        </>
      ) : null}

      {agencies.length > 0 ? (
        <div className="rt-scroll" style={{ display: 'flex', gap: 12, marginTop: 12, overflowX: 'auto', paddingBottom: 5 }}>
          {agencies.map((a) => <AgencyCardView key={a.id} agency={a} p={p} t={t} />)}
        </div>
      ) : null}

      {/* zero results: listings prezente dar goale, fără eroare */}
      {m.listings && m.listings.length === 0 && !m.error ? (
        <div style={{ marginTop: 11, background: p.asstBub, border: `1px solid ${p.border}`, borderRadius: 14, padding: '15px 16px', maxWidth: 400 }}>
          <div style={{ fontWeight: 700, color: p.text, fontSize: 14, marginBottom: 5 }}>{t('zero.title')}</div>
          <p style={{ fontSize: 13, color: p.text2, lineHeight: 1.5, margin: '0 0 13px' }}>{t('zero.sub')}</p>
          <button onClick={() => sendText(t('btn.relax_filters'))} style={{ background: p.primary, color: p.onPrimary, border: 'none', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('btn.relax_filters')}</button>
        </div>
      ) : null}

      {m.error === 'server_error' ? (
        <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', gap: 11, background: p.dangerBg, border: `1px solid ${p.dangerBd}`, borderRadius: 14, padding: '13px 15px', maxWidth: 400 }}>
          <Icon name="alert" size={20} color={p.danger} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: p.text, fontSize: 13.5 }}>{t('error.title')}</div>
            <div style={{ fontSize: 12.5, color: p.text2, marginTop: 2 }}>{t('error.sub')}</div>
          </div>
          <button onClick={() => sendText(ctx.draft || t('btn.retry'))} style={{ flex: 'none', background: p.primary, color: p.onPrimary, border: 'none', padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t('btn.retry')}</button>
        </div>
      ) : null}

      {m.error === 'rate_limited' ? (
        <div style={{ marginTop: 11, background: p.primarySoft, border: `1px solid ${p.border}`, borderRadius: 14, padding: 16, maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: p.primary, color: p.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="zap" size={16} color={p.onPrimary} /></div>
            <div style={{ fontWeight: 700, color: p.text, fontSize: 14 }}>{t('rate.title')}</div>
          </div>
          <p style={{ fontSize: 13, color: p.text2, lineHeight: 1.5, margin: '0 0 13px' }}>{t('rate.sub')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => ctx.openGate(null)} style={{ background: p.primary, color: p.onPrimary, border: 'none', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('btn.signup')}</button>
            <button onClick={() => ctx.openGate(null)} style={{ background: p.raised, color: p.text, border: `1px solid ${p.border2}`, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('btn.login')}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChatScreen({ ctx }: { ctx: Ctx }) {
  const { p, t, lang, messages, isStreaming, currentTool, sendText } = ctx;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const showEmpty = messages.length === 0 && !isStreaming;
  const lastText = messages.length > 0 ? messages[messages.length - 1].text : '';
  const showThinking = isStreaming && lastText === '';

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div ref={scrollRef} className="rt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 16px 14px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {showEmpty ? (
            <div style={{ animation: 'rtFade .5s ease both', padding: '10px 2px 4px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: p.primarySoft, color: p.primary, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', padding: '7px 13px', borderRadius: 9999, marginBottom: 18 }}>
                <Icon name="sparkles" size={15} color={p.primary} /> {t('eyebrow')}
              </div>
              <h1 style={{ fontSize: 27, fontWeight: 800, color: p.text, lineHeight: 1.13, letterSpacing: '-.025em', margin: '0 0 12px', maxWidth: 560 }}>{t('empty.title')}</h1>
              <p style={{ color: p.text2, fontSize: 15, lineHeight: 1.55, maxWidth: 460, margin: 0 }}>{t('empty.sub')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
                {SUGGESTIONS[lang].map((s) => (
                  <button key={s} onClick={() => sendText(s)} style={{ textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: 46, padding: '12px 15px', border: `1px solid ${p.border}`, background: p.raised, color: p.text, borderRadius: 12, fontSize: 13.5, lineHeight: 1.3, cursor: 'pointer', boxShadow: p.shadow }}>
                    <Icon name="search" size={15} color={p.primary} /> {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 18, animation: 'rtFade .35s ease both' }}>
              {m.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '84%', background: p.userBub, color: p.onPrimary, padding: '11px 16px', borderRadius: '18px 18px 5px 18px', fontSize: 14.5, lineHeight: 1.5, boxShadow: p.shadow }}>{m.text}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 'none', width: 30, height: 30, borderRadius: 10, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Icon name="sparkles" size={16} color={p.primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.text ? (
                      <div style={{ background: p.asstBub, border: `1px solid ${p.border}`, color: p.text, padding: '12px 16px', borderRadius: '5px 18px 18px 18px', fontSize: 14.5, lineHeight: 1.55, boxShadow: p.shadow }}><Markdown text={m.text} color={p.primary} onInternalLink={ctx.navigate} /></div>
                    ) : null}
                    <AssistantBlocks ctx={ctx} m={m} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {showThinking ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', animation: 'rtFade .3s ease both', marginBottom: 10 }}>
              <div style={{ flex: 'none', width: 30, height: 30, borderRadius: 10, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'rtPulse 1.4s infinite' }}>
                <Icon name="sparkles" size={16} color={p.primary} />
              </div>
              <div style={{ background: p.asstBub, border: `1px solid ${p.border}`, borderRadius: '5px 16px 16px 16px', padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: p.shadow }}>
                <ThinkingDots p={p} />
                <span style={{ fontSize: 13.5, color: p.text2, fontWeight: 500 }}>{currentTool ? t('thinking.search') : t('thinking.text')}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Composer ctx={ctx} />
    </div>
  );
}

function Composer({ ctx }: { ctx: Ctx }) {
  const { p, t, draft, setDraft, send } = ctx;
  const onKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };
  const ghost = (icon: string, on: boolean, title: string) => (
    <button
      type="button" disabled={!on} title={title} aria-label={title}
      style={{ flex: 'none', width: 38, height: 38, borderRadius: 11, border: `1px solid ${p.border}`, background: p.raised, color: p.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.45 }}
    >
      <Icon name={icon} size={17} color={p.muted} />
    </button>
  );
  return (
    <div style={{ flex: 'none', borderTop: `1px solid ${p.border}`, background: p.header, padding: '12px 16px 14px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: p.raised, border: `1px solid ${p.border2}`, borderRadius: 16, padding: '5px 5px 5px 15px', boxShadow: p.shadow }}>
          {ghost('paperclip', FEATURES.imageAttach, t('composer.image_off'))}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={t('placeholder.input')}
            rows={1}
            style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: p.text, fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.4, maxHeight: 96, padding: '9px 0' }}
          />
          {ghost('mic', FEATURES.voice, t('composer.voice_off'))}
          <button onClick={send} aria-label={t('btn.send')} style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, border: 'none', background: p.primary, color: p.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="send" size={18} color={p.onPrimary} />
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: p.muted, marginTop: 8 }}>{t('lang.hint')}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── listing detail ─────────────────────────── */

function ListingDetail({ ctx, card }: { ctx: Ctx; card: ListingCard }) {
  const { p, t, lang, isFav, toggleFav, back, openGate } = ctx;
  const fav = isFav(card.id, card.source);
  const photos = card.photos && card.photos.length > 0 ? card.photos : (card.photoUrl ? [card.photoUrl] : []);
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [card.id]);
  const hasMany = photos.length > 1;
  const mainPhoto = photos[idx] ?? card.photoUrl;
  const prevImg = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const nextImg = () => setIdx((i) => (i + 1) % photos.length);
  const navBtn = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)',
    width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
  });
  const specChip = (icon: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: p.raised, border: `1px solid ${p.border}`, borderRadius: 11, padding: '9px 13px' }}>
      <Icon name={icon} size={16} color={p.primary} /><span style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>{label}</span>
    </div>
  );
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: p.bg }}>
      <div style={{ flex: 'none', background: p.header, borderBottom: `1px solid ${p.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={back} aria-label="back" style={{ flex: 'none', width: 38, height: 38, borderRadius: 10, border: `1px solid ${p.border}`, background: p.raised, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="arrowLeft" size={18} color={p.text} /></button>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 700, color: p.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
      </div>

      <div className="rt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 24 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', background: p.raised2, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.muted }}><Icon name="building" size={56} stroke={1.4} /></div>
            {mainPhoto ? <img src={mainPhoto} alt={card.title} style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
            {card.isExternal ? (
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 5, background: p.extBg, color: p.extText, fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 9 }}>
                <Icon name="globe" size={13} stroke={2.2} /> {t('badge.external')}
              </div>
            ) : null}
            {hasMany ? (
              <>
                <button onClick={prevImg} aria-label="prev" style={navBtn('left')}><Icon name="chevronLeft" size={18} color="#0f172a" stroke={2.2} /></button>
                <button onClick={nextImg} aria-label="next" style={navBtn('right')}><Icon name="chevronRight" size={18} color="#0f172a" stroke={2.2} /></button>
              </>
            ) : null}
          </div>
          {hasMany ? (
            <div className="rt-scroll" style={{ display: 'flex', gap: 8, padding: '11px 16px', overflowX: 'auto' }}>
              {photos.map((src, i) => (
                <div key={i} onClick={() => setIdx(i)} style={{ flex: 'none', width: 72, height: 52, borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === idx ? p.primary : 'transparent'}`, background: p.raised2 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ padding: '8px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: p.text, letterSpacing: '-.02em' }}>{formatPrice(card, lang)}</div>
              <button onClick={() => toggleFav(card)} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 11, border: `1px solid ${p.border2}`, background: p.raised, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: fav ? p.primary : p.text }}>
                <Icon name="heart" size={17} filled={fav} color={fav ? p.primary : p.text} /> {fav ? t('btn.favorited') : t('btn.favorite')}
              </button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: p.text, marginTop: 8 }}>{card.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: p.text2, fontSize: 14, marginTop: 7 }}><Icon name="mapPin" size={15} color={p.text2} /> {locationLine(card)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 15 }}>
              {specChip('building', propertyTypeLabel(card, lang))}
              {card.rooms ? specChip('grid', roomsLabel(card.rooms, lang)) : null}
              {card.area ? specChip('maximize', `${card.area} m²`) : null}
            </div>
            {card.isExternal && card.sourceSite ? (
              <div style={{ marginTop: 16, fontSize: 13, color: p.text2 }}>
                {t('detail.source')}: <strong style={{ color: p.text }}>{card.sourceSite}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ flex: 'none', background: p.header, borderTop: `1px solid ${p.border}`, padding: '12px 16px', display: 'flex', gap: 10 }}>
        <button onClick={() => openGate(card)} style={{ flex: 1, background: p.primary, color: p.onPrimary, border: 'none', padding: 13, borderRadius: 12, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="message" size={18} color={p.onPrimary} /> {t('btn.contact')}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── favorites ─────────────────────────── */

function FavoritesScreen({ ctx }: { ctx: Ctx }) {
  const { p, t, lang, favorites, favCount, isFav, toggleFav, openListing, back, newChat } = ctx;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: p.bg }}>
      <div style={{ flex: 'none', background: p.header, borderBottom: `1px solid ${p.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={back} aria-label="back" style={{ flex: 'none', width: 38, height: 38, borderRadius: 10, border: `1px solid ${p.border}`, background: p.raised, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="arrowLeft" size={18} color={p.text} /></button>
        <div style={{ flex: 1, fontWeight: 700, color: p.text, fontSize: 16 }}>{t('nav.favorites')}</div>
        <span style={{ fontSize: 13, color: p.text2, fontWeight: 600 }}>{favCount}</span>
      </div>
      <div className="rt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {favCount === 0 ? (
          <div style={{ height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon name="heart" size={32} color={p.primary} stroke={1.8} /></div>
            <div style={{ fontWeight: 700, color: p.text, fontSize: 17 }}>{t('fav.empty_title')}</div>
            <p style={{ fontSize: 14, color: p.text2, lineHeight: 1.55, maxWidth: 320, margin: '8px 0 20px' }}>{t('fav.empty_sub')}</p>
            <button onClick={newChat} style={{ background: p.primary, color: p.onPrimary, border: 'none', padding: '11px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('btn.start_search')}</button>
          </div>
        ) : (
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '18px 16px 30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 }}>
            {favorites.map((c) => (
              <ListingCardView key={`${c.source}:${c.id}`} card={c} p={p} lang={lang} t={t} fav={isFav(c.id, c.source)} onOpen={() => openListing(c)} onFav={() => toggleFav(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── conversations ─────────────────────────── */

function ConversationsScreen({ ctx }: { ctx: Ctx }) {
  const { p, t, lang, newChat, back, conversationId, openPastConversation } = ctx;
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    listConversations()
      .then((list) => { if (alive) setItems(list); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'ro-RO', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: p.bg }}>
      <div style={{ flex: 'none', background: p.header, borderBottom: `1px solid ${p.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={back} aria-label="back" style={{ flex: 'none', width: 38, height: 38, borderRadius: 10, border: `1px solid ${p.border}`, background: p.raised, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="arrowLeft" size={18} color={p.text} /></button>
        <div style={{ flex: 1, fontWeight: 700, color: p.text, fontSize: 16 }}>{t('nav.conversations')}</div>
      </div>
      <div className="rt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px 16px 30px' }}>
          <button onClick={newChat} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, background: p.primarySoft, border: `1px dashed ${p.primary}`, color: p.primary, padding: '14px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
            <Icon name="plus" size={20} color={p.primary} /> {t('btn.new_chat')}
          </button>
          {items && items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((c) => {
                const active = c.id === conversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => openPastConversation(c.id)}
                    style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: 13, background: active ? p.primarySoft : p.raised, border: `1px solid ${active ? p.primary : p.border}`, padding: '14px 15px', borderRadius: 14, cursor: 'pointer', boxShadow: p.shadow }}
                  >
                    <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: p.raised2, color: p.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="message" size={19} color={p.text2} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: p.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || t('convos.untitled')}</div>
                      <div style={{ fontSize: 12, color: p.muted, marginTop: 3 }}>{fmtDate(c.lastActivityAt)} · {c.messageCount} {t('convos.messages')}</div>
                    </div>
                    <Icon name="chevronRight" size={17} color={p.muted} />
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: p.text2, textAlign: 'center', padding: '24px 0' }}>{t('convos.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── contact gate ─────────────────────────── */

function ContactGate({ ctx, phase, listing, onClose }: { ctx: Ctx; phase: 'gate' | 'chat'; listing: ListingCard | null; onClose: () => void }) {
  const { p, t } = ctx;
  const agencyName = listing?.sourceSite ?? 'REALTIX';
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(2,6,23,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'rtFade .25s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} className="rt-scroll" style={{ width: '100%', maxWidth: 480, background: p.raised, borderRadius: '24px 24px 0 0', boxShadow: '0 -20px 60px rgba(2,6,23,.4)', padding: '8px 22px 26px', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ width: 44, height: 5, borderRadius: 9999, background: p.border2, margin: '8px auto 18px' }} />
        {phase === 'gate' ? (
          <>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon name="shield" size={27} color={p.primary} /></div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: p.text, lineHeight: 1.2, margin: '0 0 9px' }}>{t('gate.title')}</h2>
            <p style={{ fontSize: 14, color: p.text2, lineHeight: 1.6, margin: '0 0 14px' }}>{t('gate.sub')}</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: p.primarySoft, border: `1px solid ${p.border}`, borderRadius: 13, padding: '13px 14px', marginBottom: 20 }}>
              <Icon name="lock" size={18} color={p.primary} style={{ flex: 'none', marginTop: 1 }} />
              <span style={{ fontSize: 13, color: p.text2, lineHeight: 1.5 }}>{t('gate.note')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Auth REAL (întoarcere la /assistant). După login, „Contactează" merge direct în canal. */}
              <a href={ASSISTANT_REGISTER_URL} style={{ width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', background: p.primary, color: p.onPrimary, border: 'none', padding: 14, borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('btn.signup')}</a>
              <a href={ASSISTANT_LOGIN_URL} style={{ width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', background: p.raised, color: p.text, border: `1px solid ${p.border2}`, padding: 14, borderRadius: 13, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t('btn.login')}</a>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingBottom: 14, borderBottom: `1px solid ${p.border}`, marginBottom: 14 }}>
              <div style={{ flex: 'none', width: 42, height: 42, borderRadius: 12, background: p.primarySoft, color: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="building" size={20} color={p.primary} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: p.text, fontSize: 15 }}>{t('gate.chat_title')}</div>
                <div style={{ fontSize: 12, color: p.text2 }}>{agencyName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', fontSize: 12, color: p.muted, marginBottom: 16 }}><Icon name="lock" size={13} color={p.muted} /> {t('gate.chat_note')}</div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, background: p.raised2, color: p.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="user" size={16} color={p.text2} /></div>
              <div style={{ background: p.raised2, border: `1px solid ${p.border}`, color: p.text, padding: '11px 14px', borderRadius: '5px 14px 14px 14px', fontSize: 13.5, lineHeight: 1.5, maxWidth: '88%' }}>{t('gate.agent_msg')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: p.bg, border: `1px solid ${p.border2}`, borderRadius: 14, padding: '5px 5px 5px 14px', opacity: 0.85 }}>
              <span style={{ flex: 1, color: p.muted, fontSize: 14, padding: '9px 0' }}>{t('gate.reply_ph')}</span>
              <div style={{ flex: 'none', width: 38, height: 38, borderRadius: 11, background: p.primary, color: p.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={17} color={p.onPrimary} /></div>
            </div>
            <button onClick={onClose} style={{ width: '100%', marginTop: 16, background: 'transparent', color: p.text2, border: 'none', padding: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('btn.close')}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── root ─────────────────────────────── */

const KEYFRAMES = `
@keyframes rtDot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
@keyframes rtFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes rtPulse{0%,100%{opacity:.55}50%{opacity:1}}
.rt-scroll::-webkit-scrollbar{width:9px;height:9px}
.rt-scroll::-webkit-scrollbar-thumb{background:rgba(148,163,184,.45);border-radius:9px;border:2px solid transparent;background-clip:content-box}
`;

type View = 'chat' | 'listing' | 'favorites' | 'conversations';

export interface AssistantAppProps {
  initialLanguage?: Language;
  initialTheme?: 'light' | 'dark';
  /** temă controlată din afară (ex. global ThemeProvider). Dacă lipsește, urmează sistemul. */
  theme?: 'light' | 'dark';
  /** transport injectabil (implicit `chatTransport`); folosit în teste */
  transport?: ChatTransport;
  /** utilizatorul autentificat (din Inertia auth.user); null/absent = anonim */
  authUser?: { id: number } | null;
  /** navigare SPA (ex. Inertia router.visit) pentru link-uri interne; opțional */
  navigate?: (href: string) => void;
}

/** Rutele reale de auth, cu întoarcere la /assistant după succes. */
export const ASSISTANT_LOGIN_URL = '/assistant/login';
export const ASSISTANT_REGISTER_URL = '/assistant/register';

export default function AssistantApp({ initialLanguage, initialTheme, theme: controlledTheme, transport, authUser, navigate }: AssistantAppProps = {}) {
  const authenticated = !!authUser;
  const { language, setLanguage, toggle: toggleLang, t: rawT } = useLanguage();
  const { favorites, count: favCount, isFavorite, toggle: toggleFav } = useFavorites();
  const { messages, isStreaming, currentTool, quota, conversationId, sendMessage, loadConversation, reset } = useChatStream(language, transport);

  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(initialTheme ?? 'light');
  const [view, setView] = useState<View>('chat');
  const [activeListing, setActiveListing] = useState<ListingCard | null>(null);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [gateOpen, setGateOpen] = useState(false);
  const [gatePhase, setGatePhase] = useState<'gate' | 'chat'>('gate');
  const [gateListing, setGateListing] = useState<ListingCard | null>(null);
  const [quotaDismissed, setQuotaDismissed] = useState(false);

  // limba inițială (o singură dată)
  useEffect(() => {
    if (initialLanguage) setLanguage(initialLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // urmează tema sistemului dacă nu s-a impus una (controlată sau inițială)
  useEffect(() => {
    if (initialTheme || controlledTheme) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setInternalTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setInternalTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [initialTheme, controlledTheme]);

  const theme = controlledTheme ?? internalTheme;
  const p = theme === 'dark' ? DARK : LIGHT;
  const t = useMemo(() => (k: TranslationKey) => rawT(k), [rawT]);

  const sendText = (text: string) => {
    setView('chat');
    setQuotaDismissed(false); // o căutare nouă poate reafișa paywall-ul
    void sendMessage(text);
  };
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendText(text);
  };

  const ctx: Ctx = {
    p, authenticated, navigate, lang: language, t, toggleLang, setLang: setLanguage,
    favCount, isFav: isFavorite, toggleFav, favorites,
    messages, isStreaming, currentTool,
    draft, setDraft, send, sendText,
    expanded,
    toggleExpand: (id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    newChat: () => { reset(); setExpanded(new Set()); setView('chat'); },
    openFavorites: () => setView('favorites'),
    openConversations: () => setView('conversations'),
    conversationId,
    openPastConversation: (id) => { void loadConversation(id); setExpanded(new Set()); setView('chat'); },
    openListing: (c) => { setActiveListing(c); setView('listing'); },
    back: () => setView('chat'),
    // Autentificat → direct în canalul intern; anonim → poarta cu login/register.
    openGate: (c) => { setGateListing(c); setGatePhase(authenticated ? 'chat' : 'gate'); setGateOpen(true); },
  };

  const vars: Record<string, string> = {
    '--pageBg': p.pageBg, '--bg': p.bg, '--raised': p.raised, '--text': p.text, '--muted': p.muted,
  };

  return (
    <div style={{ ...(vars as unknown as CSSProperties), height: '100vh', background: p.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header ctx={ctx} />
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {view === 'chat' ? <ChatScreen ctx={ctx} /> : null}
          {view === 'listing' && activeListing ? <ListingDetail ctx={ctx} card={activeListing} /> : null}
          {view === 'favorites' ? <FavoritesScreen ctx={ctx} /> : null}
          {view === 'conversations' ? <ConversationsScreen ctx={ctx} /> : null}
        </div>
        {gateOpen ? (
          <ContactGate
            ctx={ctx} phase={gatePhase} listing={gateListing}
            onClose={() => { setGateOpen(false); setGatePhase('gate'); }}
          />
        ) : null}
        {quota?.exceeded && !quotaDismissed ? (
          <QuotaPaywall ctx={ctx} onClose={() => setQuotaDismissed(true)} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Paywall pentru cota de rezultate gratuite (TZ §4.10). Fără Stripe încă —
 * butonul principal e un placeholder (logica de plată vine separat).
 */
function QuotaPaywall({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { p, t } = ctx;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ width: '100%', maxWidth: 440, background: p.bg, borderRadius: 18, boxShadow: p.shadow, border: `1px solid ${p.border}`, padding: '26px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700, color: p.text }}>{t('paywall.title')}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: p.text2 }}>{t('paywall.sub')}</p>
        {/* Auth REAL. Cumpărarea de limită (Stripe) vine separat; aici doar
            ducem userul spre cont — după login rămâne pe paywall cu balanța la zi. */}
        <a
          href={ASSISTANT_REGISTER_URL}
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', textDecoration: 'none', background: p.primary, color: p.onPrimary, border: 'none', padding: '12px 16px', borderRadius: 12, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
        >
          {t('paywall.cta')}
        </a>
        <button
          onClick={onClose}
          style={{ marginTop: 10, width: '100%', background: 'transparent', color: p.text2, border: 'none', padding: '8px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('paywall.dismiss')}
        </button>
      </div>
    </div>
  );
}
