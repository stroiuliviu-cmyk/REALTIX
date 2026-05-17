import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function BlacklistForm() {
    const { data, setData, post, processing, reset } = useForm({
        ip:         '',
        reason:     '',
        expires_at: '',
    });
    const submit = (e) => {
        e.preventDefault();
        post(route('super-admin.security.blacklist'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };
    return (
        <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-32">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IP</label>
                <input value={data.ip} onChange={e => setData('ip', e.target.value)} placeholder="192.0.2.1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-rose-400" />
            </div>
            <div className="flex-1 min-w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motiv</label>
                <input value={data.reason} onChange={e => setData('reason', e.target.value)} placeholder="Brute force, spam, abuse…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiră (opțional)</label>
                <input type="datetime-local" value={data.expires_at} onChange={e => setData('expires_at', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
            </div>
            <button type="submit" disabled={processing} className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                🚫 Blacklist
            </button>
        </form>
    );
}

function Panel({ title, icon, children, badge }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <span>{icon}</span>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {badge != null && badge > 0 && (
                    <span className="ml-auto bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function Index({ failedLogins, bruteForceCandidates, blacklist, activeImpersonations, recentImpersonations }) {
    const unblacklist = (entry) => {
        if (!confirm(`Eliberare IP ${entry.ip}?`)) return;
        router.delete(route('super-admin.security.unblacklist', entry.id), { preserveScroll: true });
    };

    const quickBlacklistFromBrute = (ip) => {
        if (!confirm(`Blacklist IP ${ip}?`)) return;
        router.post(route('super-admin.security.blacklist'), { ip, reason: 'Brute force (auto from suspicious activity)' }, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Security Center" breadcrumb="Super Admin · Security">
            <Head title="Security — Super Admin" />

            <div className="space-y-5">
                <Panel title="IP Blacklist" icon="🚫" badge={blacklist.total}>
                    <BlacklistForm />
                    <div className="mt-5">
                        {blacklist.data.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Niciun IP blocat momentan.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs font-bold text-slate-500 uppercase">
                                        <tr className="text-left">
                                            <th className="py-2">IP</th>
                                            <th className="py-2">Motiv</th>
                                            <th className="py-2">Blocat de</th>
                                            <th className="py-2">Expiră</th>
                                            <th className="py-2 text-right">Acțiune</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {blacklist.data.map(b => (
                                            <tr key={b.id}>
                                                <td className="py-2 font-mono text-slate-800">{b.ip}</td>
                                                <td className="py-2 text-slate-600 max-w-xs truncate">{b.reason ?? '—'}</td>
                                                <td className="py-2 text-slate-500">{b.blocked_by?.name ?? 'system'}</td>
                                                <td className="py-2 text-xs text-slate-400">{b.expires_at ? new Date(b.expires_at).toLocaleDateString('ro') : 'permanent'}</td>
                                                <td className="py-2 text-right">
                                                    <button onClick={() => unblacklist(b)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2">
                                                        ✓ Unblock
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Panel>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Panel title="Brute force suspecte (24h, ≥5 încercări)" icon="⚠" badge={bruteForceCandidates.length}>
                        {bruteForceCandidates.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Nicio activitate suspectă.</p>
                        ) : (
                            <div className="space-y-2">
                                {bruteForceCandidates.map(b => (
                                    <div key={b.ip_address} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                                        <span className="font-mono text-sm text-slate-800 flex-1">{b.ip_address}</span>
                                        <span className="text-xs font-bold text-amber-700">{b.attempts} încercări</span>
                                        <button
                                            onClick={() => quickBlacklistFromBrute(b.ip_address)}
                                            className="text-xs font-bold bg-rose-600 text-white rounded px-2 py-1 hover:bg-rose-700"
                                        >🚫 Blacklist</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel title="Impersonations active" icon="👤" badge={activeImpersonations.length}>
                        {activeImpersonations.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Niciun super admin nu imită un user momentan.</p>
                        ) : (
                            <div className="space-y-2">
                                {activeImpersonations.map(i => (
                                    <div key={i.id} className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                                        <div className="text-sm">
                                            <strong className="text-rose-900">{i.super_admin?.name}</strong>{' '}
                                            <span className="text-slate-500">→</span>{' '}
                                            <strong className="text-rose-900">{i.target?.name}</strong>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {i.reason ?? '—'} · pornit {new Date(i.started_at).toLocaleString('ro-RO')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <Panel title="Login-uri eșuate recente (50)" icon="🔑">
                    {failedLogins.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Niciun login eșuat înregistrat.</p>
                    ) : (
                        <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                            {failedLogins.map(l => (
                                <div key={l.id} className="flex items-center gap-3 py-1 px-2 hover:bg-slate-50 rounded">
                                    <span className="text-slate-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-rose-600 flex-1 truncate">{l.description}</span>
                                    <span className="text-slate-500">{l.ip_address ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                {recentImpersonations.length > 0 && (
                    <Panel title="Impersonations recente (15)" icon="📜">
                        <div className="space-y-1 text-sm">
                            {recentImpersonations.map(i => (
                                <div key={i.id} className="flex items-center gap-3 py-1 text-xs">
                                    <span className="text-slate-400 whitespace-nowrap">{new Date(i.started_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short' })}</span>
                                    <span className="text-slate-700 font-semibold">{i.super_admin?.name}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-slate-700">{i.target?.name}</span>
                                    <span className="ml-auto text-slate-400">{i.reason ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}
            </div>
        </SuperAdminLayout>
    );
}
