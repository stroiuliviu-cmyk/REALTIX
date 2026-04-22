import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const AI_COLORS = {
    cheap:     { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '↓ Avantajos', dot: 'bg-emerald-500' },
    average:   { badge: 'bg-amber-100 text-amber-700 border-amber-200',       label: '≈ Mediu',     dot: 'bg-amber-400' },
    expensive: { badge: 'bg-red-100 text-red-600 border-red-200',             label: '↑ Scump',     dot: 'bg-red-500' },
};

const SOURCE_LABELS = {
    '999md':          '999.md',
    'imobiliare_md':  'Imobiliare.md',
    'piata':          'Piata.md',
};
const SOURCE_COLORS = {
    '999md':         'bg-blue-50 text-blue-700',
    'imobiliare_md': 'bg-emerald-50 text-emerald-700',
    'piata':         'bg-orange-50 text-orange-700',
};

const TYPE_LABELS  = { apartment: 'Apartament', house: 'Casă', commercial: 'Comercial', land: 'Teren' };
const TRANS_LABELS = { sale: 'Vânzare', rent: 'Chirie' };

/* ─── Sidebar helpers ───────────────────────────────────────────────────── */
function SideLabel({ children }) {
    return <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{children}</div>;
}

function CheckGroup({ label, options, values, onChange }) {
    return (
        <div>
            <SideLabel>{label}</SideLabel>
            <div className="space-y-2">
                {options.map(([v, l]) => {
                    const checked = values.includes(v);
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
                            <span className="text-sm text-slate-700">{l}</span>
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
function ListingRow({ l, isFavorite, isImported, onFav, onImport }) {
    const img  = l.images?.[0] ?? null;
    const ai   = AI_COLORS[l.ai_valuation];
    const srcLabel = SOURCE_LABELS[l.source] ?? l.source;
    const srcColor = SOURCE_COLORS[l.source] ?? 'bg-slate-100 text-slate-600';

    const pubDate = l.published_at
        ? new Date(l.published_at).toLocaleDateString('ro', { day: 'numeric', month: 'short' })
        : null;

    return (
        <div className={`group bg-white rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all px-4 py-3.5 flex items-center gap-3 ${isImported ? 'opacity-60' : ''}`}>
            {/* Photo */}
            <a href={l.external_url} target="_blank" rel="noopener" className="shrink-0">
                <div className="w-20 h-16 rounded-2xl bg-slate-100 overflow-hidden relative">
                    {img
                        ? <img src={img} alt={l.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">🏠</div>
                    }
                </div>
            </a>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${srcColor}`}>
                        {srcLabel}
                    </span>
                    {l.owner_type && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            l.owner_type === 'owner' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {l.owner_type === 'owner' ? '👤 Proprietar' : '🏢 Agenție'}
                        </span>
                    )}
                    {pubDate && <span className="text-xs text-slate-400">{pubDate}</span>}
                </div>

                <a
                    href={l.external_url} target="_blank" rel="noopener"
                    className="font-bold text-slate-900 text-sm line-clamp-1 hover:text-blue-700 transition-colors block"
                >
                    {l.title}
                </a>

                <div className="text-xs text-slate-400 truncate mb-1.5">
                    {[l.city, l.district].filter(Boolean).join(' · ')}
                </div>

                <div className="flex items-center flex-wrap gap-1.5">
                    {l.type && (
                        <span className="text-xs bg-slate-800 text-white font-semibold px-2 py-0.5 rounded-full">
                            {TYPE_LABELS[l.type] ?? l.type}
                        </span>
                    )}
                    {l.transaction_type && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            l.transaction_type === 'rent' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                            {TRANS_LABELS[l.transaction_type] ?? l.transaction_type}
                        </span>
                    )}
                    {l.rooms    && <span className="text-xs text-slate-400">{l.rooms} cam.</span>}
                    {l.area     && <span className="text-xs text-slate-400">{l.area} m²</span>}
                    {l.phone    && <span className="text-xs text-slate-400">📞 {l.phone}</span>}
                </div>
            </div>

            {/* Price + AI */}
            <div className="shrink-0 text-right min-w-28 hidden sm:block">
                <div className="text-base font-black text-blue-700">
                    {l.price
                        ? `${l.currency === 'EUR' ? '€' : (l.currency ?? '€')} ${Number(l.price).toLocaleString('ro')}`
                        : '—'
                    }
                </div>
                {ai && (
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mt-1 ${ai.badge}`}>
                        {ai.label}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-2">
                {/* Favorite */}
                <button
                    onClick={() => onFav(l.id)}
                    title={isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
                    className={`text-xl transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}
                >★</button>

                {/* External link */}
                <a
                    href={l.external_url} target="_blank" rel="noopener"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors text-base"
                    title="Deschide sursa"
                >↗</a>

                {/* Import */}
                <button
                    onClick={() => !isImported && onImport(l.id)}
                    disabled={isImported}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                        isImported
                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                    {isImported ? '✓ Adăugat' : '+ Adaugă'}
                </button>
            </div>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
const EMPTY = {
    search: '', sources: [], owner_types: [], types: [], transaction_type: '',
    city: '', district: '',
    price_min: '', price_max: '', area_min: '', area_max: '',
    ai_valuation: '', date_filter: '', favorite: false, sort: '',
};

export default function Index({ listings, filters = {}, favoriteIds = [], importedIds = [] }) {
    const { flash } = usePage().props;

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
        f.ai_valuation, f.date_filter, f.favorite,
    ].filter(Boolean).length + (f.search ? 1 : 0);

    return (
        <AppLayout title="Web Oferte">
            <Head title="Web Oferte" />
            <div className="flex gap-6">

                {/* ─── SIDEBAR ──────────────────────────────────────────── */}
                <aside className="hidden lg:flex flex-col w-72 shrink-0">
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-5 space-y-5 sticky top-6 overflow-y-auto max-h-[calc(100vh-5rem)]">
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
                        />

                        <CheckGroup
                            label="Tip proprietar"
                            options={[['owner', '👤 Proprietar'], ['agency', '🏢 Agenție']]}
                            values={f.owner_types}
                            onChange={v => set('owner_types', v)}
                        />

                        <CheckGroup
                            label="Tip proprietate"
                            options={[['apartment','Apartament'],['house','Casă'],['commercial','Comercial'],['land','Teren']]}
                            values={f.types}
                            onChange={v => set('types', v)}
                        />

                        {/* Transaction type */}
                        <div>
                            <SideLabel>Tip tranzacție</SideLabel>
                            <div className="flex gap-1.5">
                                {[['', 'Toate'], ['sale', 'Vânzare'], ['rent', 'Chirie']].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => set('transaction_type', f.transaction_type === v ? '' : v)}
                                        className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                                            f.transaction_type === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >{l}</button>
                                ))}
                            </div>
                        </div>

                        {/* City + District */}
                        <div className="space-y-2">
                            <div>
                                <SideLabel>Localitate</SideLabel>
                                <input
                                    value={f.city}
                                    onChange={e => setF(s => ({ ...s, city: e.target.value }))}
                                    onBlur={() => push(f)} onKeyDown={e => e.key === 'Enter' && push(f)}
                                    placeholder="Ex: Chișinău"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <SideLabel>Sector / Raion</SideLabel>
                                <input
                                    value={f.district}
                                    onChange={e => setF(s => ({ ...s, district: e.target.value }))}
                                    onBlur={() => push(f)} onKeyDown={e => e.key === 'Enter' && push(f)}
                                    placeholder="Ex: Centru"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
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

                        {/* Date filter */}
                        <div>
                            <SideLabel>Dată publicare</SideLabel>
                            <div className="flex gap-1.5">
                                {[['', 'Toate'], ['week', 'Săptămâna'], ['month', 'Luna']].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => set('date_filter', f.date_filter === v ? '' : v)}
                                        className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                                            f.date_filter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >{l}</button>
                                ))}
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

                    {/* Flash */}
                    {flash?.success && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800 font-semibold">
                            ✓ {flash.success}
                        </div>
                    )}

                    {/* Top bar */}
                    <div className="flex items-center justify-between bg-white rounded-4xl border border-slate-100 shadow-xl px-6 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Web Oferte</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {listings.total} anunțuri din surse externe
                            </p>
                        </div>
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

                    {/* List */}
                    {listings.data.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-16 text-center">
                            <div className="text-5xl mb-4">🌐</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nicio ofertă web</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                Scraper-ul REALTIX va colecta automat anunțuri din surse externe.
                                Configurează-l din <strong>Setări → Integrări</strong>.
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
        </AppLayout>
    );
}
