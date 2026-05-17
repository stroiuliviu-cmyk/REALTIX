import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';

function MetricCard({ label, value, accent = 'slate' }) {
    const palette = {
        slate:   'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        blue:    'bg-blue-50 border-blue-200',
        violet:  'bg-violet-50 border-violet-200',
    };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
                {typeof value === 'number' ? value.toLocaleString('ro') : (value ?? '—')}
            </div>
        </div>
    );
}

function MiniBars({ data }) {
    if (!data || data.length === 0) return <div className="text-center py-8 text-xs text-slate-400">Nu sunt date.</div>;
    const max = Math.max(...data.map(d => Number(d.cnt)), 1);
    return (
        <div className="flex items-end gap-1 h-30">
            {data.map((d, i) => (
                <div
                    key={i}
                    className="flex-1 bg-linear-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 group relative cursor-pointer"
                    style={{ height: `${Math.max((Number(d.cnt) / max) * 100, 2)}px` }}
                    title={`${d.day}: ${d.cnt}`}
                >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                        {d.cnt}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Index({ stats, byType, byCity, byDay, syncLogs }) {
    const triggerSync = () => {
        if (!confirm('Pornește sync manual 999.md acum? Va dispatcha job-ul în background.')) return;
        router.post(route('super-admin.portal-999.sync'), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="999.md Integration" breadcrumb="Super Admin · External Sync">
            <Head title="999.md — Super Admin" />

            <div className="space-y-5">
                <div className="flex justify-end">
                    <button onClick={triggerSync} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-bold hover:bg-blue-700">
                        🔄 Trigger manual sync
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Total scraped" value={stats.total} accent="blue" />
                    <MetricCard label="Astăzi" value={stats.today} accent="emerald" />
                    <MetricCard label="7 zile" value={stats.week} />
                    <MetricCard label="30 zile" value={stats.month} accent="violet" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900">Anunțuri scrapate / zi (30 zile)</h3>
                        <span className="text-xs text-slate-400">
                            Ultima sync: {stats.last_sync_at ? new Date(stats.last_sync_at).toLocaleString('ro-RO') : '—'}
                        </span>
                    </div>
                    <MiniBars data={byDay} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Pe tip</h3>
                        {Object.keys(byType).length === 0 ? (
                            <p className="text-center py-4 text-sm text-slate-400">Nu sunt date.</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(byType).map(([type, cnt]) => (
                                    <div key={type} className="flex items-center justify-between text-sm">
                                        <span className="capitalize text-slate-700">{type}</span>
                                        <span className="font-bold text-slate-900">{Number(cnt).toLocaleString('ro')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Top 10 orașe</h3>
                        {byCity.length === 0 ? (
                            <p className="text-center py-4 text-sm text-slate-400">Nu sunt date.</p>
                        ) : (
                            <div className="space-y-2">
                                {byCity.map((c, i) => (
                                    <div key={c.city} className="flex items-center gap-3 text-sm">
                                        <span className="text-xs text-slate-400 w-5">#{i + 1}</span>
                                        <span className="text-slate-800 flex-1 truncate">{c.city}</span>
                                        <span className="font-bold text-slate-900">{Number(c.cnt).toLocaleString('ro')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Sync logs (30 cele mai recente)</h3>
                    </div>
                    {syncLogs.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-slate-400">
                            Niciun log de sync. Cron-ul `999md-today-scrape` rulează la fiecare 30 min — verifică `php artisan schedule:work`.
                        </p>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {syncLogs.map(l => (
                                <div key={l.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                        {new Date(l.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{l.action}</span>
                                    <span className="text-slate-700 flex-1 truncate">{l.description ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
