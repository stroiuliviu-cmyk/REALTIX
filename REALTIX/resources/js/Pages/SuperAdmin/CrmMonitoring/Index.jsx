import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head } from '@inertiajs/react';

function MetricCard({ label, value, accent = 'slate', sub }) {
    const palette = {
        slate:   'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        blue:    'bg-blue-50 border-blue-200',
        violet:  'bg-violet-50 border-violet-200',
    };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">{value.toLocaleString('ro')}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

const STATUS_COLORS = { lead: 'amber', active: 'blue', closed: 'slate' };
const TYPE_LABELS = { buyer: 'Cumpărător', seller: 'Vânzător', landlord: 'Proprietar', tenant: 'Chiriaș' };
const TYPE_COLORS = { buyer: 'bg-blue-500', seller: 'bg-emerald-500', landlord: 'bg-violet-500', tenant: 'bg-amber-500' };

function Distribution({ data, labels, colors }) {
    const entries = Object.entries(data);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return (
        <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                {entries.map(([k, v]) => (
                    <div key={k} className={colors[k] ?? 'bg-slate-400'} style={{ width: `${(v / total) * 100}%` }} title={`${labels?.[k] ?? k}: ${v}`} />
                ))}
            </div>
            <div className="space-y-1">
                {entries.map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                        <span className={`w-2.5 h-2.5 rounded-sm ${colors[k] ?? 'bg-slate-400'}`} />
                        <span className="text-slate-700">{labels?.[k] ?? k}</span>
                        <span className="ml-auto text-xs text-slate-500">{v} ({((v / total) * 100).toFixed(0)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Index({ stats, contactsByStatus, contactsByType, topAgenciesByActivity, interactionTypes, planLabels }) {
    return (
        <SuperAdminLayout title="CRM Monitoring" breadcrumb="Super Admin · Cross-agency CRM">
            <Head title="CRM Monitoring — Super Admin" />

            <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard label="Total contacte" value={stats.total_contacts} accent="blue" sub={`+${stats.contacts_30d} ultimele 30 zile`} />
                    <MetricCard label="Total deals" value={stats.total_deals} accent="emerald" sub={`+${stats.deals_30d} ultimele 30 zile`} />
                    <MetricCard label="Interacțiuni" value={stats.total_interactions} accent="violet" sub={`+${stats.interactions_30d} ultimele 30 zile`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Status contacte</h3>
                        <Distribution
                            data={contactsByStatus}
                            labels={{ lead: 'Lead', active: 'Activ', closed: 'Închis' }}
                            colors={{ lead: 'bg-amber-500', active: 'bg-blue-500', closed: 'bg-slate-400' }}
                        />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Tip contacte</h3>
                        <Distribution
                            data={contactsByType}
                            labels={TYPE_LABELS}
                            colors={TYPE_COLORS}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Top 10 agenții active (30 zile)</h3>
                        {topAgenciesByActivity.length === 0 ? (
                            <p className="text-center py-4 text-sm text-slate-400">Nicio agenție activă.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-xs font-bold text-slate-500 uppercase">
                                    <tr><th className="text-left py-1">Agenție</th><th className="text-right py-1">Contacte</th><th className="text-right py-1">Deals</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topAgenciesByActivity.map(a => (
                                        <tr key={a.id}>
                                            <td className="py-2">
                                                <div className="font-semibold text-slate-800">{a.name}</div>
                                                <div className="text-[10px] text-slate-400">{planLabels[a.subscription_plan] ?? a.subscription_plan}</div>
                                            </td>
                                            <td className="py-2 text-right font-bold text-slate-700">{Number(a.contacts_cnt).toLocaleString('ro')}</td>
                                            <td className="py-2 text-right font-bold text-slate-700">{Number(a.deals_cnt).toLocaleString('ro')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Tipuri interacțiuni (30 zile)</h3>
                        {interactionTypes.length === 0 ? (
                            <p className="text-center py-4 text-sm text-slate-400">Nicio interacțiune înregistrată.</p>
                        ) : (
                            <div className="space-y-2">
                                {interactionTypes.map(i => (
                                    <div key={i.type} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                                        <span className="capitalize text-slate-700">
                                            {i.type === 'note' && '📝 '}
                                            {i.type === 'call' && '📞 '}
                                            {i.type === 'email' && '✉️ '}
                                            {i.type === 'viewing' && '👁 '}
                                            {i.type === 'contract' && '📄 '}
                                            {i.type}
                                        </span>
                                        <span className="font-bold text-slate-900">{Number(i.cnt).toLocaleString('ro')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
