import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_COLORS = {
    active:     'bg-emerald-100 text-emerald-700',
    trialing:   'bg-blue-100 text-blue-700',
    past_due:   'bg-rose-100 text-rose-700',
    canceled:   'bg-slate-200 text-slate-600',
    unpaid:     'bg-rose-600 text-white',
    incomplete: 'bg-amber-100 text-amber-700',
};

function MetricCard({ label, value, prefix = '', suffix = '', accent = 'slate' }) {
    const palette = {
        slate:   'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        rose:    'bg-rose-50 border-rose-200',
        blue:    'bg-blue-50 border-blue-200',
    };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
                {prefix}{value.toLocaleString('ro')}{suffix}
            </div>
        </div>
    );
}

export default function Index({ subscriptions, filters, stats, planLabels }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const push = (next) => router.get(route('super-admin.billing.index'), { ...filters, ...next }, { preserveState: true, preserveScroll: true });

    const cancelSub = (agencyId, agencyName) => {
        if (!confirm(`Anulează imediat abonamentul ${agencyName}? Stripe va opri facturarea fără pro-rate.`)) return;
        router.post(route('super-admin.billing.cancel', agencyId), {}, { preserveScroll: true });
    };

    const refundLast = (agencyId, agencyName) => {
        if (!confirm(`Refund integral ultima factură plătită a ${agencyName}?`)) return;
        router.post(route('super-admin.billing.refund', agencyId), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Billing" breadcrumb="Super Admin · Stripe Billing">
            <Head title="Billing — Super Admin" />

            <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="MRR" value={stats.mrr.toFixed(0)} prefix="€" accent="emerald" />
                    <MetricCard label="ARR" value={stats.arr.toFixed(0)} prefix="€" accent="blue" />
                    <MetricCard label="Active" value={stats.active} accent="emerald" />
                    <MetricCard label="Past Due" value={stats.past_due} accent={stats.past_due > 0 ? 'rose' : 'slate'} />
                </div>

                {Object.keys(stats.mrr_by_plan ?? {}).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">MRR pe plan</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {Object.entries(stats.mrr_by_plan).map(([slug, info]) => (
                                <div key={slug} className="rounded-lg bg-slate-50 px-4 py-3">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">{planLabels[slug] ?? slug}</div>
                                    <div className="text-lg font-black text-slate-900">€{info.revenue.toFixed(0)}/lună</div>
                                    <div className="text-xs text-slate-400">{info.count} abonamente</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <form onSubmit={e => { e.preventDefault(); push({ search }); }} className="flex flex-wrap gap-2 items-center">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după agenție…"
                            className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                        <select
                            value={filters.status ?? 'all'}
                            onChange={e => push({ status: e.target.value })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        >
                            <option value="all">Toate statusurile</option>
                            <option value="active">Active</option>
                            <option value="trialing">Trialing</option>
                            <option value="past_due">Past Due</option>
                            <option value="canceled">Canceled</option>
                            <option value="incomplete">Incomplete</option>
                        </select>
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
                                    <th className="px-4 py-3">Agenție</th>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Stripe Sub</th>
                                    <th className="px-4 py-3">Trial</th>
                                    <th className="px-4 py-3">Creat</th>
                                    <th className="px-4 py-3 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscriptions.data.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Niciun abonament în acest filtru.</td></tr>
                                ) : subscriptions.data.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-900">{s.agency_name ?? `Agency #${s.agency_id}`}</td>
                                        <td className="px-4 py-3 text-slate-600">{planLabels[s.subscription_plan] ?? s.subscription_plan ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_COLORS[s.stripe_status] ?? 'bg-slate-100'}`}>
                                                {s.stripe_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.stripe_id?.substring(0, 16)}…</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                            {s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString('ro') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(s.created_at).toLocaleDateString('ro')}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <a
                                                href={`https://dashboard.stripe.com/test/subscriptions/${s.stripe_id}`}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2"
                                                title="Open in Stripe"
                                            >🔗 Stripe</a>
                                            <button
                                                onClick={() => refundLast(s.agency_id, s.agency_name)}
                                                className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-2"
                                                title="Refund last invoice"
                                            >↩ Refund</button>
                                            {['active', 'trialing', 'past_due'].includes(s.stripe_status) && (
                                                <button
                                                    onClick={() => cancelSub(s.agency_id, s.agency_name)}
                                                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2"
                                                    title="Cancel now"
                                                >✕ Cancel</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {subscriptions.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                Pagina {subscriptions.current_page} din {subscriptions.last_page} · {subscriptions.total.toLocaleString('ro')} rezultate
                            </span>
                            <div className="flex gap-1">
                                {subscriptions.links.map((l, i) => (
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
