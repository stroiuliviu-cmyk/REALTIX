import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

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
}) {
    const triggerSync = () => {
        if (!confirm('Pornește sync manual 999.md acum? Va dispatcha job-ul în background.')) return;
        router.post(route('super-admin.portal-999.sync'), {}, { preserveScroll: true });
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
                only: ['stats', 'byType', 'byTypeDaily', 'bySubtype', 'bySubtypeDaily', 'coverage'],
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
