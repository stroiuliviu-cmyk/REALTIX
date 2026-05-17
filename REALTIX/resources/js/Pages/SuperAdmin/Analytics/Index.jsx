import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head } from '@inertiajs/react';

function Metric({ label, value, prefix = '', suffix = '', delta, accent = 'slate' }) {
    const accents = {
        slate:   'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        rose:    'bg-rose-50 border-rose-200',
        blue:    'bg-blue-50 border-blue-200',
        violet:  'bg-violet-50 border-violet-200',
    };
    return (
        <div className={`rounded-xl border ${accents[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
                {prefix}{typeof value === 'number' ? value.toLocaleString('ro') : value}{suffix}
            </div>
            {delta != null && (
                <div className={`text-xs font-semibold mt-1 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
                </div>
            )}
        </div>
    );
}

function MiniBars({ data, valueKey = 'total', height = 100 }) {
    if (!data || data.length === 0) {
        return <div className="text-center py-8 text-xs text-slate-400">Nu sunt date încă.</div>;
    }
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div className="flex items-end gap-1 h-[120px]">
            {data.map((d, i) => (
                <div
                    key={i}
                    className="flex-1 bg-linear-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max((d[valueKey] / max) * height, 2)}px` }}
                    title={`${d.day}: ${d[valueKey]}`}
                >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                        {d[valueKey]}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PlanPie({ distribution, labels }) {
    const entries = Object.entries(distribution);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const colors = { starter: 'bg-slate-400', medium: 'bg-blue-500', pro: 'bg-violet-500' };

    return (
        <div className="space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                {entries.map(([slug, count]) => (
                    <div
                        key={slug}
                        className={colors[slug] ?? 'bg-slate-300'}
                        style={{ width: `${(count / total) * 100}%` }}
                        title={`${labels[slug]}: ${count}`}
                    />
                ))}
            </div>
            <div className="space-y-1.5">
                {entries.map(([slug, count]) => (
                    <div key={slug} className="flex items-center gap-2 text-sm">
                        <span className={`w-3 h-3 rounded-sm ${colors[slug] ?? 'bg-slate-300'}`} />
                        <span className="font-semibold text-slate-700">{labels[slug] ?? slug}</span>
                        <span className="ml-auto text-slate-500">{count} ({((count / total) * 100).toFixed(0)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Index({ metrics, newAgenciesTrend, listingsTrend, planDistribution, topByListings, planLabels, computedAt }) {
    return (
        <SuperAdminLayout title="Analytics" breadcrumb="Super Admin · Platform Analytics">
            <Head title="Analytics — Super Admin" />

            <div className="space-y-5">
                {/* Top metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <Metric label="MRR" value={metrics.mrr.toFixed(0)} prefix="€" accent="emerald" />
                    <Metric label="ARR" value={metrics.arr.toFixed(0)} prefix="€" accent="blue" />
                    <Metric label="ARPU" value={metrics.arpu.toFixed(2)} prefix="€" accent="violet" />
                    <Metric label="LTV" value={metrics.ltv.toFixed(0)} prefix="€" accent="violet" />
                    <Metric label="Churn (30d)" value={metrics.churn_rate.toFixed(1)} suffix="%" accent={metrics.churn_rate > 5 ? 'rose' : 'slate'} />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Metric label="Active agencies" value={metrics.active_agencies} accent="emerald" />
                    <Metric label="Total agencies" value={metrics.total_agencies} />
                    <Metric label="Total users" value={metrics.total_users} />
                    <Metric label="Total listings" value={metrics.total_listings} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Agenții noi (30 zile)</h3>
                            <span className="text-xs text-slate-400">{newAgenciesTrend.length} zile cu activitate</span>
                        </div>
                        <MiniBars data={newAgenciesTrend} />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Anunțuri noi (30 zile)</h3>
                            <span className="text-xs text-slate-400">{listingsTrend.length} zile cu activitate</span>
                        </div>
                        <MiniBars data={listingsTrend} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Distribuție planuri</h3>
                        <PlanPie distribution={planDistribution} labels={planLabels} />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Top 10 agenții (după anunțuri)</h3>
                        <div className="space-y-2">
                            {topByListings.map((a, i) => (
                                <div key={a.id} className="flex items-center gap-3 text-sm">
                                    <span className="text-xs font-bold text-slate-400 w-6">#{i + 1}</span>
                                    <span className="font-semibold text-slate-800 flex-1 truncate">{a.name}</span>
                                    <span className="text-xs text-slate-400">{planLabels[a.subscription_plan] ?? a.subscription_plan}</span>
                                    <span className="font-bold text-slate-900">{a.properties_count}</span>
                                </div>
                            ))}
                            {topByListings.length === 0 && (
                                <div className="text-center py-6 text-xs text-slate-400">Nicio agenție cu anunțuri.</div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-slate-400 text-right">
                    Recalculat: {new Date(computedAt).toLocaleString('ro-RO')} (cache 5 min)
                </p>
            </div>
        </SuperAdminLayout>
    );
}
