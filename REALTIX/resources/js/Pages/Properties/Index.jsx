import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const statusBadge = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-500',
    sold: 'bg-blue-100 text-blue-700',
    rented: 'bg-purple-100 text-purple-700',
};

const valuationBadge = {
    cheap: 'bg-emerald-100 text-emerald-700',
    average: 'bg-amber-100 text-amber-700',
    expensive: 'bg-red-100 text-red-600',
};

const typeLabels = {
    apartment: 'Apartament', house: 'Casă', commercial: 'Comercial', land: 'Teren',
};

export default function Index({ properties, filters }) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/properties', { ...filters, search }, { preserveState: true });
    };

    return (
        <AppLayout title="Proprietăți">
            <Head title="Anunțuri" />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Bază de date Proprietăți</h2>
                        <p className="text-sm text-slate-500 mt-1">{properties.total} proprietăți</p>
                    </div>
                    <Link
                        href="/properties/create"
                        className="rounded-full bg-gradient-to-r from-slate-900 to-blue-700 px-6 py-2.5 text-white shadow-lg text-sm font-semibold"
                    >
                        + Adaugă Proprietate
                    </Link>
                </div>

                {/* Filters */}
                <form onSubmit={handleSearch} className="bg-white p-5 rounded-[2rem] shadow-2xl border border-slate-100">
                    <div className="flex flex-wrap gap-3">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după titlu..."
                            className="flex-1 min-w-[200px] rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                        />
                        <select
                            value={filters?.type ?? ''}
                            onChange={e => router.get('/properties', { ...filters, type: e.target.value }, { preserveState: true })}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                        >
                            <option value="">Toate tipurile</option>
                            {Object.entries(typeLabels).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                        <select
                            value={filters?.transaction_type ?? ''}
                            onChange={e => router.get('/properties', { ...filters, transaction_type: e.target.value }, { preserveState: true })}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                        >
                            <option value="">Vânzare + Chirie</option>
                            <option value="sale">Vânzare</option>
                            <option value="rent">Chirie</option>
                        </select>
                        <select
                            value={filters?.status ?? ''}
                            onChange={e => router.get('/properties', { ...filters, status: e.target.value }, { preserveState: true })}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                        >
                            <option value="">Toate statusurile</option>
                            <option value="active">Activ</option>
                            <option value="inactive">Inactiv</option>
                            <option value="sold">Vândut</option>
                            <option value="rented">Închiriat</option>
                        </select>
                        <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold">
                            Caută
                        </button>
                    </div>
                </form>

                {/* Table */}
                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3">Proprietate</th>
                                    <th className="px-4 py-3">Locație</th>
                                    <th className="px-4 py-3">Tip</th>
                                    <th className="px-4 py-3">Preț</th>
                                    <th className="px-4 py-3">AI</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {properties.data.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nicio proprietate. Adaugă prima!</td></tr>
                                ) : properties.data.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {p.cover_media ? (
                                                    <img
                                                        src={`/storage/${p.cover_media.thumb_path || p.cover_media.path}`}
                                                        className="w-12 h-10 object-cover rounded-xl"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div className="w-12 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🏠</div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">{p.title}</div>
                                                    {p.area_total && <div className="text-xs text-slate-400">{p.area_total} m² {p.rooms ? `• ${p.rooms} cam.` : ''}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">{p.city}{p.district ? `, ${p.district}` : ''}</td>
                                        <td className="px-4 py-4">{typeLabels[p.type] ?? p.type}</td>
                                        <td className="px-4 py-4 font-bold text-blue-700">
                                            {p.price ? `${p.currency === 'EUR' ? '€' : p.currency}${Number(p.price).toLocaleString('ro')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {p.ai_valuation ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${valuationBadge[p.ai_valuation]}`}>
                                                    {p.ai_valuation}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge[p.status]}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                <Link href={`/properties/${p.id}`} className="text-blue-700 hover:underline text-xs font-semibold">
                                                    Detalii
                                                </Link>
                                                <Link href={`/properties/${p.id}/edit`} className="text-slate-500 hover:underline text-xs">
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {properties.last_page > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            {properties.links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                        link.active ? 'bg-slate-900 text-white' :
                                        link.url ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'opacity-30'
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
