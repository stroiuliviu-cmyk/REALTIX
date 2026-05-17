import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

function formatBytes(b) {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let v = Number(b);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function Stat({ label, value, sub }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

const PLAN_COLOR = { starter: 'bg-slate-100 text-slate-700', medium: 'bg-blue-100 text-blue-700', pro: 'bg-violet-100 text-violet-700' };

export default function Show({ agency, stats, invoices, recentActivity, plans, planLabels }) {
    const [planMenu, setPlanMenu] = useState(false);

    const suspended = !!agency.suspended_at;
    const suspendOrActivate = () => {
        const verb = suspended ? 'reactivezi' : 'SUSPENZI';
        if (!confirm(`Sigur ${verb} „${agency.name}"?`)) return;
        const action = suspended ? 'activate' : 'suspend';
        router.post(route(`super-admin.agencies.${action}`, agency.id), {}, { preserveScroll: true });
    };

    const changePlan = (slug) => {
        if (slug === agency.subscription_plan) { setPlanMenu(false); return; }
        if (!confirm(`Schimbi planul agenției la „${planLabels[slug]}"?`)) return;
        router.patch(route('super-admin.agencies.plan', agency.id), { plan: slug }, {
            preserveScroll: true,
            onSuccess: () => setPlanMenu(false),
        });
    };

    const remove = () => {
        if (!confirm(`Șterge definitiv agenția „${agency.name}" + toate datele?`)) return;
        router.delete(route('super-admin.agencies.destroy', agency.id));
    };

    return (
        <SuperAdminLayout breadcrumb={<Link href="/super-admin/agencies" className="hover:text-slate-700">Agencies</Link>}>
            <Head title={`${agency.name} — Super Admin`} />

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-slate-900">{agency.name}</h1>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_COLOR[agency.subscription_plan] ?? 'bg-slate-100'}`}>
                                    {planLabels[agency.subscription_plan] ?? agency.subscription_plan}
                                </span>
                                {suspended ? (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                                        ⏸ Suspended {new Date(agency.suspended_at).toLocaleDateString('ro')}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                        ✓ Active
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                                #{agency.id} · slug: {agency.slug}
                                {agency.stripe_id && <> · Stripe: {agency.stripe_id}</>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                                <button onClick={() => setPlanMenu(o => !o)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                                    Plan ▾
                                </button>
                                {planMenu && (
                                    <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 z-10 w-44">
                                        {plans.map(p => (
                                            <button
                                                key={p.slug}
                                                onClick={() => changePlan(p.slug)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${p.slug === agency.subscription_plan ? 'font-bold text-slate-900' : 'text-slate-600'}`}
                                            >
                                                {planLabels[p.slug]} · €{Number(p.price_monthly).toFixed(0)}
                                                {p.slug === agency.subscription_plan && ' ✓'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={suspendOrActivate}
                                className={`rounded-lg px-3 py-2 text-sm font-bold ${suspended ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                            >
                                {suspended ? '↻ Activate' : '⏸ Suspend'}
                            </button>

                            <button onClick={remove} className="rounded-lg bg-rose-600 text-white px-3 py-2 text-sm font-bold hover:bg-rose-700">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="Users" value={agency.users?.length ?? 0} />
                    <Stat label="Properties" value={stats.properties} />
                    <Stat label="Contacts" value={stats.contacts} />
                    <Stat label="Deals" value={stats.deals} />
                    <Stat label="Media size" value={formatBytes(stats.media_size)} sub={`AI: ${stats.ai_requests} req`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Utilizatori ({agency.users?.length ?? 0})</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {(agency.users ?? []).map(u => (
                                <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                        {u.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                                        <div className="text-xs text-slate-400">{u.email}</div>
                                    </div>
                                    {!u.is_active && <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Inactive</span>}
                                </div>
                            ))}
                            {(agency.users ?? []).length === 0 && (
                                <p className="px-5 py-6 text-center text-sm text-slate-400">Niciun user.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Stripe invoices (10 cele mai recente)</h3>
                        </div>
                        {invoices.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-slate-400">
                                {agency.stripe_id ? 'Niciun invoice.' : 'Agenția nu are Stripe customer.'}
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {invoices.map((inv, i) => (
                                    <div key={i} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                                        <span className="text-slate-500">{inv.date}</span>
                                        <span className="font-bold text-slate-800 flex-1">{inv.total}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {inv.status}
                                        </span>
                                        {inv.pdf && (
                                            <a href={inv.pdf} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">PDF ↓</a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Activity timeline (20)</h3>
                    </div>
                    {recentActivity.length === 0 ? (
                        <p className="px-5 py-6 text-center text-sm text-slate-400">Nicio activitate.</p>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {recentActivity.map(a => (
                                <div key={a.id} className="px-5 py-2 flex items-center gap-3 text-xs">
                                    <span className="text-slate-400 font-mono whitespace-nowrap">{new Date(a.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{a.action}</span>
                                    <span className="text-slate-700 flex-1 truncate">{a.description ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
