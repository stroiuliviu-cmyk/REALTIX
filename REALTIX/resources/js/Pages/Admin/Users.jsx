import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', realtor: 'Agent' };
const ROLE_COLORS = {
    super_admin: 'bg-rose-100 text-rose-700',
    admin:       'bg-blue-100 text-blue-700',
    realtor:     'bg-emerald-100 text-emerald-700',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Users({ users, filters = {}, agencies = [] }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (params) => {
        const merged = { ...filters, ...params };
        Object.keys(merged).forEach(k => { if (merged[k] === '' || merged[k] == null) delete merged[k]; });
        router.get('/admin/users', merged, { preserveState: true, replace: true });
    };

    const toggleActive = (u) => {
        if (!confirm(`Sigur ${u.is_active ? 'dezactivezi' : 'activezi'} contul ${u.email}?`)) return;
        router.patch(`/admin/users/${u.id}/toggle-active`, {}, { preserveScroll: true });
    };

    const remove = (u) => {
        if (!confirm(`Sigur ștergi definitiv contul ${u.email}? Acțiunea NU se poate anula.`)) return;
        router.delete(`/admin/users/${u.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout title="Admin · Utilizatori">
            <Head title="Admin · Utilizatori" />

            <div className="space-y-4">

                {/* Filters bar */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && apply({ search })}
                        placeholder="Caută nume, email, telefon..."
                        className="flex-1 min-w-60 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />

                    <select
                        value={filters.agency_id ?? ''}
                        onChange={e => apply({ agency_id: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Toate agențiile</option>
                        {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <select
                        value={filters.role ?? ''}
                        onChange={e => apply({ role: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Toate rolurile</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin agenție</option>
                        <option value="realtor">Agent</option>
                    </select>

                    <select
                        value={filters.status ?? ''}
                        onChange={e => apply({ status: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Toate statusurile</option>
                        <option value="active">Activ</option>
                        <option value="inactive">Dezactivat</option>
                    </select>

                    <span className="text-xs font-bold text-slate-500 ml-auto">
                        {users.total} utilizatori
                    </span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="text-left px-5 py-3">Nume / Email</th>
                                <th className="text-left px-5 py-3">Agenție</th>
                                <th className="text-left px-5 py-3">Rol</th>
                                <th className="text-left px-5 py-3">Status</th>
                                <th className="text-left px-5 py-3">Înregistrat</th>
                                <th className="text-right px-5 py-3">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.data.map(u => {
                                const role = u.roles?.[0]?.name;
                                return (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-slate-900">{u.name}</div>
                                            <div className="text-xs text-slate-400">{u.email}</div>
                                        </td>
                                        <td className="px-5 py-3 text-slate-700">{u.agency?.name ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-5 py-3">
                                            {role ? (
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-600'}`}>
                                                    {ROLE_LABELS[role] ?? role}
                                                </span>
                                            ) : <span className="text-slate-300 text-xs">fără rol</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.is_active ? 'Activ' : 'Dezactivat'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => toggleActive(u)}
                                                className="text-xs font-semibold text-slate-600 hover:text-blue-700 px-2"
                                            >
                                                {u.is_active ? 'Dezactivează' : 'Activează'}
                                            </button>
                                            <button
                                                onClick={() => remove(u)}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 px-2"
                                            >
                                                Șterge
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        Niciun utilizator nu se potrivește cu filtrele.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex justify-center items-center gap-1.5 flex-wrap pt-2">
                        {users.links.map((link, i) => (
                            <button
                                key={i}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                disabled={!link.url}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                    link.active
                                        ? 'bg-slate-900 text-white'
                                        : link.url
                                        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        : 'opacity-30 cursor-default'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
