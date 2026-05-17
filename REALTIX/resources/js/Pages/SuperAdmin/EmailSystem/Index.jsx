import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';

function MetricCard({ label, value, accent = 'slate' }) {
    const palette = { slate: 'bg-white border-slate-200', rose: 'bg-rose-50 border-rose-200', amber: 'bg-amber-50 border-amber-200', emerald: 'bg-emerald-50 border-emerald-200' };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">{value.toLocaleString('ro')}</div>
        </div>
    );
}

export default function Index({ pendingJobs, failedJobs, recentFailed, notificationActions, config }) {
    const retryAll = () => {
        if (!confirm(`Retry toate ${failedJobs} failed jobs?`)) return;
        router.post(route('super-admin.email.retry'), {}, { preserveScroll: true });
    };

    const flushAll = () => {
        if (!confirm(`ȘTERGE definitiv toate ${failedJobs} failed jobs?`)) return;
        router.post(route('super-admin.email.flush'), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Email System" breadcrumb="Super Admin · Mail & Queue">
            <Head title="Email System — Super Admin" />

            <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MetricCard label="Queue pending" value={pendingJobs} accent={pendingJobs > 50 ? 'amber' : 'slate'} />
                    <MetricCard label="Failed jobs" value={failedJobs} accent={failedJobs > 0 ? 'rose' : 'emerald'} />
                    <MetricCard label="Notif/mail logs" value={notificationActions.length} />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Configurare</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-xs text-slate-400 uppercase">Driver</span><div className="font-mono">{config.mailer}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase">Host</span><div className="font-mono">{config.host ?? '—'}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase">Port</span><div className="font-mono">{config.port ?? '—'}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase">From</span><div className="font-mono text-xs">{config.from_addr}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase">Name</span><div className="font-mono text-xs">{config.from_name}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase">Queue driver</span><div className="font-mono">{config.queue_driver}</div></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Failed jobs ({failedJobs})</h3>
                        {failedJobs > 0 && (
                            <div className="flex gap-2">
                                <button onClick={retryAll} className="text-xs font-bold rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700">↻ Retry all</button>
                                <button onClick={flushAll} className="text-xs font-bold rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700">🗑 Flush all</button>
                            </div>
                        )}
                    </div>
                    {recentFailed.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-slate-400">🎉 Niciun failed job. Toate emailurile s-au procesat.</p>
                    ) : (
                        <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                            {recentFailed.map(f => (
                                <div key={f.id} className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{f.queue}</span>
                                        <span className="font-mono text-xs font-bold text-slate-800">{f.displayName}</span>
                                        <span className="ml-auto text-[10px] text-slate-400">{new Date(f.failed_at).toLocaleString('ro-RO')}</span>
                                    </div>
                                    <div className="font-mono text-[10px] text-rose-600 mt-1 line-clamp-2" title={f.exception_short}>{f.exception_short}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Notification activity (recent)</h3>
                    </div>
                    {notificationActions.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-400">Niciun log de notificare/mail.</p>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {notificationActions.map(n => (
                                <div key={n.id} className="px-5 py-2 flex items-center gap-3 text-xs">
                                    <span className="text-slate-400 font-mono whitespace-nowrap">{new Date(n.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{n.action}</span>
                                    <span className="text-slate-700 flex-1 truncate">{n.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
