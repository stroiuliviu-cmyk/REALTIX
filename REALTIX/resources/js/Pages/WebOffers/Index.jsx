import AppLayout from '@/Layouts/AppLayout';
import PhoneInteractionModal from '@/Components/PhoneInteractionModal';
import LastInteractionHint from '@/Components/LastInteractionHint';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { MOLDOVA_LOCALITIES, CHISINAU_DISTRICTS } from '@/Constants/moldova';
import Combobox from '@/Components/Combobox';
import {
    Camera, MapPin, Calendar, Phone, Star, Plus, Check,
    Image as ImageIcon, Building2, User, ExternalLink,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const SOURCE_LABELS = {
    '999md':          '999.md',
    'imobiliare_md':  'Imobiliare.md',
    'piata':          'Piata.md',
};

const OWNER_LABELS = { owner: 'Proprietar', agency: 'Agenție' };

const TYPE_LABELS  = { apartment: 'Apartament', house: 'Casă', commercial: 'Comercial', land: 'Teren' };
const TRANS_LABELS = { sale: 'Vânzare', rent: 'Chirie', inchiriere_zilnica: 'Zilnică', new_build: 'Constr. nouă' };

// AI valuation chip — only 'cheap' and 'expensive' surface; 'average' is the
// neutral default and adds no visual signal.
const AI_VALUATION_BADGE = {
    cheap:     { label: 'Sub piață',   class: 'bg-green-50 text-green-700 border-green-200' },
    expensive: { label: 'Peste piață', class: 'bg-amber-50 text-amber-700 border-amber-200' },
};


/* ─── Sidebar helpers ───────────────────────────────────────────────────── */
function SideLabel({ children }) {
    return <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{children}</div>;
}

function CheckGroup({ label, options, values, onChange, counts = {} }) {
    return (
        <div>
            <SideLabel>{label}</SideLabel>
            <div className="space-y-2">
                {options.map(([v, l]) => {
                    const checked = values.includes(v);
                    const count = counts[v];
                    return (
                        <label key={v} className="flex items-center gap-2 cursor-pointer group">
                            <div
                                onClick={() => onChange(checked ? values.filter(x => x !== v) : [...values, v])}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                                }`}
                            >
                                {checked && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                            </div>
                            <span className="text-sm text-slate-700 flex-1">{l}</span>
                            {count != null && (
                                <span className="text-xs text-slate-400 font-mono">
                                    {count.toLocaleString('ro')}
                                </span>
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

function RangeRow({ label, minVal, maxVal, onMin, onMax, onApply }) {
    return (
        <div>
            <SideLabel>{label}</SideLabel>
            <div className="flex gap-2">
                <input
                    type="number" value={minVal}
                    onChange={e => onMin(e.target.value)}
                    onBlur={onApply} onKeyDown={e => e.key === 'Enter' && onApply()}
                    placeholder="Min"
                    className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                    type="number" value={maxVal}
                    onChange={e => onMax(e.target.value)}
                    onBlur={onApply} onKeyDown={e => e.key === 'Enter' && onApply()}
                    placeholder="Max"
                    className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>
        </div>
    );
}

/* ─── Listing row ───────────────────────────────────────────────────────── */
// Resolve image: local relative path → /storage/, remote http(s) URL → as-is
function resolveImg(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `/storage/${path}`;
}

function ListingRow({ l, isFavorite, isImported, onFav, onImport, onShowContact, lastHint }) {
    const imgUrl   = resolveImg(l.images?.[0]);
    const imgCount = Array.isArray(l.images) ? l.images.length : 0;

    // Reconstruct title from fields — scraped titles often duplicate location
    // (e.g. "Apartament, Centru, Comrat, Comrat"). Sourcing from typed columns
    // keeps the card consistent and prevents that bug surface.
    const propLabel = TYPE_LABELS[l.type] ?? 'Imobil';
    const roomsLabel = l.rooms != null
        ? `${l.rooms} ${l.rooms === 1 ? 'cameră' : (l.rooms < 5 ? 'camere' : 'de camere')}`
        : null;
    const areaLabel  = l.area ? `${l.area} m²` : null;
    const floorLabel = l.floor != null
        ? `etaj ${l.floor}${l.floors_total ? `/${l.floors_total}` : ''}`
        : null;
    const titleString = [propLabel, roomsLabel, areaLabel, floorLabel].filter(Boolean).join(' · ');

    const location = [l.city, l.district].filter(Boolean).join(', ');
    const isAgency = l.owner_type === 'agency';

    const pricePerSqm = l.price_per_m2
        ?? (l.price && l.area > 0 ? Math.round(l.price / l.area) : null);
    const priceUnit = l.transaction_type === 'inchiriere_zilnica' ? 'zi'
                    : l.transaction_type === 'rent'               ? 'lună'
                    : null;
    const aiBadge = AI_VALUATION_BADGE[l.ai_valuation];

    const pubDate = l.published_at
        ? new Date(l.published_at).toLocaleDateString('ro', { day: 'numeric', month: 'short' })
        : null;

    return (
        <article className={`bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors mb-3 md:flex ${isImported ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative w-full h-50 md:w-50 md:h-auto md:shrink-0 bg-slate-100">
                {imgUrl ? (
                    <img src={imgUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                )}
                {imgCount > 0 && (
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {imgCount}
                    </span>
                )}
                {l.external_url && (
                    <a
                        href={l.external_url} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white rounded flex items-center justify-center text-slate-600"
                        aria-label="Vezi pe sursă" title="Vezi pe sursă"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 p-3 md:p-4 flex flex-col justify-between gap-2.5">
                <div>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {SOURCE_LABELS[l.source] ?? l.source}
                        </span>
                        {l.owner_type && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 border ${
                                isAgency
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                                {isAgency ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {OWNER_LABELS[l.owner_type] ?? l.owner_type}
                            </span>
                        )}
                        {l.transaction_type && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {TRANS_LABELS[l.transaction_type] ?? l.transaction_type}
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-medium leading-snug text-slate-900">
                        {titleString}
                    </h3>
                </div>
                <div>
                    <div className="flex gap-3 flex-wrap text-xs text-slate-500">
                        {location && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />{location}
                            </span>
                        )}
                        {pubDate && (
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />{pubDate}
                            </span>
                        )}
                    </div>
                    {lastHint && <LastInteractionHint hint={lastHint} />}
                </div>
            </div>

            {/* Price + actions */}
            <div className="px-3.5 py-3 flex items-center justify-between gap-2.5 border-t border-slate-200 md:border-t-0 md:border-l md:flex-col md:items-end md:justify-between md:w-45 md:shrink-0">
                <div className="text-right space-y-1">
                    <div className="text-lg font-medium leading-tight text-slate-900">
                        {l.price != null
                            ? <>{Number(l.price).toLocaleString('ro-MD')} {l.currency || '€'}{priceUnit && <span className="text-sm text-slate-500 font-normal">/{priceUnit}</span>}</>
                            : '—'
                        }
                    </div>
                    {pricePerSqm != null && (
                        <div className="text-xs text-slate-500">
                            {Number(pricePerSqm).toLocaleString('ro-MD')} €/m²
                        </div>
                    )}
                    {aiBadge && (
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${aiBadge.class}`}>
                            {aiBadge.label}
                        </span>
                    )}
                </div>
                <div className="flex gap-1.5 items-center">
                    <button
                        type="button"
                        aria-label={isFavorite ? 'Scoate din favorite' : 'Adaugă la favorite'}
                        title={isFavorite ? 'Scoate din favorite' : 'Adaugă la favorite'}
                        onClick={() => onFav(l.id)}
                        className={`w-8 h-8 border rounded flex items-center justify-center transition-colors ${
                            isFavorite
                                ? 'bg-amber-50 border-amber-300 text-amber-600'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        type="button"
                        aria-label="Arată contact"
                        title={lastHint || 'Arată contact'}
                        onClick={() => onShowContact(l.id)}
                        className="w-8 h-8 border border-slate-200 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => !isImported && onImport(l.id)}
                        disabled={isImported}
                        className={`px-3 py-1.5 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                            isImported
                                ? 'bg-slate-100 text-slate-500 cursor-default'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {isImported
                            ? <><Check className="w-3.5 h-3.5" />Adăugat</>
                            : <><Plus className="w-3.5 h-3.5" />Adaugă</>}
                    </button>
                </div>
            </div>
        </article>
    );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
const EMPTY = {
    search: '', sources: [], owner_types: [], types: [], transaction_type: '',
    city: '', district: '',
    price_min: '', price_max: '', area_min: '', area_max: '',
    ai_valuation: '', date_from: '', date_to: '', favorite: false, sort: '',
};

export default function Index({ listings, filters = {}, favoriteIds = [], importedIds = [], counts = {}, districts = [], cities = [] }) {

    const [f, setF] = useState({
        ...EMPTY,
        ...filters,
        sources:     Array.isArray(filters.sources)     ? filters.sources     : [],
        owner_types: Array.isArray(filters.owner_types) ? filters.owner_types : [],
        types:       Array.isArray(filters.types)       ? filters.types       : [],
        favorite:    !!filters.favorite,
    });

    const [localFavs,     setLocalFavs]     = useState(new Set(favoriteIds));
    const [localImported, setLocalImported] = useState(new Set(importedIds));
    const [refreshing,    setRefreshing]    = useState(false);
    const [filterOpen,    setFilterOpen]    = useState(false);
    const [activePhone,   setActivePhone]   = useState(null);
    const [hintMap,       setHintMap]       = useState({});

    useEffect(() => {
        const ids = listings.data.map(l => l.id);
        if (ids.length === 0) return;
        window.axios.get(route('phone-interactions.last-batch'), {
            params: { subject_type: 'scraped_listing', ids },
        }).then(res => setHintMap(res.data ?? {})).catch(() => {});
    }, [listings.data.map(l => l.id).join(',')]);

    const refreshHint = (id) => {
        window.axios.get(route('phone-interactions.last-batch'), {
            params: { subject_type: 'scraped_listing', ids: [id] },
        }).then(res => setHintMap(prev => ({ ...prev, ...res.data })));
    };

    const push = (updated) => {
        const params = {};
        Object.entries(updated).forEach(([k, v]) => {
            if (Array.isArray(v) ? v.length > 0 : v !== '' && v !== false) params[k] = v;
        });
        router.get(route('web-offers.index'), params, { preserveState: true, replace: true });
    };

    const set = (key, val) => { const n = { ...f, [key]: val }; setF(n); push(n); };

    const reset = () => { setF(EMPTY); router.get(route('web-offers.index'), {}, { preserveState: false }); };

    const toggleFav = (id) => {
        setLocalFavs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
        router.post(route('web-offers.favorite', id), {}, { preserveScroll: true });
    };

    const importListing = (id) => {
        setLocalImported(prev => new Set([...prev, id]));
        router.post(route('web-offers.import', id), {}, { preserveScroll: true });
    };

    const activeCount = [
        f.sources.length, f.owner_types.length, f.types.length,
        f.transaction_type, f.city, f.district,
        f.price_min, f.price_max, f.area_min, f.area_max,
        f.ai_valuation, f.date_from || f.date_to, f.favorite,
    ].filter(Boolean).length + (f.search ? 1 : 0);

    return (
        <AppLayout title="Web Oferte">
            <Head title="Web Oferte" />
            {filterOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
            )}
            <div className="flex gap-6">

                {/* ─── SIDEBAR ──────────────────────────────────────────── */}
                <aside className={`${filterOpen ? 'fixed inset-y-0 left-0 z-50 w-80 max-w-[90vw] bg-white shadow-2xl overflow-y-auto p-3' : 'hidden'} lg:flex lg:static lg:z-auto lg:w-72 lg:bg-transparent lg:shadow-none lg:p-0 lg:overflow-visible flex-col shrink-0`}>
                    <div className="rounded-4xl lg:bg-white border lg:border-slate-100 lg:shadow-xl p-5 space-y-5 lg:sticky lg:top-6 lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)]">
                        {filterOpen && (
                            <button onClick={() => setFilterOpen(false)} className="lg:hidden ml-auto block p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close filters">
                                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">
                                Filtre
                                {activeCount > 0 && (
                                    <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{activeCount}</span>
                                )}
                            </span>
                        </div>

                        {/* Search */}
                        <div>
                            <SideLabel>Caută</SideLabel>
                            <input
                                value={f.search}
                                onChange={e => setF(s => ({ ...s, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && push({ ...f, search: e.target.value })}
                                placeholder="Adresă, cuvinte cheie, telefon..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <CheckGroup
                            label="Sursă"
                            options={[
                                ['999md',         '999.md'],
                                ['imobiliare_md', 'Imobiliare.md'],
                                ['piata',         'Piata.md'],
                            ]}
                            values={f.sources}
                            onChange={v => set('sources', v)}
                            counts={counts.by_source ?? {}}
                        />

                        <CheckGroup
                            label="Tip proprietar"
                            options={[['owner', '👤 Proprietar'], ['agency', '🏢 Agenție']]}
                            values={f.owner_types}
                            onChange={v => set('owner_types', v)}
                            counts={counts.by_owner ?? {}}
                        />

                        <CheckGroup
                            label="Tip proprietate"
                            options={[['apartment','Apartament'],['house','Casă'],['commercial','Comercial'],['land','Teren']]}
                            values={f.types}
                            onChange={v => set('types', v)}
                            counts={counts.by_type ?? {}}
                        />

                        {/* Transaction type */}
                        <div>
                            <SideLabel>Tip tranzacție</SideLabel>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    ['',                   'Toate',           counts.total],
                                    ['sale',               'Vânzare',         counts.by_transaction?.sale],
                                    ['rent',               'Chirie',          counts.by_transaction?.rent],
                                    ['inchiriere_zilnica', 'Chirie zilnică',  counts.by_transaction?.inchiriere_zilnica],
                                ].map(([v, l, n]) => (
                                    <button
                                        key={v}
                                        onClick={() => set('transaction_type', f.transaction_type === v ? '' : v)}
                                        className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors flex flex-col items-center gap-0.5 ${
                                            f.transaction_type === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>{l}</span>
                                        {n != null && (
                                            <span className={`text-[10px] font-mono ${f.transaction_type === v ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {n.toLocaleString('ro')}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Raion + Sector */}
                        <div className="space-y-2">
                            <div>
                                <SideLabel>Raion</SideLabel>
                                <Combobox
                                    value={f.city}
                                    onChange={v => setF(s => ({ ...s, city: v }))}
                                    onCommit={() => push({ ...f })}
                                    options={MOLDOVA_LOCALITIES}
                                    placeholder="Ex: Chișinău"
                                />
                            </div>

                            {(() => {
                                const isChisinau = f.city.trim().toLowerCase().startsWith('chișinău')
                                                || f.city.trim().toLowerCase().startsWith('chisinau');
                                const source = isChisinau
                                    ? [
                                        ...CHISINAU_DISTRICTS,
                                        ...districts.map(d => d.district).filter(d => !CHISINAU_DISTRICTS.includes(d)),
                                      ]
                                    : districts.map(d => d.district);

                                return (
                                    <div>
                                        <SideLabel>Sector</SideLabel>
                                        <Combobox
                                            value={f.district}
                                            onChange={v => setF(s => ({ ...s, district: v }))}
                                            onCommit={() => push({ ...f })}
                                            options={source}
                                            placeholder={isChisinau ? 'Ex: Botanica' : 'Ex: Centru'}
                                        />
                                    </div>
                                );
                            })()}
                        </div>

                        <RangeRow
                            label="Preț (€)"
                            minVal={f.price_min} maxVal={f.price_max}
                            onMin={v => setF(s => ({ ...s, price_min: v }))}
                            onMax={v => setF(s => ({ ...s, price_max: v }))}
                            onApply={() => push(f)}
                        />

                        <RangeRow
                            label="Suprafață (m²)"
                            minVal={f.area_min} maxVal={f.area_max}
                            onMin={v => setF(s => ({ ...s, area_min: v }))}
                            onMax={v => setF(s => ({ ...s, area_max: v }))}
                            onApply={() => push(f)}
                        />

                        {/* Date filter — range picker */}
                        <div>
                            <SideLabel>Dată publicare</SideLabel>
                            <div className="space-y-1.5">
                                <input
                                    type="date"
                                    value={f.date_from}
                                    max={f.date_to || undefined}
                                    onChange={e => set('date_from', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="date"
                                    value={f.date_to}
                                    min={f.date_from || undefined}
                                    onChange={e => set('date_to', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                                />
                                {(f.date_from || f.date_to) && (
                                    <button
                                        onClick={() => { setF(s => ({ ...s, date_from: '', date_to: '' })); push({ ...f, date_from: '', date_to: '' }); }}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                                    >Șterge intervalul</button>
                                )}
                            </div>
                        </div>

                        {/* AI valuation */}
                        <div>
                            <SideLabel>Evaluare AI</SideLabel>
                            <div className="space-y-1.5">
                                {[['', 'Toate'], ['cheap', '↓ Avantajoase'], ['average', '≈ Medii'], ['expensive', '↑ Scumpe']].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => set('ai_valuation', f.ai_valuation === v ? '' : v)}
                                        className={`w-full text-left text-xs font-semibold py-1.5 px-3 rounded-xl transition-colors ${
                                            f.ai_valuation === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >{l}</button>
                                ))}
                            </div>
                        </div>

                        {/* Favorite only */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div
                                onClick={() => set('favorite', !f.favorite)}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    f.favorite ? 'bg-amber-400 border-amber-400' : 'border-slate-300 hover:border-amber-400'
                                }`}
                            >
                                {f.favorite && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                            </div>
                            <span className="text-sm text-slate-700">⭐ Doar favorite</span>
                        </label>

                        <button
                            onClick={reset}
                            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition-colors py-2.5 text-sm font-semibold text-white"
                        >Resetează filtrele</button>
                    </div>
                </aside>

                {/* ─── MAIN ──────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-3">

                    {/* Top bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-white rounded-3xl sm:rounded-4xl border border-slate-100 shadow-xl px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                type="button"
                                onClick={() => setFilterOpen(true)}
                                className="lg:hidden shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-2 text-sm font-bold text-slate-700 flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filtre
                                {activeCount > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{activeCount}</span>
                                )}
                            </button>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">Web Oferte</h2>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>
                                    <strong className="text-slate-700">{listings.total.toLocaleString('ro')}</strong> rezultate filtrate
                                    {counts.total != null && counts.total !== listings.total && (
                                        <> din <strong className="text-slate-700">{counts.total.toLocaleString('ro')}</strong> total</>
                                    )}
                                </span>
                                {counts.last_synced && (
                                    <span className="text-slate-300">·</span>
                                )}
                                {counts.last_synced && (
                                    <span title={new Date(counts.last_synced).toLocaleString('ro-RO')}>
                                        🔄 ultima sincronizare {new Date(counts.last_synced).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </p>
                        </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    setRefreshing(true);
                                    router.reload({
                                        preserveScroll: true,
                                        onFinish: () => setRefreshing(false),
                                    });
                                }}
                                disabled={refreshing}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-semibold px-3 py-2 transition-colors"
                                title="Reîncarcă lista"
                            >
                                <span className={refreshing ? 'animate-spin inline-block' : ''}>🔄</span>
                                Reîmprospătează
                            </button>
                            <select
                                value={f.sort}
                                onChange={e => set('sort', e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="">Sortare: Recente</option>
                                <option value="price_asc">Preț ↑</option>
                                <option value="price_desc">Preț ↓</option>
                                <option value="cheap_first">Cele mai avantajoase</option>
                            </select>
                        </div>
                    </div>

                    {/* List */}
                    {listings.data.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-16 text-center">
                            <div className="text-5xl mb-4">🌐</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nicio ofertă web disponibilă</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                Platforma REALTIX poate importa automat anunțuri din surse externe conectate.
                                Configurează integrarea din <strong>Setări → Integrări</strong>.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {listings.data.map(l => (
                                <ListingRow
                                    key={l.id}
                                    l={l}
                                    isFavorite={localFavs.has(l.id)}
                                    isImported={localImported.has(l.id)}
                                    onFav={toggleFav}
                                    onImport={importListing}
                                    onShowContact={setActivePhone}
                                    lastHint={hintMap[l.id]}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {listings.last_page > 1 && (
                        <div className="flex justify-center items-center gap-1.5 flex-wrap pt-2">
                            {listings.links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                        link.active
                                            ? 'bg-slate-900 text-white'
                                            : link.url
                                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            : 'opacity-30 cursor-default'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {activePhone !== null && (
                <PhoneInteractionModal
                    subjectType="scraped_listing"
                    subjectId={activePhone}
                    mode="modal"
                    mandatory
                    onClose={() => setActivePhone(null)}
                    onLogged={() => refreshHint(activePhone)}
                />
            )}
        </AppLayout>
    );
}
