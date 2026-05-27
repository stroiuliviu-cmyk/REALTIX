import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

function MetricCard({ label, value, accent = 'slate' }) {
    const palette = {
        slate:   'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        blue:    'bg-blue-50 border-blue-200',
        violet:  'bg-violet-50 border-violet-200',
        red:     'bg-red-50 border-red-200',
        amber:   'bg-amber-50 border-amber-200',
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

function MiniBars({ data, color, height = 'h-30' }) {
    if (!data || data.length === 0) return <div className="text-center py-8 text-xs text-slate-400">Nu sunt date.</div>;
    const max = Math.max(...data.map(d => Number(d.cnt)), 1);
    // When a hex color is passed, switch to inline gradient (Tailwind can't
    // template arbitrary hex into class names). Default keeps the original
    // blue gradient classes so the existing chart at line ~72 is unaffected.
    const useCustom = !!color;
    const barClass = useCustom
        ? 'flex-1 rounded-t group relative cursor-pointer transition-opacity hover:opacity-80'
        : 'flex-1 bg-linear-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 group relative cursor-pointer';
    return (
        <div className={`flex items-end gap-1 ${height}`}>
            {data.map((d, i) => (
                <div
                    key={i}
                    className={barClass}
                    style={{
                        // Percent height so bars respect the parent container's
                        // height (h-10/h-12/h-30 etc.). Previously this used px,
                        // making bars overflow upward into adjacent rows when the
                        // container was shorter than 100px (sub-cards, type cards).
                        height: `${Math.max((Number(d.cnt) / max) * 100, 4)}%`,
                        ...(useCustom && { background: `linear-gradient(to top, ${color}, ${color}cc)` }),
                    }}
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

const TYPE_LABELS = {
    apartment:  'Apartamente',
    house:      'Case',
    cottage:    'Vile/Cabane',
    land:       'Terenuri',
    garage:     'Garaje',
    commercial: 'Comercial',
};

const TYPE_COLORS = {
    apartment:  '#3b82f6', // blue-500
    house:      '#10b981', // emerald-500
    cottage:    '#14b8a6', // teal-500
    land:       '#8b5cf6', // violet-500
    garage:     '#64748b', // slate-500
    commercial: '#f59e0b', // amber-500
};

const TYPE_ICONS = {
    apartment:  '🏢',
    house:      '🏠',
    cottage:    '🏡',
    land:       '🌳',
    garage:     '🚗',
    commercial: '🏪',
};

// Mode + status visual tokens for the run history table.
const MODE_BADGE = {
    hourly:  'bg-blue-100 text-blue-700',
    morning: 'bg-amber-100 text-amber-700',
    manual:  'bg-slate-100 text-slate-700',
};

const STATUS_BADGE = {
    success: 'bg-emerald-100 text-emerald-700',
    failed:  'bg-red-100 text-red-700',
    killed:  'bg-orange-100 text-orange-700',
    timeout: 'bg-orange-100 text-orange-700',
    running: 'bg-blue-100 text-blue-700',
};

function StatMini({ label, value, color = 'slate' }) {
    const colorClass = {
        slate:   'text-slate-700',
        blue:    'text-blue-700',
        emerald: 'text-emerald-700',
        violet:  'text-violet-700',
    }[color] ?? 'text-slate-700';
    return (
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</div>
            <div className={`text-lg font-black ${colorClass}`}>
                {typeof value === 'number' ? value.toLocaleString('ro') : (value ?? '—')}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const cls = STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600';
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>
            {status}
        </span>
    );
}

function formatDuration(seconds) {
    if (seconds == null || seconds === 0) return '—';
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
}

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('ro-RO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

function timeAgo(iso) {
    if (!iso) return '—';
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return `acum ${sec}s`;
    if (sec < 3600) return `acum ${Math.floor(sec / 60)} min`;
    return `acum ${Math.floor(sec / 3600)}h`;
}

// Sub-category labels per type — inline (propertyLabels.js has only type labels).
// '_none' = synthetic bucket for rows with subtype IS NULL.
const SUBTYPE_LABELS = {
    apartment: {
        '1_camera': '1 cameră',
        '2_camere': '2 camere',
        '3_camere': '3 camere',
        '4plus':    '4+ camere',
        '_none':    'Nedefinit',
    },
    land: {
        'constructii': 'Construcții',
        'agricol':     'Agricol',
        'lac':         'Lângă lac',
        '_none':       'Nedefinit',
    },
    garage: {
        'garaj':       'Garaj',
        'loc_parcare': 'Loc parcare',
        'subterana':   'Subterană',
        '_none':       'Nedefinit',
    },
    commercial: {
        'birou':      'Birou',
        'comercial':  'Spațiu comercial',
        'depozit':    'Depozit',
        'industrial': 'Spațiu industrial',
        '_none':      'Nedefinit',
    },
    house:   { '_none': 'Toate' },
    cottage: { '_none': 'Toate' },
};

export default function Index({
    stats, byType, byCity, byDay, byTypeDaily = [],
    bySubtype = [], bySubtypeDaily = {}, coverage = {},
    syncLogs,
    recentRuns = [], runsAgg = {}, activeRun = null,
}) {
    const [isSyncing, setIsSyncing] = useState(false);

    // 30s debounce prevents double-clicks from queuing redundant Artisan jobs.
    // Server-side ScraperProcessGuard still refuses parallel spawns, but the
    // client-side guard avoids spamming the queue with no-op rejections.
    const triggerSync = () => {
        if (isSyncing) return;
        if (!confirm('Pornește sync manual 999.md acum? Va dispatcha job-ul în background.')) return;
        setIsSyncing(true);
        router.post(route('super-admin.portal-999.sync'), {}, {
            preserveScroll: true,
            onFinish: () => {
                setTimeout(() => setIsSyncing(false), 30000);
            },
        });
    };

    const [expandedType, setExpandedType] = useState(null);
    const [autoRefresh, setAutoRefresh]   = useState(true);
    const [lastRefresh, setLastRefresh]   = useState(new Date());
    const detailsRef = useRef(null);

    // Smooth-scroll the standalone details section into view when a card is expanded
    // (lets the user see the expansion even when their viewport was below the grid).
    useEffect(() => {
        if (expandedType && detailsRef.current) {
            detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [expandedType]);

    // Partial reload of monitoring data every 30s — preserves scroll position
    // and expandedType state since we don't touch the React tree, only props.
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            router.reload({
                only: ['stats', 'byType', 'byTypeDaily', 'bySubtype', 'bySubtypeDaily', 'coverage',
                       'recentRuns', 'runsAgg', 'activeRun'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setLastRefresh(new Date()),
            });
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    return (
        <SuperAdminLayout title="999.md Integration" breadcrumb="Super Admin · External Sync">
            <Head title="999.md — Super Admin" />

            <div className="space-y-5">
                <div className="flex justify-end">
                    <button
                        onClick={triggerSync}
                        disabled={isSyncing}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                            isSyncing
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sync în desfășurare…
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Trigger manual sync
                            </>
                        )}
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

                {/* Pe categorii — 6 carduri (3x2), expandable to subtype sparklines */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900">Pe categorii (30 zile)</h3>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="rounded"
                                />
                                Auto-refresh 30s
                            </label>
                            <span className="text-xs text-slate-400">
                                Ultim refresh: {lastRefresh.toLocaleTimeString('ro-RO')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.keys(TYPE_LABELS).map((type) => {
                            const total = byType?.[type] ?? 0;
                            const cov   = coverage?.[type] ?? { with_subtype: 0, total: 0, pct: 0 };
                            const data  = (byTypeDaily ?? []).map(d => ({
                                day: d.day,
                                cnt: d[type] ?? 0,
                            }));
                            const isExpanded = expandedType === type;
                            // Subtle visual cue for the currently-expanded card (ring outline).
                            const cardRing = isExpanded
                                ? 'ring-2 ring-offset-1'
                                : 'hover:bg-slate-50';

                            return (
                                <button
                                    key={type}
                                    onClick={() => setExpandedType(isExpanded ? null : type)}
                                    className={`w-full p-4 text-left rounded-xl border border-slate-200 transition-colors ${cardRing}`}
                                    style={isExpanded ? { '--tw-ring-color': TYPE_COLORS[type] } : undefined}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{TYPE_ICONS[type]}</span>
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest"
                                                style={{ color: TYPE_COLORS[type] }}
                                            >
                                                {TYPE_LABELS[type]}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                        {total.toLocaleString('ro')}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-500">Coverage subtype:</span>
                                        <span
                                            className="text-[10px] font-bold"
                                            style={{
                                                color: cov.pct >= 70 ? '#10b981'
                                                     : cov.pct >= 30 ? '#f59e0b'
                                                     : '#ef4444',
                                            }}
                                        >
                                            {cov.pct}% ({cov.with_subtype}/{cov.total})
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <MiniBars data={data} color={TYPE_COLORS[type]} height="h-12" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Standalone details panel — sits BELOW the 3x2 grid so card heights
                    stay uniform and sub-cards never overlap the next grid row. */}
                {expandedType && (() => {
                    const type = expandedType;
                    const subtypesForType = (bySubtype ?? []).filter(s => s.type === type);

                    return (
                        <div
                            ref={detailsRef}
                            className="bg-white rounded-xl border-2 shadow-sm p-5"
                            style={{ borderColor: TYPE_COLORS[type] }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{TYPE_ICONS[type]}</span>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Detalii {TYPE_LABELS[type]}
                                    </h3>
                                    <span className="text-xs text-slate-400">
                                        ({subtypesForType.length} sub-categorii)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setExpandedType(null)}
                                    className="text-slate-400 hover:text-slate-700 text-lg leading-none px-2 py-1 rounded hover:bg-slate-100"
                                    aria-label="Închide detalii"
                                >
                                    ✕
                                </button>
                            </div>

                            {subtypesForType.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-4">
                                    Nu sunt sub-categorii pentru acest tip.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subtypesForType.map((sub) => {
                                        const subLabel   = SUBTYPE_LABELS[type]?.[sub.subtype] ?? sub.subtype;
                                        const subData    = bySubtypeDaily[`${type}:${sub.subtype}`] ?? [];
                                        const lastScraped = sub.last_scraped_at
                                            ? new Date(sub.last_scraped_at).toLocaleString('ro-RO', {
                                                day: '2-digit', month: '2-digit',
                                                hour: '2-digit', minute: '2-digit',
                                              })
                                            : '—';

                                        return (
                                            <div key={sub.subtype} className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
                                                {/* Row 1: label left, count right */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700">{subLabel}</span>
                                                    <span className="text-base font-black text-slate-900">
                                                        {Number(sub.cnt).toLocaleString('ro')}
                                                    </span>
                                                </div>
                                                {/* Row 2: sparkline full width */}
                                                <div>
                                                    {subData.length > 0 ? (
                                                        <MiniBars data={subData} color={TYPE_COLORS[type]} height="h-10" />
                                                    ) : (
                                                        <div className="text-[10px] text-slate-300 py-2 text-center">
                                                            Fără date 7 zile
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Row 3: last scrape timestamp */}
                                                <div className="text-[10px] text-slate-400 text-right">
                                                    Ultim scrape: {lastScraped}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

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

                {/* ─── Activitate scraper ─── */}
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900">Activitate scraper</h2>

                    {activeRun && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                        <h3 className="text-lg font-bold text-slate-900">Sync activ</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase">
                                            {activeRun.mode}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        PID {activeRun.pid ?? '—'} · Pornit {timeAgo(activeRun.started_at)} · Categorie: <strong>
                                            {activeRun.current_category ?? 'inițializare…'}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                <StatMini label="Procesate" value={activeRun.total_processed} color="blue" />
                                <StatMini label="Noi" value={activeRun.total_new} color="emerald" />
                                <StatMini label="Update" value={activeRun.total_updated} color="violet" />
                                <StatMini label="Skip" value={activeRun.total_skipped} color="slate" />
                            </div>
                            {Object.keys(activeRun.category_stats || {}).length > 0 && (
                                <div className="mt-4">
                                    <div className="text-xs font-bold uppercase text-slate-500 mb-2">Categorii parcurse</div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                        {Object.entries(activeRun.category_stats).map(([cat, s]) => (
                                            <div key={cat} className="bg-white rounded-lg p-2 border border-slate-200">
                                                <div className="text-xs font-bold text-slate-700">
                                                    {TYPE_LABELS[cat] ?? cat}
                                                </div>
                                                <div className="text-xs text-emerald-600">+{s.new ?? 0}</div>
                                                <div className="text-xs text-slate-500">{s.processed ?? 0} listings</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard label="Runs 24h" value={runsAgg.count_24h ?? 0} />
                        <MetricCard label="Success" value={runsAgg.success_24h ?? 0} accent="emerald" />
                        <MetricCard label="Failed" value={runsAgg.failed_24h ?? 0} accent="red" />
                        <MetricCard label="Avg durată" value={formatDuration(runsAgg.avg_duration_sec)} />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Istoric runs (ultimele 20)</h3>
                        </div>
                        {recentRuns.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">
                                Nu există runs înregistrate încă. Pornește un sync manual sau așteaptă cron-ul orar.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold">Pornit</th>
                                            <th className="px-4 py-2 text-left font-semibold">Mode</th>
                                            <th className="px-4 py-2 text-left font-semibold">Durată</th>
                                            <th className="px-4 py-2 text-right font-semibold">Procesate</th>
                                            <th className="px-4 py-2 text-right font-semibold">Noi</th>
                                            <th className="px-4 py-2 text-right font-semibold">Update</th>
                                            <th className="px-4 py-2 text-right font-semibold">Skip</th>
                                            <th className="px-4 py-2 text-right font-semibold">Fail</th>
                                            <th className="px-4 py-2 text-center font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentRuns.map(run => (
                                            <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-slate-700">{formatDateTime(run.started_at)}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${MODE_BADGE[run.mode] ?? 'bg-slate-100 text-slate-600'}`}>
                                                        {run.mode}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{run.duration_human}</td>
                                                <td className="px-4 py-2 text-right font-mono text-slate-800">{run.total_processed}</td>
                                                <td className="px-4 py-2 text-right font-mono text-emerald-600">+{run.total_new}</td>
                                                <td className="px-4 py-2 text-right font-mono text-violet-600">{run.total_updated}</td>
                                                <td className="px-4 py-2 text-right font-mono text-slate-500">{run.total_skipped}</td>
                                                <td className="px-4 py-2 text-right font-mono text-red-500">{run.total_failed}</td>
                                                <td className="px-4 py-2 text-center"><StatusBadge status={run.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
