import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_COLORS = {
    pending:   'bg-amber-100 text-amber-700',
    reviewing: 'bg-blue-100 text-blue-700',
    approved:  'bg-emerald-100 text-emerald-700',
    rejected:  'bg-rose-100 text-rose-700',
    spam:      'bg-slate-700 text-white',
};

function ReviewModal({ report, onClose }) {
    const { data, setData, patch, processing } = useForm({
        decision: 'rejected',
        notes:    '',
        action:   '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('super-admin.moderation.review', report.id), {
            onSuccess: onClose,
            preserveScroll: true,
        });
    };

    const isProperty = report.subject_type?.endsWith('\\Property');
    const isUser     = report.subject_type?.endsWith('\\User');

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Procesează raport #{report.id}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{report.subject_data?.title ?? 'Subject deleted'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Motiv raport</div>
                    <div className="text-slate-700">{report.reason ?? '—'}</div>
                    {report.details && <div className="text-xs text-slate-500 mt-2">{report.details}</div>}
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Decizie</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['approved', 'rejected', 'spam'].map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setData('decision', d)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold capitalize ${
                                        data.decision === d
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >{d}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Note (intern)</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Note pentru audit trail…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                    </div>

                    {(isProperty || isUser) && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Acțiune suplimentară</label>
                            <select
                                value={data.action}
                                onChange={e => setData('action', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                            >
                                <option value="">Nicio acțiune (doar marchez raportul)</option>
                                {isProperty && <option value="hide_subject">Ascunde anunțul (status=inactive)</option>}
                                {isProperty && <option value="delete_subject">Șterge anunțul</option>}
                                {isUser && <option value="suspend_user">Suspendă utilizatorul</option>}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
                            {processing ? 'Se procesează…' : 'Confirmă'}
                        </button>
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Anulează
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Index({ reports, status, counts }) {
    const [reviewing, setReviewing] = useState(null);

    const setStatus = (s) => router.get(route('super-admin.moderation.index'), { status: s }, { preserveState: true });

    const TABS = [
        { key: 'pending',   label: 'Pending',   count: counts.pending },
        { key: 'reviewing', label: 'Reviewing', count: counts.reviewing },
        { key: 'approved',  label: 'Approved',  count: counts.approved },
        { key: 'rejected',  label: 'Rejected',  count: counts.rejected },
        { key: 'spam',      label: 'Spam',      count: counts.spam },
        { key: 'all',       label: 'Toate',     count: null },
    ];

    return (
        <SuperAdminLayout title="Moderation" breadcrumb="Super Admin · Moderation Queue">
            <Head title="Moderation — Super Admin" />

            {reviewing && <ReviewModal report={reviewing} onClose={() => setReviewing(null)} />}

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-slate-100">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setStatus(t.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                                    status === t.key
                                        ? 'border-rose-600 text-rose-600 bg-rose-50/40'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {t.label}
                                {t.count != null && t.count > 0 && (
                                    <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                                        status === t.key ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>{t.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Subject</th>
                                    <th className="px-4 py-3">Reporter</th>
                                    <th className="px-4 py-3">Motiv</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Raportat</th>
                                    <th className="px-4 py-3 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                                            🎉 Nimic în queue pentru status „{status}".
                                        </td>
                                    </tr>
                                ) : reports.data.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3">
                                            {r.subject_data ? (
                                                <div>
                                                    <div className="font-semibold text-slate-900">
                                                        {r.subject_data.type === 'property' ? '🏠' : '👤'} {r.subject_data.title}
                                                    </div>
                                                    <div className="text-xs text-slate-400">{r.subject_data.meta}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-slate-400">Subject deleted</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">{r.reporter?.name ?? '—'}</div>
                                            <div className="text-xs text-slate-400">{r.reporter?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.reason}>{r.reason ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_COLORS[r.status] ?? 'bg-slate-100'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(r.created_at).toLocaleDateString('ro')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {['pending', 'reviewing'].includes(r.status) ? (
                                                <button
                                                    onClick={() => setReviewing(r)}
                                                    className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-700"
                                                >Review</button>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">
                                                    {r.reviewer?.name ?? '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
