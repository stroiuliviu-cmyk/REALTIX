import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    PieChart, Pie, Cell,
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    Building, Globe, Phone, Banknote, Eye, MapPin, TrendingUp, TrendingDown,
    Sparkles, FileText, FileSpreadsheet, X as XIcon, BarChart3, PieChart as PieIcon,
    Activity, Users, Briefcase, Calendar,
} from 'lucide-react';
import { useTheme } from '@/Components/ui/ThemeProvider';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

const PERIOD_LABELS = { week: 'Săptămână', month: 'Lună', year: 'An' };

const TYPE_LABELS = {
    apartment:  'Apartamente',
    house:      'Case',
    cottage:    'Vile',
    land:       'Terenuri',
    garage:     'Garaje',
    commercial: 'Comercial',
    office:     'Birouri',
};

const CONTACT_TYPE_LABELS = {
    buyer:    'Cumpărători',
    seller:   'Vânzători',
    tenant:   'Chiriași',
    landlord: 'Proprietari',
    developer:'Dezvoltatori',
};

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#14b8a6'];

const ADMIN_EXPORT_SECTIONS = [
    { id: 'summary',         label: 'Sumar agenție (proprietăți, contacte, apeluri, tranzacții, venit)' },
    { id: 'by_type',         label: 'Proprietăți pe tip' },
    { id: 'agents',          label: 'Agenți — performanță individuală' },
    { id: 'revenue_monthly', label: 'Venit pe luni (anul curent)' },
    { id: 'top_districts',   label: 'Top districte (piață)' },
    { id: 'avg_price',       label: 'Preț mediu €/m² pe district' },
    { id: 'ai_insights',     label: 'AI Insights — predicții, recomandări, prognoză' },
];

const REALTOR_EXPORT_SECTIONS = [
    { id: 'summary',         label: 'Sumar personal' },
    { id: 'top_properties',  label: 'Top 3 proprietăți după vizualizări' },
    { id: 'revenue_monthly', label: 'Venit pe luni (anul curent)' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

/**
 * 4-state trend formatting:
 *   null      → "Nou" (no prior data)
 *   0         → "0%" flat
 *   positive  → "+X%" green
 *   negative  → "X%" red
 */
function formatTrend(pct) {
    if (pct === null || pct === undefined) {
        return { text: 'Nou', color: 'text-slate-400', icon: '•' };
    }
    if (pct === 0) {
        return { text: '0%', color: 'text-slate-500', icon: '—' };
    }
    if (pct > 0) {
        return { text: `+${pct}%`, color: 'text-emerald-600', icon: '▲' };
    }
    return { text: `${pct}%`, color: 'text-red-600', icon: '▼' };
}

function formatMoney(n) {
    if (!n || n <= 0) return null;
    return `€${Number(n).toLocaleString('ro', { maximumFractionDigits: 0 })}`;
}

/**
 * Returns a theme-aware Recharts palette. Recharts colors flow through JS props
 * (fill, stroke), so Tailwind .dark overrides don't reach them — we read the
 * theme and switch palettes manually. Donut/bar series stay vivid because the
 * COLORS palette already works on both backgrounds; only chrome (grid, axes,
 * tooltip) needs adapting.
 */
function useChartTheme() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return {
        isDark,
        grid:     isDark ? 'rgba(255,255,255,.08)' : '#f1f5f9',
        axis:     isDark ? '#94a3b8' : '#64748b',
        axisLine: isDark ? 'rgba(255,255,255,.1)' : '#e2e8f0',
        tooltipStyle: {
            background:   isDark ? '#1e293b' : '#ffffff',
            border:       isDark ? '1px solid rgba(255,255,255,.1)' : '1px solid #e2e8f0',
            borderRadius: 8,
            color:        isDark ? '#f1f5f9' : '#0f172a',
            fontSize:     12,
            padding:      '6px 10px',
            boxShadow:    '0 4px 12px rgba(0,0,0,.15)',
        },
        tooltipLabel: { color: isDark ? '#cbd5e1' : '#475569' },
        tooltipItem:  { color: isDark ? '#f1f5f9' : '#0f172a' },
    };
}

// ─── Primitive components ────────────────────────────────────────────────────

function TrendIndicator({ pct }) {
    const t = formatTrend(pct);
    return <span className={`font-medium ${t.color}`}>{t.icon} {t.text}</span>;
}

function Sparkline({ data, color = '#3b82f6' }) {
    if (!data || data.length === 0) return <div className="h-8" />;
    const chartData = data.map((value, i) => ({ i, value: Number(value) || 0 }));
    return (
        <ResponsiveContainer width="100%" height={32}>
            <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

function KpiCard({ Icon, label, value, trend, sub, sparkline, sparklineColor = '#3b82f6' }) {
    return (
        <div className="bg-white border border-slate-200/70 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-slate-300/70 transition-all duration-200">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-[28px] font-bold tabular-nums leading-tight text-slate-900 mt-0.5">{value}</p>
                    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
                    {trend !== undefined && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                            <TrendIndicator pct={trend} />
                            <span className="text-slate-400">vs perioadă</span>
                        </div>
                    )}
                </div>
            </div>
            {sparkline && sparkline.length > 0 && (
                <div className="mt-3">
                    <Sparkline data={sparkline} color={sparklineColor} />
                </div>
            )}
        </div>
    );
}

function Card({ title, subtitle, children, padding = 'p-6' }) {
    return (
        <div className={`bg-white border border-slate-200/70 rounded-xl shadow-sm ${padding}`}>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            {(title || subtitle) && <div className="mb-4" />}
            {children}
        </div>
    );
}

function Badge({ children, color = 'slate' }) {
    const palette = {
        slate:   'bg-slate-100 text-slate-700',
        green:   'bg-emerald-100 text-emerald-700',
        amber:   'bg-amber-100 text-amber-700',
        blue:    'bg-blue-100 text-blue-700',
        red:     'bg-red-100 text-red-700',
        violet:  'bg-violet-100 text-violet-700',
    };
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${palette[color] ?? palette.slate}`}>
            {children}
        </span>
    );
}

// ─── Export modal (preserved logic; restyled lightly) ────────────────────────

function ExportModal({ open, onClose, format, period, isAdmin }) {
    const sectionsList = isAdmin ? ADMIN_EXPORT_SECTIONS : REALTOR_EXPORT_SECTIONS;
    const [selected, setSelected] = useState(() => sectionsList.map(s => s.id));

    if (!open) return null;

    const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const all    = () => setSelected(sectionsList.map(s => s.id));
    const none   = () => setSelected([]);

    const download = () => {
        if (selected.length === 0) return;
        const routeName = format === 'pdf' ? 'statistics.export.pdf' : 'statistics.export.csv';
        const url = route(routeName, { period, sections: selected.join(',') });
        if (format === 'pdf') {
            window.open(url, '_blank', 'noopener');
        } else {
            window.location.href = url;
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {format === 'pdf' ? 'Export PDF' : 'Export Excel'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                        aria-label="Închide"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                    Perioadă: <strong className="text-slate-700">{PERIOD_LABELS[period] ?? period ?? '—'}</strong>. Bifează secțiunile dorite.
                </p>

                <div className="flex gap-3 mb-3">
                    <button onClick={all}  className="text-xs font-medium text-blue-600 hover:underline">Selectează tot</button>
                    <button onClick={none} className="text-xs font-medium text-slate-500 hover:underline">Deselectează tot</button>
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {sectionsList.map(s => (
                        <label key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(s.id)}
                                onChange={() => toggle(s.id)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600 shrink-0"
                            />
                            <span className="text-sm text-slate-700">{s.label}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-50">
                        Anulează
                    </button>
                    <button
                        onClick={download}
                        disabled={selected.length === 0}
                        className="bg-blue-600 px-5 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Descarcă ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Admin: Overview tab ─────────────────────────────────────────────────────

function OverviewTab({
    propertiesTotal, propertiesActive, propertiesByType,
    propertiesTrendPct,
    scrapedTotal, scrapedByWeek,
    contactsTotal, contactsByType,
    callsPeriod, callsTotal, callConversion, callsTrendPct,
    dealsPeriod, revenuePeriod, revenuePrev, revenueTrendPct,
    avgCommission, avgDaysToClose,
    revenueByMonth,
    periodLabel,
}) {
    const ct = useChartTheme();
    const periodTag = periodLabel ?? 'Ultimele 30 zile';

    const propertiesByTypeArray = Object.entries(propertiesByType || {})
        .map(([key, value]) => ({ name: TYPE_LABELS[key] ?? key, value: Number(value) }))
        .filter(d => d.value > 0);

    const contactsByTypeArray = Object.entries(contactsByType || {})
        .map(([key, value]) => ({ name: CONTACT_TYPE_LABELS[key] ?? key, value: Number(value) }))
        .filter(d => d.value > 0);

    const scrapedSparkline = (scrapedByWeek || []).slice(-7).map(r => Number(r.total) || 0);

    const scrapedLineData = (scrapedByWeek || []).map(r => ({
        week:  `S${r.week}`,
        total: Number(r.total) || 0,
    }));

    const revenueLineData = (revenueByMonth || []).map(r => ({
        month: MONTH_NAMES[(Number(r.month) || 1) - 1] ?? r.month,
        total: Number(r.total) || 0,
    }));

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    Icon={Building}
                    label="Total anunțuri"
                    value={Number(propertiesTotal || 0).toLocaleString('ro')}
                    sub={`${propertiesActive ?? 0} active`}
                    trend={propertiesTrendPct}
                />
                <KpiCard
                    Icon={Globe}
                    label="Anunțuri piață"
                    value={Number(scrapedTotal || 0).toLocaleString('ro')}
                    sub="surse externe"
                    sparkline={scrapedSparkline}
                    sparklineColor="#3b82f6"
                />
                <KpiCard
                    Icon={Phone}
                    label={`Apeluri (${periodTag})`}
                    value={Number(callsPeriod || 0).toLocaleString('ro')}
                    sub={`Conversie ${callConversion ?? 0}% · total ${Number(callsTotal || 0).toLocaleString('ro')}`}
                    trend={callsTrendPct}
                />
                <KpiCard
                    Icon={Banknote}
                    label={`Venit (${periodTag})`}
                    value={
                        revenuePeriod > 0
                            ? `€${Number(revenuePeriod).toLocaleString('ro', { maximumFractionDigits: 0 })}`
                            : <span className="text-sm text-slate-400 font-normal">Niciun deal închis</span>
                    }
                    sub={revenuePrev > 0 ? `Anterior: ${formatMoney(revenuePrev)}` : undefined}
                    trend={revenuePeriod > 0 ? revenueTrendPct : undefined}
                />
            </div>

            {/* Two donuts side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Anunțuri pe tipuri" subtitle="distribuția portofoliului">
                    {propertiesByTypeArray.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">Niciun anunț înregistrat.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={propertiesByTypeArray}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    isAnimationActive={false}
                                >
                                    {propertiesByTypeArray.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={ct.tooltipStyle} labelStyle={ct.tooltipLabel} itemStyle={ct.tooltipItem} />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: 11, paddingTop: 12, color: ct.axis }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Clienți după tip" subtitle="contacte CRM">
                    {contactsByTypeArray.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">Niciun contact înregistrat.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={contactsByTypeArray}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    isAnimationActive={false}
                                >
                                    {contactsByTypeArray.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={ct.tooltipStyle} labelStyle={ct.tooltipLabel} itemStyle={ct.tooltipItem} />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: 11, paddingTop: 12, color: ct.axis }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Calls / conversion / time-to-close strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="p-5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Total apeluri</p>
                    <p className="text-2xl font-semibold tracking-tight text-slate-900">{Number(callsTotal || 0).toLocaleString('ro')}</p>
                    <p className="text-xs text-slate-500 mt-1">din toată perioada</p>
                </Card>
                <Card padding="p-5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Conversie apel → deal</p>
                    <p className="text-2xl font-semibold tracking-tight text-emerald-600">{callConversion ?? 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">deals închise / total apeluri</p>
                </Card>
                <Card padding="p-5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Zile medii până la tranzacție</p>
                    {avgDaysToClose ? (
                        <p className="text-2xl font-semibold tracking-tight text-blue-600">{avgDaysToClose}</p>
                    ) : (
                        <p className="text-sm font-medium text-slate-400 mt-1">Date insuficiente</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">de la publicare la închidere</p>
                </Card>
            </div>

            {/* Revenue line chart + financial summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <Card title={`Venituri pe luni (${new Date().getFullYear()})`} subtitle="comision închis lunar">
                        {revenueLineData.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-12">Niciun deal închis în acest an.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={revenueLineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                                    <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }}
                                           tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={ct.tooltipStyle}
                                        labelStyle={ct.tooltipLabel}
                                        itemStyle={ct.tooltipItem}
                                        formatter={(v) => [`€${Number(v).toLocaleString('ro')}`, 'Venit']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ fill: '#10b981', r: 3 }}
                                        activeDot={{ r: 5 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                <Card title="Indicatori financiari" subtitle={periodTag}>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Venit perioadă</span>
                            <span className="font-medium text-slate-900">
                                {revenuePeriod > 0 ? formatMoney(revenuePeriod) : '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Anterior</span>
                            <span className="font-medium text-slate-900">
                                {revenuePrev > 0 ? formatMoney(revenuePrev) : '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Comision mediu</span>
                            <span className="font-medium text-slate-900">
                                {avgCommission > 0 ? formatMoney(avgCommission) : '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Tranzacții perioadă</span>
                            <span className="font-medium text-slate-900">{dealsPeriod ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-slate-600">Clienți activi</span>
                            <span className="font-medium text-slate-900">{contactsTotal ?? 0}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Scraped weekly line chart */}
            <Card title="Evoluție anunțuri piață" subtitle="anunțuri noi 999.md, pe săptămâni">
                {scrapedLineData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">Nu există date de piață.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={scrapedLineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                            <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                            <Tooltip contentStyle={ct.tooltipStyle} labelStyle={ct.tooltipLabel} itemStyle={ct.tooltipItem} />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 2 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Card>
        </div>
    );
}

// ─── Admin: Agents tab ───────────────────────────────────────────────────────

function AgentsTab({ agentStats }) {
    const stats = agentStats ?? [];

    if (stats.length === 0) {
        return (
            <Card title="Eficiență agenți" subtitle="Vizualizări → Apeluri → Tranzacții">
                <p className="text-sm text-slate-400 text-center py-12">Niciun agent înregistrat.</p>
            </Card>
        );
    }

    const withDays = stats.filter(a => a.avg_days_close != null);
    const maxDays  = Math.max(1, ...withDays.map(a => a.avg_days_close));

    return (
        <div className="space-y-6">
            <Card padding="p-0">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900">Eficiență agenți</h3>
                    <p className="text-xs text-slate-500 mt-1">Vizualizări → Apeluri → Tranzacții</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th rowSpan={2} className="px-6 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Agent</th>
                                <th rowSpan={2} className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Anunțuri</th>
                                <th rowSpan={2} className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Vizualizări</th>
                                <th colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-200">Web Offers</th>
                                <th colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-200">Anunțuri proprii</th>
                                <th rowSpan={2} className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Tranzacții</th>
                                <th rowSpan={2} className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Venit</th>
                                <th rowSpan={2} className="px-6 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500 align-bottom">Zile medii</th>
                            </tr>
                            <tr>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Văz.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Înc.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Reuș.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Înc.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Reuș.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400">Ref.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {stats.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-3 font-medium text-slate-900">{a.name}</td>
                                    <td className="px-3 py-3 text-right text-slate-700">{a.properties_count ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-slate-700">{Number(a.views_total ?? 0).toLocaleString('ro')}</td>
                                    <td className="px-3 py-3 text-right text-slate-700">{a.wo_views ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-slate-700">{a.wo_attempts ?? 0}</td>
                                    <td className="px-3 py-3 text-right font-medium text-emerald-600">{a.wo_success ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-slate-700">{a.own_attempts ?? 0}</td>
                                    <td className="px-3 py-3 text-right font-medium text-emerald-600">{a.own_success ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-rose-600">{a.own_refused ?? 0}</td>
                                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{a.deals_count ?? 0}</td>
                                    <td className="px-3 py-3 text-right font-medium text-slate-900">
                                        {a.revenue > 0 ? formatMoney(a.revenue) : '—'}
                                    </td>
                                    <td className="px-6 py-3 text-right text-slate-500">
                                        {a.avg_days_close != null ? `${a.avg_days_close}z` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Speed ranking */}
            <Card title="Ritm de realizare" subtitle="zile medii până la închiderea unei tranzacții (mai puține = mai rapid)">
                {withDays.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Date insuficiente.</p>
                ) : (
                    <div className="space-y-3">
                        {withDays
                            .slice()
                            .sort((a, b) => a.avg_days_close - b.avg_days_close)
                            .map((a, i) => (
                                <div key={a.id} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-4 tabular-nums">{i + 1}</span>
                                    <span className="text-sm font-medium text-slate-700 w-40 shrink-0 truncate">{a.name}</span>
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${Math.round((a.avg_days_close / maxDays) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-slate-700 w-14 text-right tabular-nums">{a.avg_days_close} zile</span>
                                </div>
                            ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

// ─── Admin: Market tab ───────────────────────────────────────────────────────

function MarketTab({ scrapedTotal, scrapedByWeek, avgPriceByDistrict, top5Districts }) {
    const ct = useChartTheme();

    const scrapedLineData = (scrapedByWeek || []).map(r => ({
        week:  `S${r.week}`,
        total: Number(r.total) || 0,
    }));

    const districtBarData = (avgPriceByDistrict || []).map(r => ({
        district: r.district,
        price:    Number(r.avg_price) || 0,
        count:    Number(r.count) || 0,
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    Icon={Globe}
                    label="Total anunțuri piață"
                    value={Number(scrapedTotal || 0).toLocaleString('ro')}
                    sub="surse externe agregate"
                />
                <KpiCard
                    Icon={MapPin}
                    label="Districte monitorizate"
                    value={(avgPriceByDistrict || []).length}
                    sub="cu date de preț (≥5 anunțuri)"
                />
                <KpiCard
                    Icon={TrendingUp}
                    label="Top district activ"
                    value={top5Districts?.[0]?.district ?? '—'}
                    sub={top5Districts?.[0] ? `${top5Districts[0].count} anunțuri săpt.` : 'fără date recente'}
                />
            </div>

            <Card title="Dinamica pieței" subtitle="anunțuri noi 999.md pe săptămâni (anul curent)">
                {scrapedLineData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">Nu există date de piață.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={scrapedLineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                            <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                            <Tooltip contentStyle={ct.tooltipStyle} labelStyle={ct.tooltipLabel} itemStyle={ct.tooltipItem} />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 2 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Preț mediu €/m² pe districte" subtitle="top 8 după preț (apartamente + case)">
                    {districtBarData.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">Nu există date de preț.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart
                                data={districtBarData}
                                layout="vertical"
                                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                                <YAxis dataKey="district" type="category" width={120}
                                       tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                                <Tooltip
                                    contentStyle={ct.tooltipStyle}
                                    labelStyle={ct.tooltipLabel}
                                    itemStyle={ct.tooltipItem}
                                    cursor={{ fill: ct.isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)' }}
                                    formatter={(v) => [`€${Number(v).toLocaleString('ro')}/m²`, 'Preț mediu']}
                                />
                                <Bar dataKey="price" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Top 5 districte după cerere" subtitle="anunțuri noi în ultimele 7 zile">
                    {(top5Districts || []).length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">Nu există date recente.</p>
                    ) : (
                        <div className="space-y-3">
                            {top5Districts.map((d, i) => {
                                const max = Math.max(1, ...top5Districts.map(x => x.count));
                                return (
                                    <div key={d.district} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 w-4 tabular-nums">{i + 1}</span>
                                        <span className="text-sm font-medium text-slate-700 w-32 shrink-0 truncate">{d.district}</span>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.round((d.count / max) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 w-12 text-right tabular-nums">{d.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

// ─── Admin: AI Insights tab ──────────────────────────────────────────────────

function AIInsightsTab({ aiInsights }) {
    const trends           = aiInsights?.trends ?? [];
    const recommendations  = aiInsights?.priceRecommendations ?? [];
    const forecast         = aiInsights?.forecast;

    return (
        <div className="space-y-6">
            <Card padding="p-5">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">AI Insights</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Analiza predictivă pe datele istorice ale agenției și tendințele pieței.
                            Recomandările sunt generate automat și nu constituie garanții financiare.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Predicții tendințe" subtitle="segmente cu cea mai mare schimbare în ultimele 30 zile">
                    {trends.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">
                            Nu există suficiente date de piață. Reîncearcă după ≥60 zile de anunțuri colectate.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {trends.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="text-xl shrink-0">{item.icon}</span>
                                    <p className="flex-1 text-sm text-slate-700">{item.text}</p>
                                    <Badge color={item.color}>{item.badge}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Recomandări optimizare prețuri" subtitle="per agent, vs. mediana pieței">
                    {recommendations.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">Niciun agent înregistrat.</p>
                    ) : (
                        <div className="space-y-3">
                            {recommendations.map((rec, i) => (
                                <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <p className="text-sm font-medium text-slate-900 mb-0.5">{rec.name}</p>
                                    <p className="text-xs text-slate-600">{rec.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Card title="Prognoză venit (estimat AI)" subtitle={forecast ? forecast.basis : 'fără date suficiente'}>
                {forecast ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Luna viitoare',     data: forecast.next_month,   color: 'text-emerald-600' },
                            { label: 'Trimestrul viitor', data: forecast.next_quarter, color: 'text-blue-600' },
                            { label: 'Sfârșitul anului',  data: forecast.next_year,    color: 'text-violet-600' },
                        ].map(item => {
                            const pct  = item.data?.pct ?? 0;
                            const sign = pct >= 0 ? '+' : '';
                            return (
                                <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-center">
                                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                                    <p className={`text-2xl font-semibold tracking-tight ${item.color}`}>{sign}{pct}%</p>
                                    <p className="text-xs text-slate-400 mt-1">~ €{Number(item.data?.amount ?? 0).toLocaleString('ro')}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">
                        Sunt necesare cel puțin 2 luni de tranzacții închise pentru a genera o prognoză.
                    </p>
                )}
            </Card>
        </div>
    );
}

// ─── Admin dashboard shell (tabs + content) ──────────────────────────────────

function AdminDashboard(props) {
    const [activeTab, setActiveTab] = useState('overview');
    const [exportFormat, setExportFormat] = useState(null);

    const tabs = [
        { id: 'overview', label: 'Prezentare generală' },
        { id: 'agents',   label: 'Agenți' },
        // External tab — navigates to the standalone /deals page instead of
        // swapping local content. Detected by the presence of `href`.
        { id: 'deals',    label: 'Tranzacții',   href: '/deals', Icon: Briefcase },
        { id: 'market',   label: 'Piață' },
        { id: 'ai',       label: 'AI Insights' },
    ];

    return (
        <>
            {/* Tabs row + export buttons */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => t.href ? router.visit(t.href) : setActiveTab(t.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                                activeTab === t.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {t.Icon && <t.Icon className="w-3.5 h-3.5" />}
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setExportFormat('pdf')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                        title="Configurează și descarcă PDF"
                    >
                        <FileText className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => setExportFormat('csv')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                        title="Configurează și descarcă Excel/CSV"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                    </button>
                </div>
            </div>

            <ExportModal
                open={exportFormat !== null}
                onClose={() => setExportFormat(null)}
                format={exportFormat}
                period={props.period}
                isAdmin={true}
            />

            {activeTab === 'overview' && <OverviewTab {...props} />}
            {activeTab === 'agents'   && <AgentsTab   {...props} />}
            {activeTab === 'market'   && <MarketTab   {...props} />}
            {activeTab === 'ai'       && <AIInsightsTab {...props} />}
        </>
    );
}

// ─── Realtor view ────────────────────────────────────────────────────────────

function RealtorDashboard({
    propertiesTotal, propertiesActive, propertiesArchived,
    contactsTotal, viewsTotal, top3Properties,
    myCallsTotal, myCallsPeriod, callConversion,
    myDealsTotal, myDealsInProgress,
    dealsPeriod, revenuePeriod, revenueTotal, revenueByMonth,
    period, periodLabel,
}) {
    const ct = useChartTheme();
    const [exportFormat, setExportFormat] = useState(null);
    const periodTag = periodLabel ?? PERIOD_LABELS[period] ?? 'Lună';

    const revenueLineData = (revenueByMonth || []).map(r => ({
        month: MONTH_NAMES[(Number(r.month) || 1) - 1] ?? r.month,
        total: Number(r.total) || 0,
    }));

    return (
        <>
            <div className="flex items-center justify-end gap-2 mb-6 flex-wrap">
                <p className="text-sm text-slate-500 mr-auto">
                    Statistici personale. Administratorul agenției are acces la datele complete.
                </p>
                <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                >
                    <FileText className="w-4 h-4" />
                    PDF
                </button>
                <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                </button>
            </div>

            <ExportModal
                open={exportFormat !== null}
                onClose={() => setExportFormat(null)}
                format={exportFormat}
                period={period}
                isAdmin={false}
            />

            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        Icon={Building}
                        label="Imobiliare"
                        value={Number(propertiesTotal || 0).toLocaleString('ro')}
                        sub={`${propertiesActive ?? 0} active · ${propertiesArchived ?? 0} arhivate`}
                    />
                    <KpiCard
                        Icon={Eye}
                        label="Total vizualizări"
                        value={Number(viewsTotal || 0).toLocaleString('ro')}
                        sub="cumulativ"
                    />
                    <KpiCard
                        Icon={Phone}
                        label={`Apeluri (${periodTag})`}
                        value={Number(myCallsPeriod || 0).toLocaleString('ro')}
                        sub={`Conversie ${callConversion ?? 0}% · total ${Number(myCallsTotal || 0).toLocaleString('ro')}`}
                    />
                    <KpiCard
                        Icon={Banknote}
                        label={`Venit (${periodTag})`}
                        value={
                            revenuePeriod > 0
                                ? formatMoney(revenuePeriod)
                                : <span className="text-sm text-slate-400 font-normal">Niciun deal închis</span>
                        }
                        sub={revenueTotal > 0 ? `Total: ${formatMoney(revenueTotal)}` : undefined}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card padding="p-5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Tranzacții închise</p>
                        <p className="text-2xl font-semibold tracking-tight text-emerald-600">{myDealsTotal ?? 0}</p>
                        <p className="text-xs text-slate-500 mt-1">total carieră</p>
                    </Card>
                    <Card padding="p-5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Tranzacții în lucru</p>
                        <p className="text-2xl font-semibold tracking-tight text-blue-600">{myDealsInProgress ?? 0}</p>
                        <p className="text-xs text-slate-500 mt-1">în desfășurare</p>
                    </Card>
                    <Card padding="p-5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Tranzacții perioadă</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-900">{dealsPeriod ?? 0}</p>
                        <p className="text-xs text-slate-500 mt-1">închise în {periodTag.toLowerCase()}</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Top 3 anunțuri" subtitle="după număr vizualizări">
                        {(top3Properties || []).length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Niciun anunț adăugat.</p>
                        ) : (
                            <div className="space-y-3">
                                {top3Properties.map((p, i) => (
                                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <span className="text-xs text-slate-400 w-4 tabular-nums">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{p.title || 'Fără titlu'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge color={p.status === 'active' ? 'green' : 'slate'}>
                                                    {p.status === 'active' ? 'Activ' : p.status}
                                                </Badge>
                                                <span className="text-xs text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-lg font-semibold tracking-tight text-slate-900">{p.views_count}</p>
                                            <p className="text-xs text-slate-500">vizualizări</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card title={`Venituri pe luni (${new Date().getFullYear()})`} subtitle="comision închis lunar">
                        {revenueLineData.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Niciun deal închis în acest an.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={revenueLineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }} />
                                    <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={{ stroke: ct.axisLine }} tickLine={{ stroke: ct.axisLine }}
                                           tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={ct.tooltipStyle}
                                        labelStyle={ct.tooltipLabel}
                                        itemStyle={ct.tooltipItem}
                                        formatter={(v) => [`€${Number(v).toLocaleString('ro')}`, 'Venit']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ fill: '#10b981', r: 3 }}
                                        activeDot={{ r: 5 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                <Card title="Contacte" subtitle="clienți activi în portofoliul tău">
                    <p className="text-2xl font-semibold tracking-tight text-slate-900">{contactsTotal ?? 0}</p>
                </Card>
            </div>
        </>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Index(props) {
    const { isAdmin, from, to, periodLabel } = props;

    const [fromDate, setFromDate] = useState(from || daysAgoISO(30));
    const [toDate,   setToDate]   = useState(to   || todayISO());

    function applyRange(newFrom, newTo) {
        setFromDate(newFrom);
        setToDate(newTo);
        router.get(
            route('statistics.index'),
            { from: newFrom, to: newTo },
            { preserveState: true, replace: true },
        );
    }

    function applyShortcut(days) {
        const newTo   = todayISO();
        const newFrom = days === 0 ? newTo : daysAgoISO(days);
        applyRange(newFrom, newTo);
    }

    return (
        <AppLayout title="">
            <Head title="Statistici" />

            {/* Sticky header — title + period filter. -mx-3 sm:-mx-6 cancels
                AppLayout's content padding so the divider line stretches edge
                to edge; the inner div restores the breathable horizontal pad. */}
            <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 mb-6 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                <div className="px-3 sm:px-6 py-4">
                    <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Statistici</h1>
                            <p className="text-xs text-slate-500 mt-0.5">{periodLabel ?? 'Ultimele 30 zile'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => applyShortcut(0)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                            Azi
                        </button>
                        <button
                            type="button"
                            onClick={() => applyShortcut(7)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                            7 zile
                        </button>
                        <button
                            type="button"
                            onClick={() => applyShortcut(30)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                            30 zile
                        </button>

                        <span className="text-slate-300 mx-1">|</span>

                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            max={toDate}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-700"
                        />
                        <span className="text-slate-400 text-xs">—</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            min={fromDate}
                            max={todayISO()}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-700"
                        />
                        <button
                            type="button"
                            onClick={() => applyRange(fromDate, toDate)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                        >
                            Aplică
                        </button>
                    </div>
                </div>
            </div>

            {isAdmin ? <AdminDashboard {...props} /> : <RealtorDashboard {...props} />}
        </AppLayout>
    );
}
