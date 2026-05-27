import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';

const STATUS_LABELS = {
    open:     'Deschis',
    pending:  'În așteptare',
    resolved: 'Rezolvat',
    closed:   'Închis',
};

const STATUS_COLORS = {
    open:     'bg-blue-100 text-blue-700 border-blue-200',
    pending:  'bg-amber-100 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed:   'bg-slate-100 text-slate-600 border-slate-200',
};

const PRIORITY_LABELS = {
    low:    'Scăzută',
    normal: 'Normală',
    high:   'Înaltă',
    urgent: 'Urgentă',
};

const PRIORITY_COLORS = {
    low:    'bg-slate-100 text-slate-600 border-slate-200',
    normal: 'bg-blue-50 text-blue-700 border-blue-200',
    high:   'bg-amber-50 text-amber-700 border-amber-200',
    urgent: 'bg-red-50 text-red-700 border-red-200',
};

function relativeTime(iso) {
    if (!iso) return '—';
    const then = new Date(iso);
    const diff = (Date.now() - then.getTime()) / 1000;
    if (diff < 60)        return 'acum';
    if (diff < 3600)      return `acum ${Math.floor(diff / 60)} min`;
    if (diff < 86400)     return `acum ${Math.floor(diff / 3600)} ore`;
    if (diff < 86400 * 7) return `acum ${Math.floor(diff / 86400)} zile`;
    return then.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Index({ tickets = [] }) {
    return (
        <AppLayout title="Suport">
            <Head title="Suport" />

            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <span>❓</span> Suport tehnic
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Trimite întrebări sau raportează probleme. Echipa REALTIX îți răspunde.
                        </p>
                    </div>
                    <Link
                        href={route('support.create')}
                        className="rounded-xl bg-slate-900 hover:bg-slate-700 transition-colors px-5 py-2.5 text-sm font-semibold text-white shadow"
                    >
                        + Ticket nou
                    </Link>
                </div>

                {tickets.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Nu ai tickets încă</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                            Deschide un ticket pentru întrebări tehnice, raportări bug-uri sau cereri de feature-uri noi.
                        </p>
                        <Link
                            href={route('support.create')}
                            className="inline-block rounded-xl bg-slate-900 hover:bg-slate-700 transition-colors px-6 py-2.5 text-sm font-semibold text-white"
                        >
                            + Deschide primul ticket
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="text-left px-5 py-3 w-16">#ID</th>
                                    <th className="text-left px-5 py-3">Subiect</th>
                                    <th className="text-left px-5 py-3 w-32">Status</th>
                                    <th className="text-left px-5 py-3 w-32">Prioritate</th>
                                    <th className="text-left px-5 py-3 w-40">Ultim răspuns</th>
                                    <th className="text-left px-5 py-3 w-32">Creat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-mono text-slate-400">#{t.id}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={route('support.show', t.id)}
                                                className="font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                                            >
                                                {t.subject}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? STATUS_COLORS.open}`}>
                                                {STATUS_LABELS[t.status] ?? t.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>
                                                {PRIORITY_LABELS[t.priority] ?? t.priority}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">
                                            {relativeTime(t.last_reply_at)}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
