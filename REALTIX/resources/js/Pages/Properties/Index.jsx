import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_BADGE = {
    active:   'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-500',
    sold:     'bg-blue-100 text-blue-700',
    rented:   'bg-purple-100 text-purple-700',
};
const STATUS_LABEL = { active: 'Activ', inactive: 'Inactiv', sold: 'Vândut', rented: 'Închiriat' };

const VALUATION_BADGE = {
    cheap:     'bg-emerald-100 text-emerald-700',
    average:   'bg-amber-100 text-amber-700',
    expensive: 'bg-red-100 text-red-600',
};
const VALUATION_LABEL = { cheap: '● Avantajos', average: '● Mediu', expensive: '● Scump' };

const TYPE_LABEL = { apartment: 'Apartament', house: 'Casă', commercial: 'Comercial', land: 'Teren' };
const TRANS_LABEL = { sale: 'Vânzare', rent: 'Chirie' };

function FilterSelect({ label, value, onChange, options }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            >
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </div>
    );
}

function PropertyCard({ p }) {
    const coverUrl = p.cover_media
        ? `/storage/${p.cover_media.thumb_path || p.cover_media.path}`
        : null;

    return (
        <div className="rounded-4xl bg-white border border-slate-100 overflow-hidden hover:shadow-2xl transition-shadow group">
            {/* Photo */}
            <div className="relative h-44 bg-slate-100 overflow-hidden">
                {coverUrl ? (
                    <img src={coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🏠</div>
                )}
                {/* badges overlay */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="bg-slate-900/80 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${p.transaction_type === 'rent' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {TRANS_LABEL[p.transaction_type] ?? p.transaction_type}
                    </span>
                </div>
                {p.ai_valuation && (
                    <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-0.5 rounded-full border ${VALUATION_BADGE[p.ai_valuation]}`}>
                        {VALUATION_LABEL[p.ai_valuation]}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-4">
                <div className="font-bold text-slate-900 line-clamp-1 text-sm">{p.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                    {p.city}{p.district ? ` • ${p.district}` : ''}{p.address ? ` • ${p.address}` : ''}
                </div>

                <div className="mt-3 flex items-end justify-between">
                    <div className="text-xl font-black text-blue-700">
                        {p.price ? `${p.currency === 'EUR' ? '€' : p.currency} ${Number(p.price).toLocaleString('ro')}` : '—'}
                    </div>
                    <div className="text-xs text-slate-400 text-right">
                        {p.area_total ? `${p.area_total} m²` : ''}
                        {p.rooms ? ` • ${p.rooms} cam.` : ''}
                        {p.floor ? ` • et.${p.floor}` : ''}
                    </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span title="Vizualizări">👁 {p.views_count ?? 0}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                    <Link
                        href={`/properties/${p.id}`}
                        className="flex-1 text-center rounded-2xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                        Detalii
                    </Link>
                    <Link
                        href={`/properties/${p.id}/edit`}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        ✏
                    </Link>
                    <button className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Autopostare">
                        📤
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Index({ properties, filters = {} }) {
    const [localFilters, setLocalFilters] = useState({
        search:           filters.search ?? '',
        type:             filters.type ?? '',
        transaction_type: filters.transaction_type ?? '',
        status:           filters.status ?? '',
        city:             filters.city ?? '',
        rooms:            filters.rooms ?? '',
        price_min:        filters.price_min ?? '',
        price_max:        filters.price_max ?? '',
        ai_valuation:     filters.ai_valuation ?? '',
    });

    const apply = (overrides = {}) => {
        const merged = { ...localFilters, ...overrides };
        router.get('/properties', merged, { preserveState: true, replace: true });
    };

    const set = (key, value) => {
        const updated = { ...localFilters, [key]: value };
        setLocalFilters(updated);
        router.get('/properties', updated, { preserveState: true, replace: true });
    };

    const reset = () => {
        const empty = Object.fromEntries(Object.keys(localFilters).map(k => [k, '']));
        setLocalFilters(empty);
        router.get('/properties', {}, { preserveState: false });
    };

    return (
        <AppLayout title="Anunțuri">
            <Head title="Anunțuri" />
            <div className="flex gap-6">

                {/* ─── Left sidebar filters ─── */}
                <aside className="hidden lg:flex flex-col gap-5 w-64 shrink-0">
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-5 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm">Filtre</h3>
                            <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Resetează</button>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Caută</label>
                            <input
                                value={localFilters.search}
                                onChange={e => setLocalFilters(s => ({ ...s, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && apply()}
                                placeholder="Titlu, adresă..."
                                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <FilterSelect
                            label="Tip proprietate"
                            value={localFilters.type}
                            onChange={v => set('type', v)}
                            options={[['', 'Toate tipurile'], ['apartment', 'Apartament'], ['house', 'Casă'], ['commercial', 'Comercial'], ['land', 'Teren']]}
                        />

                        <FilterSelect
                            label="Tranzacție"
                            value={localFilters.transaction_type}
                            onChange={v => set('transaction_type', v)}
                            options={[['', 'Vânzare + Chirie'], ['sale', 'Vânzare'], ['rent', 'Chirie']]}
                        />

                        <FilterSelect
                            label="Status"
                            value={localFilters.status}
                            onChange={v => set('status', v)}
                            options={[['', 'Toate'], ['active', 'Activ'], ['inactive', 'Inactiv'], ['sold', 'Vândut'], ['rented', 'Închiriat']]}
                        />

                        <FilterSelect
                            label="Evaluare AI"
                            value={localFilters.ai_valuation}
                            onChange={v => set('ai_valuation', v)}
                            options={[['', 'Toate'], ['cheap', 'Avantajos'], ['average', 'Mediu'], ['expensive', 'Scump']]}
                        />

                        <FilterSelect
                            label="Camere"
                            value={localFilters.rooms}
                            onChange={v => set('rooms', v)}
                            options={[['', 'Oricare'], ['1', '1 cameră'], ['2', '2 camere'], ['3', '3 camere'], ['4', '4+ camere']]}
                        />

                        {/* Price range */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Preț (€)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={localFilters.price_min}
                                    onChange={e => setLocalFilters(s => ({ ...s, price_min: e.target.value }))}
                                    onBlur={() => apply()}
                                    placeholder="Min"
                                    className="w-1/2 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="number"
                                    value={localFilters.price_max}
                                    onChange={e => setLocalFilters(s => ({ ...s, price_max: e.target.value }))}
                                    onBlur={() => apply()}
                                    placeholder="Max"
                                    className="w-1/2 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => apply()}
                            className="w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
                        >
                            Aplică filtre
                        </button>
                    </div>
                </aside>

                {/* ─── Main content ─── */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Top bar */}
                    <div className="flex items-center justify-between bg-white rounded-4xl border border-slate-100 shadow-xl px-6 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Anunțuri</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{properties.total} proprietăți</p>
                        </div>
                        <Link
                            href="/properties/create"
                            className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                        >
                            + Anunț nou
                        </Link>
                    </div>

                    {/* Cards grid */}
                    {properties.data.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-16 text-center">
                            <div className="text-5xl mb-4">🏠</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nicio proprietate</h3>
                            <p className="text-slate-500 text-sm mb-6">Adaugă primul tău anunț sau ajustează filtrele.</p>
                            <Link href="/properties/create" className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
                                + Adaugă anunț
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {properties.data.map(p => <PropertyCard key={p.id} p={p} />)}
                        </div>
                    )}

                    {/* Pagination */}
                    {properties.last_page > 1 && (
                        <div className="flex justify-center gap-2">
                            {properties.links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                        link.active ? 'bg-slate-900 text-white' :
                                        link.url ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'opacity-30'
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
