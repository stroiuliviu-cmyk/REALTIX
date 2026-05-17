import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_COLORS = {
    active:   'bg-emerald-100 text-emerald-700',
    draft:    'bg-amber-100 text-amber-700',
    inactive: 'bg-slate-100 text-slate-500',
    sold:     'bg-blue-100 text-blue-700',
    rented:   'bg-violet-100 text-violet-700',
};

const TYPE_LABELS = {
    apartment:  'Apt',
    house:      'Casă',
    commercial: 'Comerc',
    land:       'Teren',
};

function StatCard({ label, value, color = 'slate' }) {
    const accents = {
        slate:   'border-slate-200',
        rose:    'border-rose-300 bg-rose-50',
        emerald: 'border-emerald-300 bg-emerald-50',
        blue:    'border-blue-300 bg-blue-50',
    };
    return (
        <div className={`rounded-xl border ${accents[color]} px-4 py-3`}>
            <div className="text-2xl font-black text-slate-900">{value.toLocaleString('ro')}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">{label}</div>
        </div>
    );
}

export default function Index({ listings, filters, stats }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const push = (next) => router.get(route('super-admin.listings.index'), { ...filters, ...next }, { preserveState: true, preserveScroll: true });
    const set = (key, value) => push({ [key]: value });

    const changeStatus = (id, status) => {
        router.patch(route('super-admin.listings.status', id), { status }, { preserveScroll: true });
    };

    const toggleFeature = (id) => {
        router.post(route('super-admin.listings.feature', id), {}, { preserveScroll: true });
    };

    const remove = (id, title) => {
        if (!confirm(`Șterge definitiv „${title}"? Acțiunea nu poate fi anulată.`)) return;
        router.delete(route('super-admin.listings.destroy', id), { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Listings" breadcrumb="Super Admin · Listings">
            <Head title="Listings — Super Admin" />

            <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total" value={stats.total} />
                    <StatCard label="Active" value={stats.active} color="emerald" />
                    <StatCard label="Reported" value={stats.reported} color="rose" />
                    <StatCard label="Sold/Rented" value={stats.sold} color="blue" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <form
                        onSubmit={e => { e.preventDefault(); push({ search }); }}
                        className="flex flex-wrap gap-2 items-center"
                    >
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după titlu, adresă, oraș…"
                            className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                        <select
                            value={filters.status ?? ''}
                            onChange={e => set('status', e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        >
                            <option value="">Toate statusurile</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="inactive">Inactive</option>
                            <option value="sold">Sold</option>
                            <option value="rented">Rented</option>
                        </select>
                        <select
                            value={filters.type ?? ''}
                            onChange={e => set('type', e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        >
                            <option value="">Toate tipurile</option>
                            <option value="apartment">Apartament</option>
                            <option value="house">Casă</option>
                            <option value="commercial">Comercial</option>
                            <option value="land">Teren</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => set('reported', filters.reported ? '' : '1')}
                            className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                filters.reported
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                        >
                            🚩 Doar raportate
                        </button>
                        <button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-700">
                            Caută
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Titlu</th>
                                    <th className="px-4 py-3">Agenție</th>
                                    <th className="px-4 py-3">Tip</th>
                                    <th className="px-4 py-3">Preț</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Adăugat</th>
                                    <th className="px-4 py-3 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listings.data.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">Niciun anunț găsit.</td></tr>
                                ) : listings.data.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-slate-900 truncate max-w-xs">{p.title}</span>
                                                    <span className="text-xs text-slate-400 truncate max-w-xs">{p.address ?? p.city}</span>
                                                </div>
                                                {p.reports_count > 0 && (
                                                    <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                        🚩 {p.reports_count}
                                                    </span>
                                                )}
                                                {p.meta?.featured && (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                        ⭐ Featured
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">{p.agency?.name ?? '—'}</div>
                                            <div className="text-xs text-slate-400">{p.user?.name ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[p.type] ?? p.type}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                            {p.price != null ? `${Number(p.price).toLocaleString('ro')} ${p.currency}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={p.status}
                                                onChange={e => changeStatus(p.id, e.target.value)}
                                                className={`text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 ${STATUS_COLORS[p.status] ?? 'bg-slate-100'}`}
                                            >
                                                <option value="active">active</option>
                                                <option value="draft">draft</option>
                                                <option value="inactive">inactive</option>
                                                <option value="sold">sold</option>
                                                <option value="rented">rented</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(p.created_at).toLocaleDateString('ro')}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => toggleFeature(p.id)}
                                                className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-2"
                                                title="Feature / Unfeature"
                                            >⭐</button>
                                            <Link
                                                href={`/properties/${p.id}`}
                                                target="_blank"
                                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2"
                                                title="Vezi în app"
                                            >👁</Link>
                                            <button
                                                onClick={() => remove(p.id, p.title)}
                                                className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2"
                                                title="Șterge"
                                            >🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {listings.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                Pagina {listings.current_page} din {listings.last_page} · {listings.total.toLocaleString('ro')} rezultate
                            </span>
                            <div className="flex gap-1">
                                {listings.links.map((l, i) => (
                                    <button
                                        key={i}
                                        onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                                        disabled={!l.url}
                                        className={`px-2.5 py-1 rounded font-semibold ${
                                            l.active ? 'bg-slate-900 text-white' :
                                            l.url ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'opacity-30'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: l.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
