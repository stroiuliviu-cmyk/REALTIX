import AppLayout from '@/Layouts/AppLayout';
import PhoneInteractionModal from '@/Components/PhoneInteractionModal';
import LastInteractionHint from '@/Components/LastInteractionHint';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Combobox from '@/Components/Combobox';
import MultiCombobox from '@/Components/MultiCombobox';
import { RAIOANE, MOLDOVA_LOCATIONS, localitiesForRaion } from '@/lib/moldovaLocations';
import {
    Camera, MapPin, Calendar, Phone, Star, Plus, Check,
    Image as ImageIcon, Building2, User, ExternalLink,
    RefreshCw, Globe, X as XIcon, SlidersHorizontal,
} from 'lucide-react';
import { getTypeLabel, getTransactionLabel, TYPE_OPTIONS } from '@/lib/propertyLabels';
import { contextualFiltersForTypes } from '@/lib/propertyFilters';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const SOURCE_LABELS = {
    '999md':          '999.md',
    'imobiliare_md':  'Imobiliare.md',
    'piata':          'Piata.md',
};

const OWNER_LABELS = { owner: 'Proprietar', agency: 'Agenție' };

// Type/transaction labels centralized in @/lib/propertyLabels (imported below).

// AI valuation chip — only 'cheap' and 'expensive' surface; 'average' is the
// neutral default and adds no visual signal.
const AI_VALUATION_BADGE = {
    cheap:     { label: 'Sub piață',   class: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    expensive: { label: 'Peste piață', class: 'bg-amber-50 text-amber-700 border-amber-100' },
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
                    className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <input
                    type="number" value={maxVal}
                    onChange={e => onMax(e.target.value)}
                    onBlur={onApply} onKeyDown={e => e.key === 'Enter' && onApply()}
                    placeholder="Max"
                    className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
    const propLabel = getTypeLabel(l.type) || 'Imobil';
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
        <article className={`bg-white border border-slate-200/70 rounded-xl shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-300/70 transition-all duration-200 mb-3 md:flex ${isImported ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative w-full h-[200px] md:w-[200px] md:h-auto md:shrink-0 bg-slate-100">
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
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-white">
                            #{l.id}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {SOURCE_LABELS[l.source] ?? l.source}
                        </span>
                        {l.owner_type && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                isAgency
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {isAgency ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {OWNER_LABELS[l.owner_type] ?? l.owner_type}
                            </span>
                        )}
                        {l.transaction_type && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {getTransactionLabel(l.transaction_type)}
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
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${aiBadge.class}`}>
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
                        className={`w-8 h-8 border rounded-lg flex items-center justify-center transition-colors ${
                            isFavorite
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
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
                        className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => !isImported && onImport(l.id)}
                        disabled={isImported}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            isImported
                                ? 'bg-slate-100 text-slate-500 cursor-default'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
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
    raion: '', localities: [], sectors: [],
    price_min: '', price_max: '', area_min: '', area_max: '',
    rooms: [],
    floor_min: '', floor_max: '', floors_total_min: '', floors_total_max: '',
    ai_valuation: '', date_from: '', date_to: '', favorite: false, sort: '',
};

const RAION_OPTIONS = RAIOANE.map(r => ({ value: r, label: r }));

export default function Index({ listings, filters = {}, favoriteIds = [], importedIds = [], counts = {}, districts = [], cities = [] }) {

    const [f, setF] = useState({
        ...EMPTY,
        ...filters,
        sources:     Array.isArray(filters.sources)     ? filters.sources     : [],
        owner_types: Array.isArray(filters.owner_types) ? filters.owner_types : [],
        types:       Array.isArray(filters.types)       ? filters.types       : [],
        rooms:       Array.isArray(filters.rooms)       ? filters.rooms       : [],
        localities:  Array.isArray(filters.localities)  ? filters.localities  : [],
        sectors:     Array.isArray(filters.sectors)     ? filters.sectors     : [],
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
        // `raion` filters scraped_listings.raion exactly server-side, so we
        // just pass the string through — no cities[] expansion needed.
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

    const ctxFilters = contextualFiltersForTypes(f.types);

    const activeCount = [
        f.sources.length, f.owner_types.length, f.types.length,
        f.transaction_type, f.raion, f.localities.length, f.sectors.length,
        f.price_min, f.price_max, f.area_min, f.area_max,
        f.rooms.length,
        f.floor_min, f.floor_max, f.floors_total_min, f.floors_total_max,
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
                    <div className="rounded-2xl lg:bg-white border border-transparent lg:border-slate-200/70 lg:shadow-sm p-5 space-y-5 lg:sticky lg:top-6 lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)]">
                        {filterOpen && (
                            <button onClick={() => setFilterOpen(false)} className="lg:hidden ml-auto block p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close filters">
                                <XIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 text-sm inline-flex items-center gap-2">
                                Filtre
                                {activeCount > 0 && (
                                    <span className="text-[11px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-md">{activeCount}</span>
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                            options={[['owner', 'Proprietar'], ['agency', 'Agenție']]}
                            values={f.owner_types}
                            onChange={v => set('owner_types', v)}
                            counts={counts.by_owner ?? {}}
                        />

                        <CheckGroup
                            label="Tip proprietate"
                            options={TYPE_OPTIONS.map(o => [o.value, o.label])}
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
                                        className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors flex flex-col items-center gap-0.5 ${
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

                        {/* Raion (single) → Localități/Sectoare (MULTI-select).
                            Raion filters exactly on `raion` column; localities/sectors
                            restrict further inside the raion. Sectors only exposed for
                            raions whose catalog entry declares them. */}
                        <div className="space-y-2">
                            <div>
                                <SideLabel>Raion / Municipiu</SideLabel>
                                <Combobox
                                    value={f.raion}
                                    onChange={v => setF(s => ({ ...s, raion: v, localities: [], sectors: [] }))}
                                    onCommit={() => push({ ...f, localities: [], sectors: [] })}
                                    options={RAION_OPTIONS}
                                    placeholder="Ex: Chișinău mun."
                                />
                            </div>

                            {(() => {
                                const raionSectors = MOLDOVA_LOCATIONS[f.raion]?.sectors ?? [];
                                const hasSectors   = raionSectors.length > 0;

                                const localityOptions = !f.raion
                                    ? []
                                    : hasSectors
                                        ? [
                                            ...raionSectors.map(s => ({ value: `sec::${s}`, label: s, sub: 'Sector' })),
                                            ...localitiesForRaion(f.raion).map(l => ({ value: `loc::${l}`, label: l, sub: 'Localitate' })),
                                          ]
                                        : localitiesForRaion(f.raion).map(l => ({ value: `loc::${l}`, label: l }));

                                // Project current state into the prefixed value-space the
                                // dropdown uses so checkmarks stay in sync.
                                const selectedKeys = [
                                    ...f.localities.map(v => `loc::${v}`),
                                    ...f.sectors.map(v => `sec::${v}`),
                                ];

                                const onSelectionChange = (keys) => {
                                    const next = {
                                        ...f,
                                        localities: keys.filter(k => k.startsWith('loc::')).map(k => k.slice(5)),
                                        sectors:    keys.filter(k => k.startsWith('sec::')).map(k => k.slice(5)),
                                    };
                                    setF(next);
                                    push(next);
                                };

                                return (
                                    <div>
                                        <SideLabel>Localitate / Sector</SideLabel>
                                        <MultiCombobox
                                            values={selectedKeys}
                                            onChange={onSelectionChange}
                                            options={localityOptions}
                                            disabled={!f.raion}
                                            placeholder={f.raion ? (hasSectors ? 'Bifează una sau mai multe…' : 'Bifează localități…') : 'Alege întâi raionul'}
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

                        {/* Contextual filters — appear based on the selected property types
                            (e.g. "Teren" hides everything; "Casă" shows rooms + floors_total). */}
                        {ctxFilters.includes('rooms') && (
                            <div>
                                <SideLabel>Camere</SideLabel>
                                <div className="flex gap-1">
                                    {['1','2','3','4','5+'].map(r => {
                                        const active = f.rooms.includes(r);
                                        return (
                                            <button
                                                key={r}
                                                onClick={() => set('rooms', active ? f.rooms.filter(x => x !== r) : [...f.rooms, r])}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-xl transition-colors ${
                                                    active
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                                }`}
                                            >{r}</button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {ctxFilters.includes('floor') && (
                            <RangeRow
                                label="Etaj"
                                minVal={f.floor_min} maxVal={f.floor_max}
                                onMin={v => setF(s => ({ ...s, floor_min: v }))}
                                onMax={v => setF(s => ({ ...s, floor_max: v }))}
                                onApply={() => push(f)}
                            />
                        )}

                        {ctxFilters.includes('floors_total') && (
                            <RangeRow
                                label="Nr. etaje clădire"
                                minVal={f.floors_total_min} maxVal={f.floors_total_max}
                                onMin={v => setF(s => ({ ...s, floors_total_min: v }))}
                                onMax={v => setF(s => ({ ...s, floors_total_max: v }))}
                                onApply={() => push(f)}
                            />
                        )}

                        {/* Date filter — range picker */}
                        <div>
                            <SideLabel>Dată publicare</SideLabel>
                            <div className="space-y-1.5">
                                <input
                                    type="date"
                                    value={f.date_from}
                                    max={f.date_to || undefined}
                                    onChange={e => set('date_from', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="date"
                                    value={f.date_to}
                                    min={f.date_from || undefined}
                                    onChange={e => set('date_to', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                                        className={`w-full text-left text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors ${
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
                                    f.favorite ? 'bg-amber-500 border-amber-500' : 'border-slate-300 hover:border-amber-400'
                                }`}
                            >
                                {f.favorite && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                            </div>
                            <span className="text-sm text-slate-700 inline-flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
                                Doar favorite
                            </span>
                        </label>

                        <button
                            onClick={reset}
                            className="w-full rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors py-2 text-sm font-semibold text-slate-700"
                        >Resetează filtrele</button>
                    </div>
                </aside>

                {/* ─── MAIN ──────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-3">

                    {/* Top bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-white rounded-xl border border-slate-200/70 shadow-sm px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                type="button"
                                onClick={() => setFilterOpen(true)}
                                className="lg:hidden shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-2 text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filtre
                                {activeCount > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] font-semibold px-1.5 rounded-md">{activeCount}</span>
                                )}
                            </button>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Web Oferte</h2>
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
                                    <span title={new Date(counts.last_synced).toLocaleString('ro-RO')} className="inline-flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" />
                                        ultima sincronizare {new Date(counts.last_synced).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-semibold px-3 py-2 transition-colors"
                                title="Reîncarcă lista"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Reîmprospătează
                            </button>
                            <select
                                value={f.sort}
                                onChange={e => set('sort', e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-16 text-center">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 mx-auto mb-4 flex items-center justify-center">
                                <Globe className="w-7 h-7" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nicio ofertă web disponibilă</h3>
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        link.active
                                            ? 'bg-blue-600 text-white shadow-sm'
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
