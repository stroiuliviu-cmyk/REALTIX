import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function NewFlagModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        key:             '',
        description:     '',
        enabled:         false,
        rollout_percent: 100,
    });
    const submit = (e) => {
        e.preventDefault();
        post(route('super-admin.feature-flags.store'), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Feature flag nou</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Key</label>
                        <input
                            value={data.key}
                            onChange={e => setData('key', e.target.value)}
                            placeholder="ex: ai.gpt5.beta"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-400"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Lowercase, doar a-z 0-9 _ . -</p>
                        {errors.key && <p className="text-xs text-rose-600 mt-1">{errors.key}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descriere</label>
                        <textarea
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            rows={2}
                            placeholder="La ce servește acest flag…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 uppercase">Activat la creare</label>
                        <button
                            type="button"
                            onClick={() => setData('enabled', !data.enabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${data.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Rollout %: {data.rollout_percent}</label>
                        <input
                            type="range" min={0} max={100}
                            value={data.rollout_percent}
                            onChange={e => setData('rollout_percent', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <button type="submit" disabled={processing} className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
                        {processing ? 'Se creează…' : 'Creează flag'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function FlagRow({ flag }) {
    const [rollout, setRollout] = useState(flag.rollout_percent);

    const toggle = () => {
        router.patch(route('super-admin.feature-flags.update', flag.id), { enabled: !flag.enabled }, { preserveScroll: true });
    };

    const updateRollout = () => {
        if (rollout === flag.rollout_percent) return;
        router.patch(route('super-admin.feature-flags.update', flag.id), { rollout_percent: rollout }, { preserveScroll: true });
    };

    const remove = () => {
        if (!confirm(`Șterge flag-ul „${flag.key}"?`)) return;
        router.delete(route('super-admin.feature-flags.destroy', flag.id), { preserveScroll: true });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold text-slate-900">{flag.key}</div>
                    {flag.description && <div className="text-xs text-slate-500 mt-0.5">{flag.description}</div>}
                </div>
                <button
                    onClick={toggle}
                    className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${flag.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">Rollout:</span>
                <input
                    type="range" min={0} max={100}
                    value={rollout}
                    onChange={e => setRollout(parseInt(e.target.value))}
                    onMouseUp={updateRollout}
                    onTouchEnd={updateRollout}
                    className="flex-1"
                />
                <span className="font-bold text-slate-700 w-10 text-right">{rollout}%</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Modificat de {flag.updated_by?.name ?? 'system'} · {new Date(flag.updated_at).toLocaleDateString('ro')}</span>
                <button onClick={remove} className="text-rose-500 hover:text-rose-700 font-semibold">Șterge</button>
            </div>
        </div>
    );
}

export default function Index({ flags }) {
    const [showNew, setShowNew] = useState(false);

    return (
        <SuperAdminLayout title="Feature Flags" breadcrumb="Super Admin · Runtime toggles">
            <Head title="Feature Flags — Super Admin" />
            {showNew && <NewFlagModal onClose={() => setShowNew(false)} />}

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{flags.length} flag{flags.length !== 1 ? 'uri' : ''} configurate</p>
                    <button onClick={() => setShowNew(true)} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-bold hover:bg-slate-700">
                        + Flag nou
                    </button>
                </div>

                {flags.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <div className="text-4xl mb-3">🚩</div>
                        <p className="text-sm text-slate-500">Niciun feature flag definit. Creează primul pentru a controla runtime feature-uri.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {flags.map(f => <FlagRow key={f.id} flag={f} />)}
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}
