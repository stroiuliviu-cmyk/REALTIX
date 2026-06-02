/* ============================================================================
   Welcome — REALTIX marketing landing (Găsește · Estimează · Vinde).
   Adapted from the design-system source bundle in ds-landing/:
     - ui_kits/marketing/ui.jsx          (Icon, Wordmark, ThemeToggle)
     - ui_kits/marketing/anim.jsx        (Reveal, CountUp, useInView)
     - ui_kits/marketing/LandingParts.jsx (ProductPreview, DealVisual, AIVisual,
                                           RichFooter, WinDots)
     - Landing.jsx                       (page composition + sections)
   Repackaged for Inertia + Vite: ES imports, components inlined, buttons
   routed to /login and /register. CSS animations live in resources/css/app.css
   (rt-reveal, rt-hero-*, rt-float, rt-band).
   ============================================================================ */
import { useState, useRef, useEffect } from 'react';
import { Head as InertiaHead, Link, router, usePage } from '@inertiajs/react';

/* ============================================================================
   Icon set (Lucide-derived SVG paths, currentColor)
   ============================================================================ */
const ICON_PATHS = {
    home:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    building:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    globe:   '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
    plus:    '<path d="M5 12h14"/><path d="M12 5v14"/>',
    send:    '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    file:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    users:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:    '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    search:  '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell:    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    trending:'<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    chart:   '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    phone:   '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    grid:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    banknote:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
    sparkles:'<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    shield:  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    lock:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    zap:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    clock:   '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    arrowright:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check:   '<path d="M20 6 9 17l-5-5"/>',
    copy:    '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon:    '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};

function Icon({ name, size = 20, sw = 2, className = '', style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
            className={className} style={style}
            dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }} />
    );
}

/* ============================================================================
   Wordmark + Badge primitives
   ============================================================================ */
function Wordmark({ dark = true, size = 18 }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon name="home" size={size + 6} sw={2.25} className={dark ? 'text-blue-500' : 'text-blue-600'} />
            <span
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, letterSpacing: '0.16em', fontSize: size }}
                className={dark ? 'text-white' : 'text-[#0b1a4a]'}
            >REALTIX</span>
        </div>
    );
}

const BADGE = {
    cheap:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
    average:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15',
    expensive:'bg-red-50 text-red-700 ring-1 ring-red-600/15',
};
function Badge({ tone = 'cheap', children, dot = false }) {
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${BADGE[tone] || BADGE.cheap}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
            {children}
        </span>
    );
}

/* ============================================================================
   ThemeToggle — uses the same 'rt-theme' localStorage key + 'dark' class on
   <html> as Components/ui/ThemeProvider, so toggling here stays in sync with
   the rest of the app on subsequent navigation.
   ============================================================================ */
function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('rt-theme', t); } catch (e) { /* ignore */ }
}
function ThemeToggle({ className = '' }) {
    const [theme, setTheme] = useState(() =>
        (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light'
    );
    const toggle = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); applyTheme(next); };
    return (
        <button onClick={toggle} aria-label="Comută tema"
            className={`w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors ${className}`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
    );
}

/* LangSwitcher — POST /language/{lang} cu preserveState; pill-toggle, light/dark aware. */
function LangSwitcher() {
    const { locale } = usePage().props;
    const langs = ['ro', 'ru'];
    const activeIndex = langs.indexOf(locale);
    const switchLanguage = (lang) => router.post(`/language/${lang}`, {}, { preserveState: true });
    return (
        <div className="hidden sm:flex relative text-xs font-bold bg-slate-100 rounded-xl p-1">
            <span className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
                style={{
                    width: `calc((100% - 8px) / ${langs.length})`,
                    left: '4px',
                    transform: `translateX(calc(${activeIndex} * 100%))`,
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: activeIndex < 0 ? 0 : 1,
                }} />
            {langs.map((lang) => (
                <button key={lang} onClick={() => switchLanguage(lang)}
                    className={`relative z-10 flex-1 px-2.5 py-1 rounded-lg uppercase transition-colors duration-200 ${locale === lang ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
                    {lang}
                </button>
            ))}
        </div>
    );
}

/* ============================================================================
   Scroll-reveal + count-up animation primitives.
   Single shared scroll/resize/rAF watcher via getBoundingClientRect — works
   reliably across embeds where IntersectionObserver may not fire on mount.
   Respects prefers-reduced-motion.
   ============================================================================ */
const __reduceMotion = typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const __watchers = new Set();
let __ticking = false;
function __check() {
    __ticking = false;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    __watchers.forEach((w) => {
        const el = w.ref.current;
        if (!el) { __watchers.delete(w); return; }
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) { w.cb(); __watchers.delete(w); }
    });
}
function __schedule() {
    if (__ticking) return;
    __ticking = true;
    requestAnimationFrame(__check);
}
if (typeof window !== 'undefined') {
    window.addEventListener('scroll', __schedule, { passive: true });
    window.addEventListener('resize', __schedule);
}

function useInView() {
    const ref = useRef(null);
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        if (__reduceMotion) { setSeen(true); return; }
        const w = { ref, cb: () => setSeen(true) };
        __watchers.add(w);
        __schedule();
        const t = setTimeout(__schedule, 120); // re-check after layout/fonts settle
        return () => { __watchers.delete(w); clearTimeout(t); };
    }, []);
    return [ref, seen];
}

function Reveal({ children, delay = 0, y = 26, className = '', style = {} }) {
    const [ref, seen] = useInView();
    return (
        <div ref={ref}
            className={`rt-reveal ${seen ? 'rt-in' : ''} ${className}`}
            style={{ '--rt-y': `${y}px`, transitionDelay: `${delay}ms`, ...style }}>
            {children}
        </div>
    );
}

function CountUp({ to, dur = 1500, decimals = 0, prefix = '', suffix = '', sep = '' }) {
    const [ref, seen] = useInView();
    const [val, setVal] = useState(__reduceMotion ? to : 0);
    useEffect(() => {
        if (!seen || __reduceMotion) return;
        let raf;
        const t0 = performance.now();
        const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [seen]);
    const fmt = (n) => {
        let s = n.toFixed(decimals);
        if (sep) {
            const parts = s.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
            s = parts.join('.');
        }
        return s;
    };
    return <span ref={ref}>{prefix}{fmt(val)}{suffix}</span>;
}

/* ============================================================================
   Window-chrome dots + landing visuals (ProductPreview, DealVisual, AIVisual)
   ============================================================================ */
function WinDots() {
    return (
        <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        </div>
    );
}

const HERO_KPIS = [
    ['building', 'Anunțuri în bază',     '7',      '7 active'],
    ['globe',    'Anunțuri unice piață', '3.533',  'surse externe'],
    ['refresh',  'Tranzacții / lună',    '12',     'conversie 18%'],
    ['banknote', 'Venit / lună',         '€8.4K',  '+12%'],
];
const HERO_DEALS = [
    ['Apartament 2 camere, Centru',  '€62.000',  'cheap',   'Avantajos −14%'],
    ['Casă cu grădină, Telecentru',  '€145.000', 'average', 'Mediu'],
    ['Studio modern, Botanica',      '€39.500',  'cheap',   'Avantajos −9%'],
];

function ProductPreview() {
    return (
        <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[32px] opacity-70"
                style={{ background: 'radial-gradient(60% 60% at 60% 30%, rgba(37,99,235,.18), transparent 70%)' }} />

            <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden shadow-[0_30px_70px_-20px_rgba(15,23,42,.35)]">
                <div className="flex items-center justify-between px-4 h-11 border-b border-slate-200/70 bg-white">
                    <div className="flex items-center gap-3">
                        <WinDots />
                        <div className="flex items-center gap-1.5 pl-1">
                            <Icon name="home" size={15} className="text-blue-600" sw={2.4} />
                            <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, letterSpacing: '0.14em', fontSize: 11 }} className="text-[#0b1a4a]">REALTIX</span>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-slate-400">
                        <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 h-7 text-[11px] text-slate-400"><Icon name="search" size={12} />Caută anunț…</div>
                        <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center"><Icon name="bell" size={13} /></span>
                        <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">RM</span>
                    </div>
                </div>

                <div className="p-4 bg-slate-50">
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap leading-none mb-1">Bine ai revenit</div>
                            <div className="text-base font-bold text-slate-900 leading-none" style={{ fontFamily: 'Montserrat,sans-serif' }}>Roman <span className="text-slate-400 font-semibold text-xs">· Lux Imobil</span></div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold px-3 h-7">
                            <Icon name="plus" size={12} sw={2.5} /> Anunț nou
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {HERO_KPIS.map(([ic, l, v, t]) => (
                            <div key={l} className="rounded-xl bg-white border border-slate-200/70 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><Icon name={ic} size={14} /></span>
                                    <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[88px] text-right">{t}</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900 tabular-nums mt-2 leading-none">{v}</div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate uppercase tracking-wide">{l}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-2.5 rounded-xl bg-white border border-slate-200/70 overflow-hidden">
                        <div className="flex items-center justify-between px-3.5 h-9 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Icon name="sparkles" size={13} className="text-blue-600" />Recomandări AI</span>
                            <span className="text-[10px] font-semibold text-blue-600 inline-flex items-center gap-0.5">Vezi toate<Icon name="arrowright" size={11} /></span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {HERO_DEALS.map(([t, price, tone, label]) => (
                                <div key={t} className="flex items-center gap-3 px-3.5 py-2.5">
                                    <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center shrink-0"><Icon name="building" size={17} sw={1.5} /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-slate-900 truncate">{t}</div>
                                        <div className="mt-1"><Badge tone={tone}>{label}</Badge></div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 tabular-nums shrink-0">{price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute -right-4 -bottom-5 sm:-right-7 hidden sm:block rt-float">
                <div className="rounded-xl bg-white border border-slate-200/70 shadow-[0_20px_44px_-12px_rgba(15,23,42,.32)] px-3.5 py-2.5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Icon name="sparkles" size={15} /></span>
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 leading-none">Estimare AI</div>
                        <div className="text-sm font-bold text-slate-900 leading-tight mt-0.5">€72.000 <span className="text-emerald-600 text-[11px] font-bold">· −14% sub piață</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DealVisual() {
    const [ref, seen] = useInView();
    return (
        <div className="relative" ref={ref}>
            <div className="absolute -inset-5 -z-10 rounded-[28px] opacity-60"
                style={{ background: 'radial-gradient(60% 60% at 40% 30%, rgba(37,99,235,.16), transparent 70%)' }} />
            <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden shadow-[0_24px_60px_-20px_rgba(15,23,42,.30)]">
                <div className="flex items-center justify-between px-4 h-11 border-b border-slate-200/70">
                    <div className="flex items-center gap-2"><WinDots /><span className="text-xs font-bold text-slate-700 ml-1">Exemplu de ofertă</span></div>
                    <Badge tone="cheap" dot>Avantajos</Badge>
                </div>
                <div className="p-5 bg-slate-50">
                    <div className="flex gap-3.5 items-center">
                        <span className="w-14 h-14 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center shrink-0"><Icon name="building" size={26} sw={1.5} /></span>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">Apartament 2 camere, zona centrală</div>
                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
                                <span>68 m²</span><span>·</span><span>5/9 etaj</span><span>·</span><span>cu reparație</span><span>·</span><span className="text-emerald-600 font-semibold">proprietar</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preț proprietar</div>
                            <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5 leading-none">62 000 €</div>
                        </div>
                        <div className="rounded-xl bg-blue-600 p-3.5 text-white">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-blue-100 flex items-center gap-1"><Icon name="sparkles" size={11} />Estimare AI</div>
                            <div className="text-2xl font-bold tabular-nums mt-1.5 leading-none">72 000 €</div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-white border border-slate-200/70 p-3.5">
                        <div className="flex items-center justify-between text-[11px] mb-2">
                            <span className="font-semibold text-slate-500">Preț față de piață</span>
                            <span className="font-bold text-emerald-600">−14%</span>
                        </div>
                        <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-[width] duration-[1100ms] ease-out"
                                style={{ width: seen ? '86%' : '0%' }} />
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-500">Avantaj estimat</span>
                            <span className="text-base font-bold text-emerald-600 tabular-nums">≈ 10 000 €</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const AI_STYLES = ['Scurt', 'Detaliat', 'Oficial', 'Emoțional'];
function AIVisual() {
    return (
        <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[28px] opacity-60"
                style={{ background: 'radial-gradient(60% 60% at 60% 30%, rgba(37,99,235,.16), transparent 70%)' }} />
            <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden shadow-[0_24px_60px_-20px_rgba(15,23,42,.30)]">
                <div className="flex items-center justify-between px-4 h-11 border-b border-slate-200/70">
                    <div className="flex items-center gap-2"><WinDots /><span className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Icon name="sparkles" size={13} className="text-blue-600" />Descriere AI</span></div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">RO</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">RU</span>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                        {AI_STYLES.map((s, i) => (
                            <span key={s} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${i === 1 ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{s}</span>
                        ))}
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5"><Icon name="sparkles" size={11} className="text-blue-600" />Generat de AI</div>
                        <p className="text-xs text-slate-600 leading-relaxed">Apartament luminos cu 2 camere în inima orașului, 68 m², complet renovat. Bucătărie utilată, etaj intermediar, vecinătate liniștită la pași de parc. Ideal pentru un cuplu sau ca investiție sigură.</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">Estimare AI</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-md px-2 py-0.5 ring-1 ring-amber-600/15">Ridicat · +21%</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-xl font-bold text-slate-900 tabular-nums leading-none">€55.000 – €70.000</div>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: '78%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   Footer
   ============================================================================ */
function RichFooter() {
    const linkCls = 'text-sm text-slate-500 hover:text-blue-600 transition-colors cursor-pointer';
    return (
        <footer className="bg-white border-t border-slate-200/70">
            <div className="mx-auto max-w-7xl px-6 py-14">
                <div className="grid gap-10 lg:grid-cols-[2fr_1fr] items-start">
                    <div className="max-w-md">
                        <Wordmark dark={false} size={18} />
                        <p className="text-sm text-slate-500 mt-4 leading-relaxed">Anunțuri, clienți, estimare AI și autopostare — într-o singură platformă. <span className="text-slate-400">realtix.eu</span></p>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Companie</div>
                        <ul className="space-y-2.5">
                            <li>
                                <a className={`${linkCls} inline-flex items-center gap-1.5`} href="tel:060963509">
                                    <Icon name="phone" size={14} className="text-slate-400" />
                                    060 963 509
                                </a>
                            </li>
                            <li><Link className={linkCls} href="/terms">Termeni</Link></li>
                            <li><Link className={linkCls} href="/privacy">Confidențialitate</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-6 border-t border-slate-200/70 flex items-center justify-between flex-wrap gap-4">
                    <span className="text-xs text-slate-400">© {new Date().getFullYear()} REALTIX. Platformă SaaS pentru agenții imobiliare.</span>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-500"><Icon name="lock" size={13} className="text-slate-400" />Plăți securizate prin Stripe</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

/* ============================================================================
   Page data (RO copy)
   ============================================================================ */
const PROBLEMS = [
    ['grid',  'Zeci de site-uri',          'Monitorizare manuală a surselor de anunțuri și comutare permanentă între tab-uri.'],
    ['copy',  'Ore pentru descrieri',      'Fiecare anunț — copy-paste-publicare. Ore de muncă în loc de un singur click.'],
    ['chart', 'Profitabilitate invizibilă','Care ofertă e cu adevărat sub piață? Fără analitică, ofertele bune ajung la concurență.'],
    ['file',  'Haos în acte',              'Contracte completate manual, greșeli în date, documente pierdute în email.'],
    ['phone', 'Mereu pe drum',             'Agentul e mereu în mișcare — incomod să noteze, să sune și să țină evidența clienților.'],
];

const STEPS = [
    { n: '01', ic: 'search', t: 'Găsește', d: 'Colectare automată a anunțurilor din internet, 24/7.',
      pts: ['Filtru «doar proprietari»', 'Anunțuri noi înaintea concurenței', '3.533 anunțuri unice în bază'] },
    { n: '02', ic: 'trending', t: 'Estimează', d: 'Estimator AI al prețului de piață, în timp real.',
      pts: ['Comparație cu baza și piața live', 'Etichete: Avantajos / Mediu / Ridicat', 'Top oferte profitabile pe prima pagină'] },
    { n: '03', ic: 'send', t: 'Vinde', d: 'De la anunț la contract, fără rutină manuală.',
      pts: ['Descriere AI — 4 stiluri, RO + RU', 'Autopostare + contracte gata', 'CRM integrat și calendar'] },
];

const FEATURES = [
    ['send',     'Autopostare',         'Un click — anunțul publicat. Sincronizare, watermark și retragere instantanee.', '999.md disponibil'],
    ['file',     'Contracte',           'Bibliotecă de șabloane RO / RU. Datele din CRM se completează automat. PDF / DOCX.', null],
    ['users',    'CRM + Calendar',      'Fișă client 360°, istoric evenimente, vizionări și notificări automate.', null],
    ['chart',    'Statistici',          '4 tab-uri: prezentare, agenți, piață, AI Insights. Export PDF și Excel.', null],
    ['phone',    'Asistent vocal AI',   'Control vocal pentru cele mai dese acțiuni — fără tastatură. RO și RU.', 'În dezvoltare'],
    ['shield',   'Ecosistem complet',   'Bănci, evaluatori, acte cadastrale și notari — totul într-un singur flux.', 'În dezvoltare'],
];

const RESULTS = [
    { ic: 'zap',      label: 'Eficiență',     to: 4,    suffix: '×',     decimals: 0, cap: '1 oră în Realtix = 4 ore de rutină' },
    { ic: 'banknote', label: 'Venit',         to: 1600, prefix: '€',     decimals: 0, sep: '.', cap: '1 oră / zi → venit lunar, dovedit în practică' },
    { ic: 'clock',    label: 'Viteză',        to: 1,    prefix: '< ',    suffix: ' sec', decimals: 0, cap: 'Răspuns instant — fără așteptări, fără lag' },
    { ic: 'shield',   label: 'Disponibilitate', to: 99.9, suffix: '%',  decimals: 1, cap: 'Uptime garantat, backup-uri automate' },
];

const AUDIENCE = [
    ['user',     'Agenți independenți', 'Gestionarea eficientă a portofoliului de clienți.'],
    ['users',    'Agenții imobiliare',  'Automatizarea proceselor și managementul echipei.'],
    ['building', 'Dezvoltatori',        'Promovarea ofertelor către agenți, investitori și parteneri.'],
];

const PLAN_FEATS = ['Sistem CRM', 'Catalog anunțuri', 'Asistent AI', 'Contracte PDF', 'Statistici + export'];
const PLANS = [
    { k: 'solo',   n: 'Solo',   price: '15 €', sub: 'Agenți individuali',     detail: '1 agent (doar tu)',         popular: false },
    { k: 'growth', n: 'Growth', price: '49 €', sub: 'Agenții mari',           detail: '5 agenți + 8 €/agent extra', note: '+ 8 €/agent peste 5', extra: 'Suport extins', popular: true },
    { k: 'team',   n: 'Team',   price: '49 €', sub: 'Agenții și echipe mici', detail: 'Până la 5 agenți',          popular: false },
];

/* ============================================================================
   Section heading + Spotlight + NavBar
   ============================================================================ */
function SectionHead({ eyebrow, title, sub, light = false, center = true }) {
    return (
        <div className={`${center ? 'text-center mx-auto' : ''} max-w-2xl mb-14`}>
            <Reveal><div className={`text-xs font-bold uppercase tracking-[0.14em] mb-3 ${light ? 'text-blue-300' : 'text-blue-600'}`}>{eyebrow}</div></Reveal>
            <Reveal delay={70}><h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Montserrat,sans-serif' }}>{title}</h2></Reveal>
            {sub && <Reveal delay={140}><p className={`mt-4 text-[15px] leading-relaxed ${light ? 'text-blue-100/85' : 'text-slate-500'}`}>{sub}</p></Reveal>}
        </div>
    );
}

function Spotlight({ id, eyebrow, title, body, points, visual, flip }) {
    return (
        <div id={id} className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal y={30} className={flip ? 'lg:order-2' : ''}>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</div>
                <h3 className="text-3xl sm:text-[34px] font-bold text-slate-900 mt-3 leading-tight tracking-tight" style={{ fontFamily: 'Montserrat,sans-serif' }}>{title}</h3>
                <p className="text-slate-500 mt-4 leading-relaxed text-[15px]">{body}</p>
                <ul className="mt-6 space-y-3">
                    {points.map((p) => (
                        <li key={p} className="flex items-start gap-3 text-[15px] text-slate-700 font-medium">
                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5"><Icon name="check" size={12} sw={3} /></span>{p}
                        </li>
                    ))}
                </ul>
            </Reveal>
            <Reveal delay={120} y={30} className={flip ? 'lg:order-1' : ''}>{visual}</Reveal>
        </div>
    );
}

function NavBar({ onLogin, onRegister }) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const s = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', s, { passive: true });
        return () => window.removeEventListener('scroll', s);
    }, []);
    const go = (id) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' }); };
    const link = 'text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/70 cursor-pointer';
    return (
        <header className={`rt-header fixed top-0 w-full z-50 transition-shadow ${scrolled ? 'border-b border-slate-200/70 shadow-[0_1px_20px_rgba(15,23,42,.05)]' : 'border-b border-transparent'}`} style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(16px)' }}>
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
                <Wordmark dark={false} size={19} />
                <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
                    <a className={link} onClick={() => go('cum-functioneaza')}>Cum funcționează</a>
                    <a className={link} onClick={() => go('functii')}>Funcționalități</a>
                    <a className={link} onClick={() => go('rezultate')}>Rezultate</a>
                    <a className={link} onClick={() => go('preturi')}>Prețuri</a>
                </nav>
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="hidden lg:block w-px h-6 bg-slate-200" />
                    <LangSwitcher />
                    <ThemeToggle />
                    <button onClick={onLogin} className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100/70 transition-colors">Autentificare</button>
                    <button onClick={onRegister} className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors px-5 py-2 text-white text-sm font-semibold shadow-sm">Încearcă Gratuit</button>
                </div>
            </div>
        </header>
    );
}

/* ============================================================================
   Page entry
   ============================================================================ */
export default function Welcome() {
    const onLogin    = () => router.visit('/login');
    const onRegister = () => router.visit('/register');

    return (
        <>
            <InertiaHead title="REALTIX — Găsește. Estimează. Vinde." />
            <div className="min-h-screen rt-canvas text-slate-900" style={{ fontFamily: 'Inter,sans-serif' }}>
                <NavBar onLogin={onLogin} onRegister={onRegister} />

                {/* HERO */}
                <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 px-6 overflow-hidden">
                    <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(55% 50% at 75% 0%,rgba(37,99,235,.10),transparent 70%)' }} />
                    <div className="absolute inset-0 -z-10 opacity-[0.5]" style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.045) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(70% 60% at 50% 0%,#000,transparent 80%)' }} />
                    <div className="mx-auto max-w-7xl grid lg:grid-cols-[1.05fr_1.15fr] gap-12 lg:gap-10 items-center">
                        <div className="text-center lg:text-left">
                            <div className="rt-hero-1 inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 mb-7 text-xs font-semibold text-slate-600 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Platformă SaaS pentru agenții imobiliare
                            </div>
                            <h1 className="rt-hero-2 text-[44px] sm:text-6xl lg:text-[64px] font-bold tracking-tight text-slate-900 leading-[1.02]" style={{ fontFamily: 'Montserrat,sans-serif' }}>
                                Găsește.<br />Estimează.<br /><span className="relative whitespace-nowrap text-blue-600">Vinde.<span className="absolute left-0 -bottom-1 w-full h-[7px] rounded-full bg-blue-600/15" /></span>
                            </h1>
                            <p className="rt-hero-3 mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-slate-600 leading-relaxed">Creează-ți contul personal și începe să lucrezi în doar 5 minute</p>
                            <div className="rt-hero-4 mt-9 flex justify-center lg:justify-start gap-3.5 flex-wrap">
                                <button onClick={onRegister} className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Începe gratuit — 14 zile<Icon name="arrowright" size={17} /></button>
                                <button onClick={onLogin} className="rounded-full bg-white border border-slate-200 px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">Autentifică-te</button>
                            </div>
                            <div className="rt-hero-4 mt-7 flex items-center justify-center lg:justify-start gap-5 text-sm text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-emerald-500" sw={2.5} />14 zile gratuite</span>
                                <span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-emerald-500" sw={2.5} />Configurare în 5 minute</span>
                                <span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-emerald-500" sw={2.5} />Anulare oricând</span>
                            </div>
                        </div>
                        <div className="rt-hero-5 lg:pl-4"><ProductPreview /></div>
                    </div>
                </section>

                {/* PROBLEM */}
                <section className="px-6 py-20 border-t border-slate-200/70 rt-band">
                    <div className="mx-auto max-w-6xl">
                        <SectionHead eyebrow="Problema"
                            title="Agentul imobiliar modern se îneacă în rutină"
                            sub="Zeci de site-uri, muncă manuală, oferte pierdute — toate consumă timpul care ar putea fi vânzări." />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {PROBLEMS.map(([ic, t, d], i) => (
                                <Reveal key={t} delay={i * 70}>
                                    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-6">
                                        <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4"><Icon name={ic} size={20} /></div>
                                        <h3 className="text-base font-bold text-slate-900">{t}</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{d}</p>
                                    </div>
                                </Reveal>
                            ))}
                            <Reveal delay={5 * 70}>
                                <div className="h-full rounded-2xl p-6 flex flex-col justify-center text-white" style={{ background: 'linear-gradient(140deg,#0f172a,#1e3a8a)' }}>
                                    <div className="text-sm font-semibold text-blue-200 leading-relaxed">Rezultat: mai puține tranzacții, marjă mai mică, epuizarea agenților.</div>
                                    <div className="mt-3 text-lg font-bold" style={{ fontFamily: 'Montserrat,sans-serif' }}>REALTIX schimbă asta.</div>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* SOLUTION */}
                <section id="cum-functioneaza" className="px-6 py-24">
                    <div className="mx-auto max-w-6xl">
                        <SectionHead eyebrow="Soluția"
                            title="O singură platformă în loc de zece tab-uri"
                            sub="REALTIX acoperă tot ciclul de muncă al agentului. AI face rutina — agentul vinde." />
                        <div className="grid lg:grid-cols-3 gap-5">
                            {STEPS.map((s, i) => (
                                <Reveal key={s.n} delay={i * 110}>
                                    <div className="group relative h-full rounded-2xl border border-slate-200/70 bg-white p-7 hover:border-blue-300 hover:shadow-[0_18px_44px_rgba(15,23,42,.09)] transition-all overflow-hidden">
                                        <div className="absolute -right-2 -top-3 text-[88px] font-bold text-slate-100 leading-none select-none" style={{ fontFamily: 'Montserrat,sans-serif' }}>{s.n}</div>
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5"><Icon name={s.ic} size={22} /></div>
                                            <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat,sans-serif' }}>{s.t}</h3>
                                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{s.d}</p>
                                            <ul className="mt-5 space-y-2.5">
                                                {s.pts.map((p) => (
                                                    <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-slate-700 font-medium">
                                                        <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Icon name="check" size={10} sw={3.5} /></span>{p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SPOTLIGHT 1 */}
                <section className="px-6 py-24 border-t border-slate-200/70 rt-band">
                    <Spotlight
                        eyebrow="Caracteristică cheie"
                        title="AI găsește ofertele avantajoase pentru tine"
                        body="Platforma colectează automat anunțuri din internet, calculează prețul de piață și arată exact unde poți câștiga — înaintea concurenței."
                        points={['Colectăm anunțuri din diverse surse, 24/7', 'AI compară cu baza și prețul mediu pe regiune', 'Afișăm anunțurile cu preț sub piață cu 10%+']}
                        visual={<DealVisual />} />
                </section>

                {/* SPOTLIGHT 2 */}
                <section className="px-6 py-24">
                    <Spotlight
                        flip
                        eyebrow="Crearea anunțului"
                        title="AI scrie descrierea și estimează prețul"
                        body="Completezi parametrii — în câteva secunde primești un anunț gata de publicat și un preț corect de piață, în limba dorită."
                        points={['Descrieri în RO / RU, până la 3 variante', '4 stiluri: Scurt · Detaliat · Oficial · Emoțional', 'Interval recomandat + etichetă de preț']}
                        visual={<AIVisual />} />
                </section>

                {/* FEATURES */}
                <section id="functii" className="px-6 py-24 border-t border-slate-200/70 rt-band">
                    <div className="mx-auto max-w-6xl">
                        <SectionHead eyebrow="Platformă completă"
                            title="Tot ce-i trebuie unui agent, într-un singur loc"
                            sub="De la anunț la contract și de la CRM la statistici — fără să jonglezi între zece servicii." />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {FEATURES.map(([ic, t, d, tag], i) => (
                                <Reveal key={t} delay={(i % 3) * 90}>
                                    <div className="group h-full rounded-2xl border border-slate-200/70 bg-white p-6 hover:border-blue-300 hover:shadow-[0_14px_36px_rgba(15,23,42,.08)] transition-all">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><Icon name={ic} size={22} /></div>
                                            {tag && <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${tag.includes('dezvoltare') ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15'}`}>{tag}</span>}
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">{t}</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{d}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* RESULTS — navy band */}
                <section id="rezultate" className="relative px-6 py-24 overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#2563eb 120%)' }}>
                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
                    <div className="relative mx-auto max-w-6xl">
                        <SectionHead light eyebrow="Rezultate dovedite"
                            title="Cifrele vorbesc pentru noi"
                            sub="Testat în practică de agenți reali — economie de timp și creștere de venit, măsurabile." />
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                            {RESULTS.map((r, i) => (
                                <Reveal key={r.label} delay={i * 100}>
                                    <div className="h-full rounded-2xl p-6 border border-white/15" style={{ background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(6px)' }}>
                                        <span className="w-11 h-11 rounded-xl bg-white/10 text-blue-200 flex items-center justify-center mb-4"><Icon name={r.ic} size={20} /></span>
                                        <div className="text-[11px] font-bold uppercase tracking-wide text-blue-300">{r.label}</div>
                                        <div className="text-4xl font-bold text-white tabular-nums mt-1 leading-none" style={{ fontFamily: 'Montserrat,sans-serif' }}>
                                            <CountUp to={r.to} prefix={r.prefix || ''} suffix={r.suffix || ''} decimals={r.decimals} sep={r.sep || ''} />
                                        </div>
                                        <p className="text-[13px] text-blue-100/80 mt-3 leading-relaxed">{r.cap}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                        <Reveal delay={200}><p className="text-center text-blue-100/90 mt-10 text-[15px] font-medium">Realtix nu este un instrument — este un multiplicator al timpului tău.</p></Reveal>
                    </div>
                </section>

                {/* PENTRU CINE */}
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-6xl">
                        <SectionHead eyebrow="Pentru cine"
                            title="Se adaptează la agenția ta"
                            sub="Bilingvism RO / RU, roluri și acces, subdomeniu propriu și branding — incluse." />
                        <div className="grid sm:grid-cols-3 gap-5">
                            {AUDIENCE.map(([ic, t, d], i) => (
                                <Reveal key={t} delay={i * 100}>
                                    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-7 text-center">
                                        <span className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4"><Icon name={ic} size={24} /></span>
                                        <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Montserrat,sans-serif' }}>{t}</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{d}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section id="preturi" className="px-6 py-24 rt-band border-t border-slate-200/70">
                    <div className="mx-auto max-w-6xl">
                        <SectionHead eyebrow="Planuri"
                            title="Prețuri simple, fără plăți ascunse"
                            sub="14 zile de probă · cardul se atașează la înregistrare · anulare oricând." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                            {PLANS.map((p, i) => (
                                <Reveal key={p.k} delay={i * 90}>
                                    {p.popular ? (
                                        <div className="rounded-2xl p-7 relative shadow-[0_24px_60px_-12px_rgba(37,99,235,.40)] md:-mt-3" style={{ background: 'linear-gradient(150deg,#1e3a8a,#2563eb)' }}>
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold bg-emerald-500 text-white px-3 py-1 rounded-full tracking-wide">RECOMANDAT</span>
                                            <div className="font-bold text-white text-lg">{p.n}</div>
                                            <div className="text-xs text-blue-200 mt-0.5">{p.sub}</div>
                                            <div className="flex items-end gap-1 mt-3 whitespace-nowrap"><span className="text-4xl font-bold text-white leading-none">{p.price}</span><span className="text-sm text-blue-200">/ lună</span></div>
                                            {p.note && <div className="text-xs text-blue-200 mt-1">{p.note}</div>}
                                            <div className="inline-block mt-3 text-xs font-semibold text-white bg-white/15 px-2.5 py-1 rounded-full">{p.detail}</div>
                                            <ul className="space-y-2.5 mt-6 mb-7">
                                                {PLAN_FEATS.map((f) => <li key={f} className="flex items-start gap-2 text-sm text-blue-50"><Icon name="check" size={15} className="text-emerald-300 shrink-0 mt-0.5" sw={2.5} />{f}</li>)}
                                                {p.extra && <li className="flex items-start gap-2 text-sm text-blue-50"><Icon name="check" size={15} className="text-emerald-300 shrink-0 mt-0.5" sw={2.5} />{p.extra}</li>}
                                            </ul>
                                            <button onClick={onRegister} className="w-full rounded-lg py-3 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">Alege {p.n}</button>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white border border-slate-200/70 p-7 hover:border-slate-300/80 hover:shadow-[0_14px_36px_rgba(15,23,42,.07)] transition-all">
                                            <div className="font-bold text-slate-900 text-lg">{p.n}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{p.sub}</div>
                                            <div className="flex items-end gap-1 mt-3 whitespace-nowrap"><span className="text-4xl font-bold text-slate-900 leading-none">{p.price}</span><span className="text-sm text-slate-400">/ lună</span></div>
                                            {p.note && <div className="text-xs text-slate-500 mt-1">{p.note}</div>}
                                            <div className="inline-block mt-3 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{p.detail}</div>
                                            <ul className="space-y-2.5 mt-6 mb-7">
                                                {PLAN_FEATS.map((f) => <li key={f} className="flex items-start gap-2 text-sm text-slate-600"><Icon name="check" size={15} className="text-emerald-500 shrink-0 mt-0.5" sw={2.5} />{f}</li>)}
                                                {p.extra && <li className="flex items-start gap-2 text-sm text-slate-600"><Icon name="check" size={15} className="text-emerald-500 shrink-0 mt-0.5" sw={2.5} />{p.extra}</li>}
                                            </ul>
                                            <button onClick={onRegister} className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors">Alege {p.n}</button>
                                        </div>
                                    )}
                                </Reveal>
                            ))}
                        </div>
                        <Reveal delay={120}>
                            <p className="text-center text-xs text-slate-400 mt-8 inline-flex items-center gap-1.5 w-full justify-center"><Icon name="lock" size={13} />Plată securizată prin Stripe — cel mai folosit procesator de plăți din lume</p>
                        </Reveal>
                    </div>
                </section>

                <RichFooter />
            </div>
        </>
    );
}
