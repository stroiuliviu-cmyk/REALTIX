import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

function MiniBar({ value, max, color = 'bg-blue-500' }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600 w-8 text-right">{value}</span>
        </div>
    );
}

function StatBox({ icon, label, value, sub, color = 'blue' }) {
    const colors = {
        blue:   'bg-blue-50 text-blue-700',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
        purple: 'bg-purple-50 text-purple-700',
        rose:   'bg-rose-50 text-rose-700',
    };
    return (
        <div className={`rounded-3xl p-5 ${colors[color]}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-3xl font-black mt-1">{value}</div>
            {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
        </div>
    );
}

export default function Index({
    isAdmin,
    propertiesTotal, propertiesActive,
    contactsTotal, contactsByType = {},
    dealsMonth, revenueMonth,
    agentStats = [],
    revenueByMonth = [],
}) {
    const [period, setPeriod] = useState('month');

    const maxRevenue = Math.max(...revenueByMonth.map(r => r.total), 1);

    return (
        <AppLayout title="Statistici">
            <Head title="Statistici" />
            <div className="space-y-6">

                {/* Period filter */}
                <div className="flex items-center gap-2">
                    {['week', 'month', 'year'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                                period === p ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {{ week: 'Săptămână', month: 'Lună', year: 'An' }[p]}
                        </button>
                    ))}
                </div>

                {/* ─── Main stats grid ─── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBox icon="🏠" label="Total anunțuri" value={propertiesTotal} sub={`${propertiesActive} active`} color="blue" />
                    <StatBox icon="👥" label="Clienți" value={contactsTotal} color="purple" />
                    <StatBox icon="🤝" label="Tranzacții / lună" value={dealsMonth} color="green" />
                    <StatBox
                        icon="💰" label="Venit / lună"
                        value={revenueMonth > 0 ? `€${Number(revenueMonth).toLocaleString('ro')}` : '—'}
                        color="amber"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue chart */}
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-6">
                        <h3 className="font-bold text-slate-900 mb-5">Venituri pe luni ({new Date().getFullYear()})</h3>
                        {revenueByMonth.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">Nicio tranzacție finalizată.</div>
                        ) : (
                            <div className="space-y-3">
                                {revenueByMonth.map(r => (
                                    <div key={r.month} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-8">{monthNames[r.month - 1]}</span>
                                        <MiniBar value={Math.round(r.total)} max={maxRevenue} color="bg-blue-500" />
                                        <span className="text-xs font-bold text-slate-700 w-16 text-right">
                                            €{Number(r.total).toLocaleString('ro')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Contacts by type */}
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-6">
                        <h3 className="font-bold text-slate-900 mb-5">Clienți după tip</h3>
                        <div className="space-y-4">
                            {[
                                { key: 'buyer',    label: 'Cumpărători', color: 'bg-blue-500' },
                                { key: 'seller',   label: 'Vânzători',   color: 'bg-emerald-500' },
                                { key: 'tenant',   label: 'Chiriași',    color: 'bg-amber-500' },
                                { key: 'landlord', label: 'Proprietari', color: 'bg-purple-500' },
                            ].map(t => {
                                const val = contactsByType[t.key] ?? 0;
                                const maxContacts = Math.max(...Object.values(contactsByType), 1);
                                return (
                                    <div key={t.key}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-slate-700">{t.label}</span>
                                            <span className="font-bold text-slate-900">{val}</span>
                                        </div>
                                        <MiniBar value={val} max={maxContacts} color={t.color} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Admin-only: agent performance table */}
                {isAdmin && agentStats.length > 0 && (
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-6">
                        <h3 className="font-bold text-slate-900 mb-5">Performanța agenților</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-400 font-bold uppercase border-b border-slate-100">
                                        <th className="text-left pb-3">Agent</th>
                                        <th className="text-right pb-3">Anunțuri</th>
                                        <th className="text-right pb-3">Clienți</th>
                                        <th className="text-right pb-3">Tranzacții</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {agentStats.map(agent => (
                                        <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 font-semibold text-slate-800">{agent.name}</td>
                                            <td className="py-3 text-right text-slate-600">{agent.properties_count}</td>
                                            <td className="py-3 text-right text-slate-600">{agent.contacts_count}</td>
                                            <td className="py-3 text-right font-bold text-slate-900">{agent.deals_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Realtor-only notice */}
                {!isAdmin && (
                    <div className="rounded-4xl bg-blue-50 border border-blue-100 p-6 text-sm text-blue-700">
                        <strong>Notă:</strong> Vizualizezi statisticile tale personale. Administratorul agenției are acces la statisticile complete ale agenției.
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
