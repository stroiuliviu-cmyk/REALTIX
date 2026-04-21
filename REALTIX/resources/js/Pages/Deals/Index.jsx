import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';

const statusColors = {
    new: 'bg-slate-100 text-slate-600',
    negotiation: 'bg-blue-100 text-blue-700',
    advance: 'bg-amber-100 text-amber-700',
    signing: 'bg-purple-100 text-purple-700',
    closed: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-600',
};

const statusLabels = {
    new: 'Nou', negotiation: 'Negociere', advance: 'Avans',
    signing: 'La notar', closed: 'Finalizat', lost: 'Pierdut',
};

export default function Index({ deals, stats, filters }) {
    return (
        <AppLayout title="Tranzacții">
            <Head title="Tranzacții" />
            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                        <div className="text-slate-500 text-sm font-medium mb-1">Volum Total Vânzări</div>
                        <div className="text-3xl font-bold text-slate-900">
                            €{Number(stats.total_volume || 0).toLocaleString('ro')}
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-slate-900 to-blue-700 p-6 rounded-[2rem] shadow-2xl text-white">
                        <div className="text-blue-200 text-sm font-medium mb-1">Comision Total</div>
                        <div className="text-3xl font-bold">
                            €{Number(stats.total_commission || 0).toLocaleString('ro')}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                        <div className="text-slate-500 text-sm font-medium mb-1">Tranzacții Active</div>
                        <div className="text-3xl font-bold text-slate-900">{stats.active_count}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">Istoric Tranzacții</h2>
                        <select
                            value={filters?.status ?? ''}
                            onChange={e => router.get('/deals', { status: e.target.value })}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                        >
                            <option value="">Toate</option>
                            {Object.entries(statusLabels).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Proprietate</th>
                                    <th className="px-4 py-3">Valoare</th>
                                    <th className="px-4 py-3">Comision</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deals.data.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nicio tranzacție.</td></tr>
                                ) : deals.data.map(deal => (
                                    <tr key={deal.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-4 font-bold text-blue-700">
                                            {deal.contact?.first_name} {deal.contact?.last_name}
                                        </td>
                                        <td className="px-4 py-4 text-slate-700 max-w-xs truncate">
                                            {deal.property?.title ?? '—'}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-900">
                                            {deal.value ? `€${Number(deal.value).toLocaleString('ro')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-emerald-600">
                                            {deal.commission ? `€${Number(deal.commission).toLocaleString('ro')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[deal.status] ?? 'bg-slate-100'}`}>
                                                {statusLabels[deal.status] ?? deal.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-400">
                                            {deal.closed_at ? new Date(deal.closed_at).toLocaleDateString('ro') :
                                             new Date(deal.created_at).toLocaleDateString('ro')}
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
