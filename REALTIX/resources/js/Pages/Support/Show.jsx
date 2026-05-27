import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

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

function initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function Show({ ticket }) {
    const { auth } = usePage().props;
    const myId = auth?.user?.id;
    const replies = ticket.replies ?? [];
    const isClosed = ticket.status === 'closed';

    const { data, setData, post, processing, errors, reset } = useForm({
        body: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('support.reply', ticket.id), {
            preserveScroll: true,
            onSuccess: () => reset('body'),
        });
    };

    return (
        <AppLayout title={`Ticket #${ticket.id}`}>
            <Head title={`#${ticket.id} — ${ticket.subject}`} />

            <div className="max-w-3xl space-y-5">
                {/* Header */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-400">#{ticket.id}</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open}`}>
                                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.normal}`}>
                                    {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                                </span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 break-words">{ticket.subject}</h1>
                            <p className="text-xs text-slate-500 mt-1">
                                Creat: {new Date(ticket.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {ticket.last_reply_at && (
                                    <> · Ultim răspuns: {relativeTime(ticket.last_reply_at)}</>
                                )}
                            </p>
                        </div>
                        <Link
                            href={route('support.index')}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap"
                        >
                            ← Înapoi la listă
                        </Link>
                    </div>
                </div>

                {/* Conversation */}
                <div className="space-y-3">
                    {replies.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-sm text-slate-400">
                            Niciun răspuns încă.
                        </div>
                    ) : (
                        replies.map(reply => {
                            const isMine = reply.user_id === myId;
                            const userName = reply.user?.name ?? 'Suport REALTIX';

                            return (
                                <div
                                    key={reply.id}
                                    className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isMine && (
                                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                            {initials(userName)}
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                                            isMine
                                                ? 'bg-white border-slate-200'
                                                : 'bg-emerald-50 border-emerald-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-bold text-slate-700">
                                                {isMine ? 'Tu' : userName}
                                            </span>
                                            {!isMine && (
                                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                                                    Suport
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400">
                                                {relativeTime(reply.created_at)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                                            {reply.body}
                                        </div>
                                    </div>
                                    {isMine && (
                                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {initials(userName)}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Reply form or closed notice */}
                {isClosed ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-slate-600 mb-3">
                            🔒 Acest ticket este închis. Pentru întrebări noi, deschide un ticket nou.
                        </p>
                        <Link
                            href={route('support.create')}
                            className="inline-block rounded-xl bg-slate-900 hover:bg-slate-700 transition-colors px-5 py-2 text-xs font-semibold text-white"
                        >
                            + Deschide ticket nou
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                            Răspuns
                        </label>
                        <textarea
                            value={data.body}
                            onChange={e => setData('body', e.target.value)}
                            rows={4}
                            minLength={5}
                            maxLength={10000}
                            required
                            placeholder="Scrie răspunsul tău..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-y"
                        />
                        {errors.body && (
                            <p className="text-xs text-red-600">{errors.body}</p>
                        )}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="rounded-xl bg-slate-900 hover:bg-slate-700 transition-colors px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {processing ? 'Se trimite...' : '📤 Trimite răspuns'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}
