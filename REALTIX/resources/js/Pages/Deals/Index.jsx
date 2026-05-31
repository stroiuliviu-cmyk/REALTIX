import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { Banknote, TrendingUp, Briefcase } from 'lucide-react';

const statusColors = {
    new:         'bg-slate-100 text-slate-600',
    negotiation: 'bg-blue-100 text-blue-700',
    advance:     'bg-amber-100 text-amber-700',
    signing:     'bg-violet-100 text-violet-700',
    closed:      'bg-emerald-100 text-emerald-700',
    lost:        'bg-red-100 text-red-600',
};

const statusLabels = {
    new: 'Nou', negotiation: 'Negociere', advance: 'Avans',
    signing: 'La notar', closed: 'Finalizat', lost: 'Pierdut',
};

function StatTile({ Icon, label, value, accent = 'slate' }) {
    const accentCls = accent === 'blue'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-slate-100 text-slate-600';
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/70">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentCls}`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="text-[28px] font-bold tabular-nums leading-tight text-slate-900 mt-0.5">{value}</div>
                </div>
            </div>
        </div>
    );
}

export default function Index({ deals, stats, filters }) {
    return (
        <AppLayout title="Tranzacții">
            <Head title="Tranzacții" />
            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatTile
                        Icon={Banknote}
                        label="Volum total vânzări"
                        value={`€${Number(stats.total_volume || 0).toLocaleString('ro')}`}
                    />
                    <StatTile
                        Icon={TrendingUp}
                        label="Comision total"
                        value={`€${Number(stats.total_commission || 0).toLocaleString('ro')}`}
                        accent="blue"
                    />
                    <StatTile
                        Icon={Briefcase}
                        label="Tranzacții active"
                        value={Number(stats.active_count || 0).toLocaleString('ro')}
                    />
                </div>

                {/* Table */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/70">
                    <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">Istoric tranzacții</h2>
                        <select
                            value={filters?.status ?? ''}
                            onChange={e => router.get('/deals', { status: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        >
                            <option value="">Toate</option>
                            {Object.entries(statusLabels).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Client</th>
                                    <th className="px-4 py-3 font-semibold">Proprietate</th>
                                    <th className="px-4 py-3 font-semibold">Valoare</th>
                                    <th className="px-4 py-3 font-semibold">Comision</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {deals.data.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Nicio tranzacție.</td></tr>
                                ) : deals.data.map(deal => (
                                    <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 font-semibold text-blue-600">
                                            {deal.contact?.first_name} {deal.contact?.last_name}
                                        </td>
                                        <td className="px-4 py-4 text-slate-700 max-w-xs truncate">
                                            {deal.property?.title ?? '—'}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-slate-900 tabular-nums">
                                            {deal.value ? `€${Number(deal.value).toLocaleString('ro')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-emerald-600 tabular-nums">
                                            {deal.commission ? `€${Number(deal.commission).toLocaleString('ro')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${statusColors[deal.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {statusLabels[deal.status] ?? deal.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                                            {deal.closed_at
                                                ? new Date(deal.closed_at).toLocaleDateString('ro')
                                                : new Date(deal.created_at).toLocaleDateString('ro')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
