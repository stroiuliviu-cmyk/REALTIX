import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const PRIORITY_LABELS = {
    low:    'Scăzută',
    normal: 'Normală',
    high:   'Înaltă',
    urgent: 'Urgentă',
};

export default function Create({ priorities = ['low', 'normal', 'high', 'urgent'] }) {
    const { data, setData, post, processing, errors } = useForm({
        subject:  '',
        priority: 'normal',
        body:     '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('support.store'));
    };

    return (
        <AppLayout title="Ticket nou">
            <Head title="Ticket nou — Suport" />

            <div className="max-w-2xl space-y-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span>📝</span> Deschide un ticket nou
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Descrie problema sau întrebarea ta. Echipa REALTIX îți răspunde.
                    </p>
                </div>

                <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                            Subiect *
                        </label>
                        <input
                            type="text"
                            value={data.subject}
                            onChange={e => setData('subject', e.target.value)}
                            maxLength={255}
                            required
                            placeholder="ex: Nu pot adăuga o proprietate nouă"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                        {errors.subject && (
                            <p className="text-xs text-red-600 mt-1">{errors.subject}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                            Prioritate *
                        </label>
                        <select
                            value={data.priority}
                            onChange={e => setData('priority', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                        >
                            {priorities.map(p => (
                                <option key={p} value={p}>
                                    {PRIORITY_LABELS[p] ?? p}
                                </option>
                            ))}
                        </select>
                        {errors.priority && (
                            <p className="text-xs text-red-600 mt-1">{errors.priority}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                            Mesaj *
                        </label>
                        <textarea
                            value={data.body}
                            onChange={e => setData('body', e.target.value)}
                            rows={8}
                            minLength={10}
                            maxLength={10000}
                            required
                            placeholder="Descrie în detaliu problema: ce ai încercat, ce eroare apare, pași de reproducere..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-y"
                        />
                        <div className="flex items-center justify-between mt-1">
                            {errors.body ? (
                                <p className="text-xs text-red-600">{errors.body}</p>
                            ) : (
                                <p className="text-xs text-slate-400">Minim 10 caractere, maxim 10 000.</p>
                            )}
                            <p className="text-xs text-slate-400">{data.body.length} / 10 000</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-slate-900 hover:bg-slate-700 transition-colors px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {processing ? 'Se trimite...' : '📤 Trimite ticket'}
                        </button>
                        <Link
                            href={route('support.index')}
                            className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors px-6 py-2.5 text-sm font-semibold text-slate-700"
                        >
                            Anulează
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
