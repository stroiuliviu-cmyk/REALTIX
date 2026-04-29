import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
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

function statusOf(a, now = new Date()) {
    if (a.trial_ends_at && new Date(a.trial_ends_at) > now) return { label: 'Trial', cls: 'bg-amber-100 text-amber-700' };
    if (a.subscription_ends_at && new Date(a.subscription_ends_at) > now) return { label: 'Activ', cls: 'bg-emerald-100 text-emerald-700' };
    if (a.subscription_ends_at) return { label: 'Expirat', cls: 'bg-red-100 text-red-700' };
    if (a.subscription_plan === 'starter') return { label: 'Starter', cls: 'bg-slate-100 text-slate-600' };
    return { label: 'Necunoscut', cls: 'bg-slate-100 text-slate-500' };
}

function StatCard({ label, value, accent = 'blue' }) {
    const accents = {
        blue:    'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber:   'bg-amber-50 text-amber-700',
        red:     'bg-red-50 text-red-700',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 ${accents[accent]}`}>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-2xl font-black mt-1">{value}</div>
        </div>
    );
}

export default function Subscriptions({ agencies, filters = {}, stats = {} }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (params) => {
        const merged = { ...filters, ...params };
        Object.keys(merged).forEach(k => { if (merged[k] === '' || merged[k] == null) delete merged[k]; });
        router.get('/admin/subscriptions', merged, { preserveState: true, replace: true });
    };

    return (
        <AppLayout title="Admin · Abonamente">
            <Head title="Admin · Abonamente" />

            <div className="space-y-4">

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total agenții" value={stats.total_agencies}    accent="blue" />
                    <StatCard label="Cu plan plătit" value={stats.paying_agencies}  accent="emerald" />
                    <StatCard label="În trial"      value={stats.trialing}          accent="amber" />
                    <StatCard label="Expirate"      value={stats.expired}           accent="red" />
                </div>

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

                    <select
                        value={filters.status ?? ''}
                        onChange={e => apply({ status: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Toate statusurile</option>
                        <option value="trial">În trial</option>
                        <option value="active">Activ</option>
                        <option value="expired">Expirat</option>
                    </select>

                    <span className="text-xs font-bold text-slate-500 ml-auto">{agencies.total} agenții</span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="text-left px-5 py-3">Agenție</th>
                                <th className="text-left px-5 py-3">Pachet</th>
                                <th className="text-left px-5 py-3">Status</th>
                                <th className="text-left px-5 py-3">Trial expiră</th>
                                <th className="text-left px-5 py-3">Abonament expiră</th>
                                <th className="text-center px-5 py-3">Utilizatori</th>
                                <th className="text-left px-5 py-3">Stripe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agencies.data.map(a => {
                                const s = statusOf(a);
                                return (
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
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(a.trial_ends_at)}</td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(a.subscription_ends_at)}</td>
                                        <td className="px-5 py-3 text-center font-semibold text-slate-700">{a.users_count}</td>
                                        <td className="px-5 py-3 text-xs text-slate-400 truncate max-w-40" title={a.stripe_customer_id}>
                                            {a.stripe_customer_id ?? <span className="text-slate-300">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {agencies.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        Niciun abonament.
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
        </AppLayout>
    );
}
