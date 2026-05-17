import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const TABS = [
    { key: 'all',         label: 'All',          icon: '📜' },
    { key: 'auth',        label: 'Auth',         icon: '🔑' },
    { key: 'payment',     label: 'Payment',      icon: '💳' },
    { key: 'super-admin', label: 'Super Admin',  icon: '🛡' },
    { key: 'ai',          label: 'AI',           icon: '🤖' },
    { key: 'moderation',  label: 'Moderation',   icon: '⚖' },
    { key: 'errors',      label: 'Errors',       icon: '⚠' },
];

function ActionPill({ action }) {
    const colorFor = (a) => {
        if (a.startsWith('super_admin.')) return 'bg-rose-100 text-rose-700';
        if (a.startsWith('auth.failed'))  return 'bg-rose-100 text-rose-700';
        if (a.startsWith('auth.'))        return 'bg-blue-100 text-blue-700';
        if (a.startsWith('subscription.'))return 'bg-emerald-100 text-emerald-700';
        if (a.startsWith('moderation.'))  return 'bg-amber-100 text-amber-700';
        if (a.startsWith('ai.'))          return 'bg-violet-100 text-violet-700';
        return 'bg-slate-100 text-slate-700';
    };
    return (
        <span className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded ${colorFor(action)}`}>
            {action}
        </span>
    );
}

export default function Index({ logs, tab, counts, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const setTab = (t) => router.get(route('super-admin.logs.index'), { ...filters, tab: t }, { preserveState: true });
    const submitSearch = (e) => {
        e.preventDefault();
        router.get(route('super-admin.logs.index'), { ...filters, tab, search }, { preserveState: true });
    };

    return (
        <SuperAdminLayout title="Logs" breadcrumb="Super Admin · Audit & Activity">
            <Head title="Logs — Super Admin" />

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-slate-100">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                                    tab === t.key
                                        ? 'border-slate-900 text-slate-900 bg-slate-50/60'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                                <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                                    tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>{counts[t.key]?.toLocaleString('ro')}</span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submitSearch} className="p-3 border-b border-slate-100 flex gap-2">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută în action, description, IP…"
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                        <button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-700">
                            Caută
                        </button>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-2.5 w-32">Time</th>
                                    <th className="px-4 py-2.5">User</th>
                                    <th className="px-4 py-2.5">Action</th>
                                    <th className="px-4 py-2.5">Description</th>
                                    <th className="px-4 py-2.5 w-24">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-mono text-xs">
                                {logs.data.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-sans">Niciun log în acest filtru.</td></tr>
                                ) : logs.data.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                                            {new Date(l.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2 font-sans">
                                            {l.user ? (
                                                <div className="leading-tight">
                                                    <div className="text-slate-800 font-semibold">{l.user.name}</div>
                                                    <div className="text-[10px] text-slate-400">{l.user.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">system</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2"><ActionPill action={l.action} /></td>
                                        <td className="px-4 py-2 text-slate-700 max-w-md truncate font-sans" title={l.description}>{l.description ?? '—'}</td>
                                        <td className="px-4 py-2 text-slate-400">{l.ip_address ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {logs.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                Pagina {logs.current_page} din {logs.last_page} · {logs.total.toLocaleString('ro')} loguri
                            </span>
                            <div className="flex gap-1">
                                {logs.links.map((l, i) => (
                                    <button
                                        key={i}
                                        onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                                        disabled={!l.url}
                                        className={`px-2.5 py-1 rounded font-semibold ${
                                            l.active ? 'bg-slate-900 text-white' :
                                            l.url ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'opacity-30'
                                        }`}
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
