import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link } from '@inertiajs/react';

const PLAN_LABELS = { starter: 'Starter', medium: 'Medium', pro: 'Pro' };
const PLAN_COLORS = {
    starter: 'bg-slate-100 text-slate-700',
    medium:  'bg-blue-100 text-blue-700',
    pro:     'bg-violet-100 text-violet-700',
};

function Stat({ label, value, sub, icon, accent = 'blue' }) {
    const accents = {
        blue:    'from-blue-500 to-blue-700',
        emerald: 'from-emerald-500 to-emerald-700',
        violet:  'from-violet-500 to-violet-700',
        amber:   'from-amber-500 to-amber-700',
        rose:    'from-rose-500 to-rose-700',
        slate:   'from-slate-500 to-slate-700',
    };
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</div>
                <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${accents[accent]} text-white flex items-center justify-center text-base shadow`}>
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

function MiniSparkline({ data }) {
    if (!data?.length) return <div className="text-xs text-slate-400">Fără date</div>;
    const max = Math.max(...data.map(d => d.total), 1);
    return (
        <div className="flex items-end gap-1 h-20">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end" title={`${d.day}: ${d.total}`}>
                    <div
                        className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all hover:from-blue-700"
                        style={{ height: `${(d.total / max) * 100}%`, minHeight: 2 }}
                    />
                </div>
            ))}
        </div>
    );
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard({ stats, planBreakdown = {}, userTrend = [], recentUsers = [], recentAgencies = [] }) {
    return (
        <SuperAdminLayout title="Admin · Panou de control">
            <Head title="Admin · Dashboard" />

            <div className="space-y-6">

                {/* Top stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat label="Utilizatori"        value={stats.users_total}         sub={`+${stats.users_new_month} luna asta`} icon="👥" accent="blue" />
                    <Stat label="Agenții"            value={stats.agencies_total}      sub={`+${stats.agencies_new_month} luna asta`} icon="🏢" accent="violet" />
                    <Stat label="Proprietăți"        value={stats.properties_total}    icon="🏠" accent="emerald" />
                    <Stat label="Trial activ"        value={stats.agencies_trialing}   sub="agenții în perioadă de probă" icon="⏳" accent="amber" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat label="Utilizatori 7 zile" value={stats.users_new_week}      icon="📈" accent="emerald" />
                    <Stat label="Contacte CRM"       value={stats.contacts_total}      icon="📇" accent="slate" />
                    <Stat label="Tranzacții"         value={stats.deals_total}         icon="💼" accent="rose" />
                    <Stat label="Agenții cu plan"    value={stats.agencies_active}     icon="✓" accent="blue" />
                </div>

                {/* Trend + Plan breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Înregistrări utilizatori</h3>
                                <p className="text-xs text-slate-400">Ultimele 30 de zile</p>
                            </div>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 rounded-full px-3 py-1">
                                {userTrend.reduce((a, d) => a + d.total, 0)} total
                            </span>
                        </div>
                        <MiniSparkline data={userTrend} />
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Distribuție pachete</h3>
                        <div className="space-y-2">
                            {Object.entries(planBreakdown).map(([plan, count]) => (
                                <div key={plan} className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {PLAN_LABELS[plan] ?? plan}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700">{count}</span>
                                </div>
                            ))}
                            {Object.keys(planBreakdown).length === 0 && (
                                <div className="text-xs text-slate-400">Nicio agenție</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-900">Utilizatori recenți</h3>
                            <Link href={route('super-admin.users.index')} className="text-xs font-semibold text-blue-700 hover:underline">
                                Vezi toți →
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentUsers.map(u => (
                                <div key={u.id} className="py-2.5 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div>
                                        <div className="text-xs text-slate-400 truncate">{u.email} · {u.agency?.name ?? '—'}</div>
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0 ml-3">{fmtDate(u.created_at)}</span>
                                </div>
                            ))}
                            {recentUsers.length === 0 && <div className="text-xs text-slate-400 py-3">Niciun utilizator</div>}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-900">Agenții recente</h3>
                            <Link href={route('super-admin.agencies.index')} className="text-xs font-semibold text-blue-700 hover:underline">
                                Vezi toate →
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentAgencies.map(a => (
                                <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{a.name}</div>
                                        <div className="text-xs text-slate-400">{a.users_count} utilizatori · {fmtDate(a.created_at)}</div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${PLAN_COLORS[a.subscription_plan] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {PLAN_LABELS[a.subscription_plan] ?? a.subscription_plan}
                                    </span>
                                </div>
                            ))}
                            {recentAgencies.length === 0 && <div className="text-xs text-slate-400 py-3">Nicio agenție</div>}
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
