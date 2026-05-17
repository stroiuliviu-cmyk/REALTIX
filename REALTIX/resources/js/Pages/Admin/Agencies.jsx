import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const PLAN_LABELS = { starter: 'Starter', medium: 'Medium', pro: 'Pro' };
const PLAN_COLORS = {
    starter: 'bg-slate-100 text-slate-700',
    medium:  'bg-blue-100 text-blue-700',
    pro:     'bg-violet-100 text-violet-700',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Agencies({ agencies, filters = {} }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (params) => {
        const merged = { ...filters, ...params };
        Object.keys(merged).forEach(k => { if (merged[k] === '' || merged[k] == null) delete merged[k]; });
        router.get('/admin/agencies', merged, { preserveState: true, replace: true });
    };

    const remove = (a) => {
        if (!confirm(`Sigur ștergi agenția "${a.name}"? Asta va șterge și utilizatorii, proprietățile și datele asociate.`)) return;
        router.delete(`/admin/agencies/${a.id}`, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Admin · Agenții">
            <Head title="Admin · Agenții" />

            <div className="space-y-4">

                {/* Filters */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && apply({ search })}
                        placeholder="Caută agenție..."
                        className="flex-1 min-w-60 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />

                    <select
                        value={filters.plan ?? ''}
                        onChange={e => apply({ plan: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Toate pachetele</option>
                        <option value="starter">Starter</option>
                        <option value="medium">Medium</option>
                        <option value="pro">Pro</option>
                    </select>

                    <span className="text-xs font-bold text-slate-500 ml-auto">
                        {agencies.total} agenții
                    </span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="text-left px-5 py-3">Agenție</th>
                                <th className="text-left px-5 py-3">Pachet</th>
                                <th className="text-center px-5 py-3">Utilizatori</th>
                                <th className="text-center px-5 py-3">Proprietăți</th>
                                <th className="text-center px-5 py-3">Contacte</th>
                                <th className="text-center px-5 py-3">Tranzacții</th>
                                <th className="text-left px-5 py-3">Trial</th>
                                <th className="text-left px-5 py-3">Înregistrată</th>
                                <th className="text-right px-5 py-3">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agencies.data.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="font-semibold text-slate-900">{a.name}</div>
                                        <div className="text-xs text-slate-400">{a.slug}</div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_COLORS[a.subscription_plan] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {PLAN_LABELS[a.subscription_plan] ?? a.subscription_plan}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center font-semibold text-slate-700">{a.users_count}</td>
                                    <td className="px-5 py-3 text-center text-slate-700">{a.properties_count}</td>
                                    <td className="px-5 py-3 text-center text-slate-700">{a.contacts_count}</td>
                                    <td className="px-5 py-3 text-center text-slate-700">{a.deals_count}</td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(a.trial_ends_at)}</td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(a.created_at)}</td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <Link
                                            href={route('super-admin.agencies.show', a.id)}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2"
                                        >Detalii</Link>
                                        <button
                                            onClick={() => remove(a)}
                                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2"
                                        >Șterge</button>
                                    </td>
                                </tr>
                            ))}
                            {agencies.data.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        Nicio agenție.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {agencies.last_page > 1 && (
                    <div className="flex justify-center items-center gap-1.5 flex-wrap pt-2">
                        {agencies.links.map((link, i) => (
                            <button
                                key={i}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
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
        </SuperAdminLayout>
    );
}
