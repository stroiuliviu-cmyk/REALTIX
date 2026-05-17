import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';

function MetricCard({ label, value, prefix = '', suffix = '', accent = 'slate' }) {
    const palette = {
        slate:   'bg-white border-slate-200',
        rose:    'bg-rose-50 border-rose-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        violet:  'bg-violet-50 border-violet-200',
    };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
                {prefix}{typeof value === 'number' ? value.toLocaleString('ro') : value}{suffix}
            </div>
        </div>
    );
}

export default function Index({ requests, stats, byAction, topAgencies, aiDisabled, filters }) {
    const toggleKill = () => {
        const action = aiDisabled ? 'reactivezi AI' : 'DEZACTIVEZI AI GLOBAL pentru TOȚI utilizatorii';
        if (!confirm(`Sigur ${action}?`)) return;
        router.post(route('super-admin.ai.kill-switch'), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="AI System" breadcrumb="Super Admin · AI Usage & Costs">
            <Head title="AI System — Super Admin" />

            <div className="space-y-5">
                <div className={`rounded-xl border-2 p-5 flex items-center justify-between gap-4 flex-wrap ${aiDisabled ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Global AI kill-switch</div>
                        <div className="text-xl font-black text-slate-900 mt-1">
                            {aiDisabled ? '🛑 AI DEZACTIVAT — toți userii blocați' : '✅ AI activ pe platformă'}
                        </div>
                    </div>
                    <button
                        onClick={toggleKill}
                        className={`rounded-lg px-5 py-2.5 text-sm font-bold ${aiDisabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                    >
                        {aiDisabled ? '↻ Reactivează AI' : '🛑 Dezactivează AI'}
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Requests (30d)" value={stats.requests_30d} />
                    <MetricCard label="Cost (30d)" value={stats.cost_30d.toFixed(2)} prefix="$" accent="violet" />
                    <MetricCard label="Tokens (30d)" value={stats.tokens_30d} accent="emerald" />
                    <MetricCard label="Flagged total" value={stats.flagged_all} accent={stats.flagged_all > 0 ? 'rose' : 'slate'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Pe acțiune (30 zile)</h3>
                        {byAction.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Nicio activitate AI.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {byAction.map(r => (
                                        <tr key={r.action}>
                                            <td className="py-2 font-mono text-xs text-slate-700">{r.action}</td>
                                            <td className="py-2 text-right font-bold text-slate-900">{Number(r.cnt).toLocaleString('ro')}</td>
                                            <td className="py-2 text-right text-xs text-slate-500">${Number(r.cost ?? 0).toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Top 10 agenții (30 zile)</h3>
                        {topAgencies.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Nicio agenție cu activitate.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {topAgencies.map((a, i) => (
                                        <tr key={a.id}>
                                            <td className="py-2 text-xs text-slate-400 w-6">#{i + 1}</td>
                                            <td className="py-2 font-semibold text-slate-800">{a.name}</td>
                                            <td className="py-2 text-right font-bold text-slate-900">{Number(a.cnt).toLocaleString('ro')}</td>
                                            <td className="py-2 text-right text-xs text-slate-500">${Number(a.cost ?? 0).toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Requests recente</h3>
                        <button
                            onClick={() => router.get(route('super-admin.ai.index'), { flagged: filters.flagged ? '' : '1' }, { preserveState: true })}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg ${filters.flagged ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
                        >
                            🚩 Doar flagged
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-2.5">Time</th>
                                    <th className="px-4 py-2.5">User / Agency</th>
                                    <th className="px-4 py-2.5">Action</th>
                                    <th className="px-4 py-2.5 text-right">Tokens</th>
                                    <th className="px-4 py-2.5 text-right">Cost</th>
                                    <th className="px-4 py-2.5">Flag</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {requests.data.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Niciun request AI înregistrat.</td></tr>
                                ) : requests.data.map(r => (
                                    <tr key={r.id} className={r.flagged ? 'bg-rose-50/40' : 'hover:bg-slate-50/40'}>
                                        <td className="px-4 py-2 text-xs text-slate-400 font-mono whitespace-nowrap">
                                            {new Date(r.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="text-slate-800 font-semibold">{r.user_name ?? '—'}</div>
                                            <div className="text-[10px] text-slate-400">{r.agency_name ?? r.user_email}</div>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-slate-700">{r.action}</td>
                                        <td className="px-4 py-2 text-right text-xs text-slate-600">
                                            {((r.tokens_in ?? 0) + (r.tokens_out ?? 0)).toLocaleString('ro') || '—'}
                                        </td>
                                        <td className="px-4 py-2 text-right text-xs font-bold text-slate-700">
                                            ${Number(r.cost_usd ?? 0).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-2">{r.flagged && <span className="text-rose-600">🚩</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {requests.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex justify-between text-xs">
                            <span className="text-slate-500">Pagina {requests.current_page} / {requests.last_page} · {requests.total} requests</span>
                            <div className="flex gap-1">
                                {requests.links.map((l, i) => (
                                    <button
                                        key={i}
                                        onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                                        disabled={!l.url}
                                        className={`px-2.5 py-1 rounded font-semibold ${l.active ? 'bg-slate-900 text-white' : l.url ? 'bg-slate-100' : 'opacity-30'}`}
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
