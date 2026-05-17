import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';

const STATUS_COLORS = {
    open:     'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    resolved: 'bg-blue-100 text-blue-700',
    closed:   'bg-slate-200 text-slate-500',
};
const PRIORITY_COLORS = {
    urgent: 'bg-rose-600 text-white',
    high:   'bg-rose-100 text-rose-700',
    normal: 'bg-slate-100 text-slate-700',
    low:    'bg-slate-50 text-slate-500',
};

export default function Show({ ticket }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        body:             '',
        is_internal_note: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('super-admin.support.reply', ticket.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const setStatus = (status) => {
        router.patch(route('super-admin.support.status', ticket.id), { status }, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout breadcrumb={<Link href="/super-admin/support" className="hover:text-slate-700">Support</Link>}>
            <Head title={`Ticket #${ticket.id} — ${ticket.subject}`} />

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
                                <span className="text-xs text-slate-400 font-mono">#{ticket.id}</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
                            <div className="text-xs text-slate-500 mt-1">
                                Deschis de <strong>{ticket.user?.name}</strong> ({ticket.user?.email})
                                {ticket.agency && <> · {ticket.agency.name}</>}
                                · {new Date(ticket.created_at).toLocaleString('ro-RO')}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['open', 'pending', 'resolved', 'closed'].filter(s => s !== ticket.status).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 capitalize"
                                >
                                    → {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Conversație ({ticket.replies?.length ?? 0})</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {(ticket.replies ?? []).map(r => (
                            <div key={r.id} className={`px-5 py-4 ${r.is_internal_note ? 'bg-amber-50/50' : ''}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-semibold text-slate-800 text-sm">{r.user?.name}</span>
                                    {r.is_internal_note && (
                                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 rounded-full">🔒 Internal note</span>
                                    )}
                                    <span className="ml-auto text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString('ro-RO')}</span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.body}</p>
                            </div>
                        ))}
                        {(ticket.replies ?? []).length === 0 && (
                            <p className="px-5 py-6 text-center text-sm text-slate-400">Niciun reply.</p>
                        )}
                    </div>

                    <form onSubmit={submit} className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
                        <textarea
                            value={data.body}
                            onChange={e => setData('body', e.target.value)}
                            rows={4}
                            placeholder="Scrie un răspuns…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400 bg-white"
                        />
                        {errors.body && <p className="text-xs text-rose-600">{errors.body}</p>}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_internal_note}
                                    onChange={e => setData('is_internal_note', e.target.checked)}
                                    className="rounded"
                                />
                                Internal note (nu se trimite user-ului)
                            </label>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
                            >
                                {processing ? 'Se trimite…' : 'Trimite reply'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
