import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect } from 'react';

const STATUS_PALETTE = {
    healthy:     { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Healthy' },
    info:        { dot: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50',    label: 'Info' },
    warning:     { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   label: 'Warning' },
    critical:    { dot: 'bg-rose-600',    text: 'text-rose-700',    bg: 'bg-rose-50',    label: 'Critical' },
    unavailable: { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100',  label: 'Unavailable' },
    unknown:     { dot: 'bg-slate-300',   text: 'text-slate-500',   bg: 'bg-slate-50',   label: 'Unknown' },
};

function StatusBadge({ status }) {
    const p = STATUS_PALETTE[status] ?? STATUS_PALETTE.unknown;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${p.bg} ${p.text}`}>
            <span className={`w-2 h-2 rounded-full ${p.dot}`} />
            {p.label}
        </span>
    );
}

function Panel({ title, icon, status, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                </div>
                {status && <StatusBadge status={status} />}
            </div>
            {children}
        </div>
    );
}

function KV({ label, value }) {
    return (
        <div className="flex justify-between py-1.5 text-sm border-b border-slate-100 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-mono text-slate-800 font-semibold">{value ?? '—'}</span>
        </div>
    );
}

export default function Index({ snapshot }) {
    // Auto-refresh every 30s
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['snapshot'], preserveScroll: true });
        }, 30000);
        return () => clearInterval(id);
    }, []);

    const overallStatus = (() => {
        const statuses = [
            snapshot.database?.status,
            snapshot.redis?.status,
            snapshot.queue?.status,
            snapshot.storage?.status,
        ];
        if (statuses.includes('critical')) return 'critical';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('unavailable')) return 'warning';
        return 'healthy';
    })();

    return (
        <SuperAdminLayout title="System Health" breadcrumb="Super Admin · Infrastructure">
            <Head title="System Health — Super Admin" />

            <div className="space-y-5">
                <div className={`rounded-xl border-2 p-5 ${STATUS_PALETTE[overallStatus].bg} ${STATUS_PALETTE[overallStatus].text}`}>
                    <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${STATUS_PALETTE[overallStatus].dot} animate-pulse`} />
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest opacity-80">Overall status</div>
                            <div className="text-xl font-black">{STATUS_PALETTE[overallStatus].label}</div>
                        </div>
                        <div className="ml-auto text-xs opacity-70">
                            Auto-refresh 30s · Updated {new Date(snapshot.computed_at).toLocaleTimeString('ro-RO')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Panel title="Database" icon="🗄" status={snapshot.database.status}>
                        <KV label="Driver" value={snapshot.database.driver} />
                        <KV label="Latency" value={snapshot.database.latency_ms ? `${snapshot.database.latency_ms} ms` : null} />
                        <KV label="DB size" value={snapshot.database.db_size} />
                        <KV label="Connections" value={snapshot.database.connections} />
                        {snapshot.database.error && (
                            <div className="mt-2 text-xs text-rose-600 font-mono">{snapshot.database.error}</div>
                        )}
                    </Panel>

                    <Panel title="Redis" icon="⚡" status={snapshot.redis.status}>
                        <KV label="Latency" value={snapshot.redis.latency_ms ? `${snapshot.redis.latency_ms} ms` : null} />
                        <KV label="Memory used" value={snapshot.redis.used_memory} />
                        <KV label="Clients" value={snapshot.redis.connected_clients} />
                        <KV label="Uptime" value={snapshot.redis.uptime_days ? `${snapshot.redis.uptime_days}d` : null} />
                        {snapshot.redis.error && (
                            <div className="mt-2 text-xs text-rose-600 font-mono">{snapshot.redis.error}</div>
                        )}
                    </Panel>

                    <Panel title="Queue" icon="⏱" status={snapshot.queue.status}>
                        <KV label="Pending jobs" value={snapshot.queue.pending} />
                        <KV label="Failed jobs" value={snapshot.queue.failed} />
                        <KV label="Oldest pending" value={snapshot.queue.oldest_pending_min ? `${snapshot.queue.oldest_pending_min} min` : 'none'} />
                    </Panel>

                    <Panel title="Storage" icon="💾" status={snapshot.storage.status}>
                        <KV label="Used" value={snapshot.storage.used_pct ? `${snapshot.storage.used_pct}%` : null} />
                        <KV label="Free" value={snapshot.storage.free_gb ? `${snapshot.storage.free_gb} GB` : null} />
                        <KV label="Total" value={snapshot.storage.total_gb ? `${snapshot.storage.total_gb} GB` : null} />
                        {snapshot.storage.used_pct != null && (
                            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${snapshot.storage.used_pct > 90 ? 'bg-rose-500' : snapshot.storage.used_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${snapshot.storage.used_pct}%` }}
                                />
                            </div>
                        )}
                    </Panel>

                    <Panel title="PHP" icon="🐘">
                        <KV label="Version" value={snapshot.php.version} />
                        <KV label="Memory used" value={`${snapshot.php.memory_usage_mb} MB / ${snapshot.php.memory_limit}`} />
                        <KV label="Memory peak" value={`${snapshot.php.memory_peak_mb} MB`} />
                        <KV label="Max execution" value={`${snapshot.php.max_execution}s`} />
                        <KV label="OPcache" value={snapshot.php.opcache_enabled ? 'enabled' : 'disabled'} />
                    </Panel>

                    <Panel title="Application" icon="🚀">
                        <KV label="Env" value={snapshot.app.env} />
                        <KV label="Debug" value={snapshot.app.debug ? 'ON' : 'OFF'} />
                        <KV label="Maintenance" value={snapshot.app.maintenance ? 'YES' : 'no'} />
                        <KV label="Laravel" value={snapshot.app.version} />
                        <KV label="Timezone" value={snapshot.app.timezone} />
                    </Panel>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
