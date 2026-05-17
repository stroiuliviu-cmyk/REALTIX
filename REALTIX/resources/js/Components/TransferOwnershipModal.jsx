import { useForm } from '@inertiajs/react';

/**
 * Generic admin-only modal to transfer ownership of an entity (property / contact)
 * from its current owner to another active agent in the same agency.
 *
 * Props:
 *   subject       — string label shown in title (e.g. "anunțul", "clientul")
 *   currentOwner  — name of current owner (for display)
 *   agents        — array of { id, name, email } available recipients
 *   routeName     — Ziggy route name (e.g. 'properties.transfer')
 *   routeId       — id of the entity to transfer
 *   onClose       — callback to close the modal
 */
export default function TransferOwnershipModal({ subject = 'obiectul', currentOwner, agents = [], routeName, routeId, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        user_id: '',
        notes:   '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route(routeName, routeId), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Transferă {subject}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agent curent</div>
                    <div className="text-slate-700">{currentOwner ?? '—'}</div>
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Transferă către</label>
                        <select
                            value={data.user_id}
                            onChange={e => setData('user_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                            required
                        >
                            <option value="">Selectează agent…</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                            ))}
                        </select>
                        {errors.user_id && <p className="text-xs text-rose-600 mt-1">{errors.user_id}</p>}
                        {agents.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">Niciun alt agent activ în agenție.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Note (opțional)</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={2}
                            placeholder="Motivul transferului (vizibil în audit log)…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={processing || !data.user_id || agents.length === 0} className="flex-1 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
                            {processing ? 'Se transferă…' : 'Confirmă transfer'}
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
