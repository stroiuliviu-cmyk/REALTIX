import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const PRIORITY_COLORS = {
    urgent: 'bg-rose-600 text-white',
    high:   'bg-rose-100 text-rose-700',
    normal: 'bg-slate-100 text-slate-700',
    low:    'bg-slate-50 text-slate-500',
};

const STATUS_COLORS = {
    open:     'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    resolved: 'bg-blue-100 text-blue-700',
    closed:   'bg-slate-200 text-slate-500',
};

export default function Index({ tickets, status, counts, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const setStatus = (s) => router.get(route('super-admin.support.index'), { ...filters, status: s }, { preserveState: true });
    const submitSearch = (e) => {
        e.preventDefault();
        router.get(route('super-admin.support.index'), { ...filters, status, search }, { preserveState: true });
    };

    const TABS = [
        { key: 'open',     label: 'Open',     color: 'emerald' },
        { key: 'pending',  label: 'Pending',  color: 'amber' },
        { key: 'resolved', label: 'Resolved', color: 'blue' },
        { key: 'closed',   label: 'Closed',   color: 'slate' },
        { key: 'all',      label: 'Toate',    color: 'slate' },
    ];

    return (
        <SuperAdminLayout title="Support Center" breadcrumb="Super Admin · Tickets">
            <Head title="Support — Super Admin" />

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-slate-100">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setStatus(t.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                                    status === t.key
                                        ? 'border-slate-900 text-slate-900 bg-slate-50/60'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {t.label}
                                {t.key !== 'all' && (
                                    <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                                        status === t.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>{counts[t.key] ?? 0}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submitSearch} className="p-3 border-b border-slate-100 flex gap-2 flex-wrap items-center">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută în subject…"
                            className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                        <select
                            value={filters.priority ?? ''}
                            onChange={e => router.get(route('super-admin.support.index'), { ...filters, status, priority: e.target.value }, { preserveState: true })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        >
                            <option value="">Toate prioritățile</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                        </select>
                        <button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-700">
                            Caută
                        </button>
                    </form>

                    <div className="divide-y divide-slate-50">
                        {tickets.data.length === 0 ? (
                            <div className="p-12 text-center text-sm text-slate-400">
                                🎉 Niciun ticket „{status}" momentan.
                            </div>
                        ) : tickets.data.map(t => (
                            <Link
                                key={t.id}
                                href={`/super-admin/support/${t.id}`}
                                className="block px-5 py-4 hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                                                {t.priority}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
                                                {t.status}
                                            </span>
                                            <span className="text-xs text-slate-400">#{t.id}</span>
                                        </div>
                                        <div className="font-semibold text-slate-900 mt-1.5">{t.subject}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            <strong className="text-slate-700">{t.user?.name}</strong>
                                            {t.agency && <> · {t.agency.name}</>}
                                            <> · {new Date(t.created_at).toLocaleDateString('ro')}</>
                                            {t.assigned_to && <> · Asignat: <strong className="text-blue-600">{t.assigned_to.name}</strong></>}
                                        </div>
                                    </div>
                                    {t.last_reply_at && (
                                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                            Ultimul reply<br />
                                            <strong className="text-slate-600">{new Date(t.last_reply_at).toLocaleDateString('ro')}</strong>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {tickets.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                Pagina {tickets.current_page} din {tickets.last_page} · {tickets.total} tickets
                            </span>
                            <div className="flex gap-1">
                                {tickets.links.map((l, i) => (
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
