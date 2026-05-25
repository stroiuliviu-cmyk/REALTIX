import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { MOLDOVA_LOCALITIES, CHISINAU_DISTRICTS } from '@/Constants/moldova';
import Combobox from '@/Components/Combobox';
import { MapPin, Camera, Star, Image as ImageIcon } from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_COLORS = {
    active:   { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    inactive: { badge: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-400' },
    sold:     { badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    rented:   { badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
};
const STATUS_LABELS = { active: 'Activ', inactive: 'Inactiv', sold: 'Vândut', rented: 'Închiriat' };
const TYPE_LABELS   = { apartment: 'Apartament', house: 'Casă', commercial: 'Comercial', land: 'Teren' };
const TRANS_LABELS  = { sale: 'Vânzare', rent: 'Chirie', inchiriere_zilnica: 'Închiriere zilnică' };


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

/* ─── Actions dropdown ──────────────────────────────────────────────────── */
function ActionsMenu({ p, canEdit, onArchive, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const items = [
        canEdit && { icon: '✏️', label: 'Editează', action: () => router.visit(route('properties.edit', p.id)) },
        canEdit && { icon: '🗃️', label: 'Arhivează', cls: 'text-amber-600', action: () => { onArchive(p.id); setOpen(false); } },
        canEdit && { icon: '🗑️', label: 'Șterge', cls: 'text-red-500', action: () => { onDelete(p.id); setOpen(false); } },
    ].filter(Boolean);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors font-bold text-lg"
            >⋯</button>
            {open && (
                <div className="absolute right-0 top-9 z-30 w-52 rounded-2xl bg-white border border-slate-100 shadow-2xl py-1.5 overflow-hidden">
                    {items.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => { item.action(); setOpen(false); }}
                            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${item.cls ?? 'text-slate-700'}`}
                        >
                            <span>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Inline status selector ────────────────────────────────────────────── */
function StatusSelect({ propertyId, current, canEdit }) {
    const [val, setVal] = useState(current);
    const c = STATUS_COLORS[val] ?? STATUS_COLORS.inactive;

    const onChange = e => {
        const next = e.target.value;
        setVal(next);
        router.patch(route('properties.status', propertyId), { status: next }, { preserveScroll: true });
    };

    if (!canEdit) {
        return (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                {STATUS_LABELS[val] ?? val}
            </span>
        );
    }

    return (
        <select
            value={val} onChange={onChange}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${c.badge}`}
        >
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    );
}

/* ─── Property row ──────────────────────────────────────────────────────── */
function PropertyRow({ p, isFavorite, isSelected, isAdmin, authUserId, onFav, onSelect, onArchive, onDelete }) {
    const cover     = p.cover_media ? `/storage/${p.cover_media.thumb_path || p.cover_media.path}` : null;
    const canEdit   = isAdmin || p.user_id === authUserId;
    const aiEst     = p.meta?.ai_price_estimate;
    const mediaCount = p.media_count ?? p.media?.length ?? 0;

    return (
        <article className="bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors mb-3 md:flex">
            {/* Image */}
            <div className="relative w-full h-[200px] md:w-[200px] md:h-auto md:shrink-0 bg-slate-100 overflow-hidden">
                <Link href={route('properties.show', p.id)} className="block w-full h-full">
                    {cover ? (
                        <img src={cover} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-12 h-12" />
                        </div>
                    )}
                </Link>

                {/* Bulk-select checkbox — overlay top-left, visible on mobile + desktop
                    so bulk operations work in both viewports. */}
                <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    aria-label={isSelected ? 'Deselectează' : 'Selectează'}
                    className={`absolute top-2 left-2 w-6 h-6 rounded border flex items-center justify-center transition-colors shadow ${
                        isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/90 border-slate-300 hover:bg-white hover:border-blue-400'
                    }`}
                >
                    {isSelected && <span style={{ fontSize: 12 }}>✓</span>}
                </button>

                {mediaCount > 0 && (
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {mediaCount}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 p-3 md:p-4 flex flex-col justify-between gap-2.5">
                <div>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                        {p.scraped_listing_id ? (
                            <span
                                className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-800"
                                title={`Importat din ${p.source ?? 'sursă externă'} (property #${p.id})`}
                            >
                                #{p.scraped_listing_id}
                            </span>
                        ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{p.id}
                            </span>
                        )}
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-white">
                            {TYPE_LABELS[p.type] ?? p.type}
                        </span>
                        {p.transaction_type && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                p.transaction_type === 'rent' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {TRANS_LABELS[p.transaction_type] ?? p.transaction_type}
                            </span>
                        )}
                    </div>
                    <Link
                        href={route('properties.show', p.id)}
                        className="text-base font-medium leading-snug text-slate-900 hover:text-blue-700 transition-colors line-clamp-2 block"
                    >
                        {p.title}
                    </Link>
                </div>
                <div>
                    <div className="flex gap-3 flex-wrap text-xs text-slate-500">
                        {(p.city || p.district) && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {[p.city, p.district].filter(Boolean).join(' · ')}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">👁 {p.views_count ?? 0}</span>
                        <span className="inline-flex items-center gap-1">📞 {p.meta?.calls_count ?? 0}</span>
                        <span className="inline-flex items-center gap-1">🤝 {p.deals_count ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* Price + status + actions */}
            <div className="px-3.5 py-3 flex items-center justify-between gap-2.5 border-t border-slate-200 md:border-t-0 md:border-l md:flex-col md:items-end md:justify-between md:w-48 md:shrink-0">
                <div className="text-right space-y-1">
                    <div className="text-lg font-medium leading-tight text-slate-900">
                        {p.price != null
                            ? <>{Number(p.price).toLocaleString('ro-MD')} {p.currency === 'EUR' ? '€' : p.currency}</>
                            : '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                        {[p.area_total && `${p.area_total} m²`, p.rooms && `${p.rooms} cam.`].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {aiEst && (
                        <div className="text-xs text-slate-500">
                            AI ≈ <strong>{Number(aiEst).toLocaleString('ro')} €</strong>
                            {p.ai_valuation === 'cheap'     && <span className="text-emerald-600 ml-1">↓</span>}
                            {p.ai_valuation === 'expensive' && <span className="text-red-500 ml-1">↑</span>}
                        </div>
                    )}
                </div>
                <div className="flex gap-1.5 items-center">
                    <StatusSelect propertyId={p.id} current={p.status} canEdit={canEdit} />
                    <button
                        type="button"
                        onClick={() => onFav(p.id)}
                        title={isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
                        className={`w-8 h-8 border rounded flex items-center justify-center transition-colors ${
                            isFavorite
                                ? 'bg-amber-50 border-amber-300 text-amber-600'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <ActionsMenu p={p} canEdit={canEdit} onArchive={onArchive} onDelete={onDelete} />
                </div>
            </div>
        </article>
    );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
const EMPTY = {
    search: '', types: [], transaction_type: '', statuses: [],
    city: '', district: '', rooms: [],
    price_min: '', price_max: '', area_min: '', area_max: '',
    date_from: '', date_to: '', phone: '', favorite: false, sort: '',
};

export default function Index({ properties, filters = {}, isAdmin, authUserId, favoriteIds = [], cities = [], districts = [] }) {
    const [f, setF] = useState({
        ...EMPTY,
        ...filters,
        types:    Array.isArray(filters.types)    ? filters.types    : [],
        statuses: Array.isArray(filters.statuses) ? filters.statuses : [],
        favorite: !!filters.favorite,
    });
    const [selected, setSelected]   = useState([]);
    const [localFavs, setLocalFavs] = useState(new Set(favoriteIds));
    const [filterOpen, setFilterOpen] = useState(false);

    const push = (updated) => {
        const params = {};
        Object.entries(updated).forEach(([k, v]) => {
            if (Array.isArray(v) ? v.length > 0 : v !== '' && v !== false) params[k] = v;
        });
        router.get(route('properties.index'), params, { preserveState: true, replace: true });
    };

    const set = (key, val) => {
        const next = { ...f, [key]: val };
        setF(next);
        push(next);
    };

    const reset = () => { setF(EMPTY); router.get(route('properties.index'), {}, { preserveState: false }); };

    const toggleFav = (id) => {
        setLocalFavs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
        router.post(route('properties.favorite', id), {}, { preserveScroll: true });
    };

    const toggleSelect    = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleSelectAll = () => setSelected(p => p.length === properties.data.length ? [] : properties.data.map(p => p.id));

    const bulkDo = (action) => {
        if (!selected.length) return;
        if (action === 'delete' && !confirm(`Ștergi ${selected.length} anunțuri? Acțiunea este ireversibilă.`)) return;
        router.post(route('properties.bulk'), { action, ids: selected }, { onSuccess: () => setSelected([]) });
    };

    const archiveOne = (id) => router.patch(route('properties.status', id), { status: 'inactive' }, { preserveScroll: true });
    const deleteOne  = (id) => {
        if (!confirm('Ștergi acest anunț?')) return;
        router.delete(route('properties.destroy', id));
    };

    const activeCount = [
        f.types.length, f.statuses.length, f.transaction_type, f.city, f.district,
        f.rooms.length, f.price_min, f.price_max, f.area_min, f.area_max,
        f.date_from, f.date_to, f.phone, f.favorite,
    ].filter(Boolean).length + (f.search ? 1 : 0);

    return (
        <AppLayout title="Anunțuri">
            <Head title="Anunțuri" />

            {/* Mobile filter drawer overlay */}
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
                                placeholder="Adresă, titlu, #ID..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

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
                                            f.transaction_type === v
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >{l}</button>
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

                        {/* Rooms (multi-select) */}
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

                        {/* Date range */}
                        <div>
                            <SideLabel>Dată adăugare</SideLabel>
                            <div className="space-y-1.5">
                                <input
                                    type="date" value={f.date_from}
                                    onChange={e => { const n = { ...f, date_from: e.target.value }; setF(n); push(n); }}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="date" value={f.date_to}
                                    onChange={e => { const n = { ...f, date_to: e.target.value }; setF(n); push(n); }}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <CheckGroup
                            label="Status"
                            options={[['active','Activ'],['inactive','Inactiv']]}
                            values={f.statuses}
                            onChange={v => set('statuses', v)}
                        />

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

                        {/* Phone */}
                        <div>
                            <SideLabel>Telefon contact</SideLabel>
                            <input
                                value={f.phone}
                                onChange={e => setF(s => ({ ...s, phone: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && push({ ...f, phone: e.target.value })}
                                placeholder="+373 ..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Reset */}
                        <button
                            onClick={reset}
                            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition-colors py-2.5 text-sm font-semibold text-white"
                        >
                            Resetează filtrele
                        </button>
                    </div>
                </aside>

                {/* ─── MAIN ──────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-3">

                    {/* Top bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-3xl sm:rounded-4xl border border-slate-100 shadow-xl px-4 sm:px-6 py-3 sm:py-4">
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
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Anunțuri</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{properties.total} proprietăți</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <select
                                value={f.sort}
                                onChange={e => set('sort', e.target.value)}
                                className="flex-1 sm:flex-initial rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="">Sortare: Recente</option>
                                <option value="price_asc">Preț ↑</option>
                                <option value="price_desc">Preț ↓</option>
                                <option value="views">Popularitate</option>
                                <option value="deals">Tranzacții</option>
                            </select>
                            <Link
                                href={route('properties.create')}
                                className="rounded-2xl bg-slate-900 px-3 sm:px-5 py-2 sm:py-2.5 text-white text-xs sm:text-sm font-semibold hover:bg-slate-700 transition-colors whitespace-nowrap"
                            >+ <span className="hidden sm:inline">Anunț nou</span></Link>
                        </div>
                    </div>

                    {/* Bulk bar */}
                    {selected.length > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-3xl px-5 py-3">
                            <span className="text-sm font-semibold text-blue-800">{selected.length} selectate</span>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => bulkDo('activate')} className="rounded-xl bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 hover:bg-emerald-600 transition-colors">Activează</button>
                                <button onClick={() => bulkDo('archive')}  className="rounded-xl bg-amber-400 text-white text-xs font-bold px-3 py-1.5 hover:bg-amber-500 transition-colors">Arhivează</button>
                                <button onClick={() => bulkDo('delete')}   className="rounded-xl bg-red-500 text-white text-xs font-bold px-3 py-1.5 hover:bg-red-600 transition-colors">Șterge</button>
                                <button onClick={() => setSelected([])}    className="rounded-xl bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 hover:bg-slate-300 transition-colors">Anulează</button>
                            </div>
                        </div>
                    )}

                    {/* Select all */}
                    {properties.data.length > 0 && (
                        <div className="flex items-center gap-2 px-1">
                            <div
                                onClick={toggleSelectAll}
                                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                                    selected.length > 0 && selected.length === properties.data.length
                                        ? 'bg-blue-600 border-blue-600'
                                        : selected.length > 0
                                        ? 'bg-blue-200 border-blue-400'
                                        : 'border-slate-300 hover:border-blue-400'
                                }`}
                            >
                                {selected.length > 0 && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                            </div>
                            <span className="text-xs text-slate-400">Selectează toate ({properties.data.length})</span>
                        </div>
                    )}

                    {/* List */}
                    {properties.data.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-16 text-center">
                            <div className="text-5xl mb-4">🏠</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nicio proprietate</h3>
                            <p className="text-slate-500 text-sm mb-6">Adaugă primul anunț sau ajustează filtrele.</p>
                            <Link href={route('properties.create')} className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
                                + Adaugă anunț
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {properties.data.map(p => (
                                <PropertyRow
                                    key={p.id} p={p}
                                    isFavorite={localFavs.has(p.id)}
                                    isSelected={selected.includes(p.id)}
                                    isAdmin={isAdmin}
                                    authUserId={authUserId}
                                    onFav={toggleFav}
                                    onSelect={toggleSelect}
                                    onArchive={archiveOne}
                                    onDelete={deleteOne}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {properties.last_page > 1 && (
                        <div className="flex justify-center items-center gap-1.5 flex-wrap pt-2">
                            {properties.links.map((link, i) => (
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
