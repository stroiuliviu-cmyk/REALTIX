import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Clock, X as XIcon } from 'lucide-react';

/**
 * Generic admin-only modal to transfer ownership of an entity (property / contact)
 * from its current owner to another active agent in the same agency.
 *
 * Props:
 *   subject         — string label shown in title (e.g. "anunțul", "clientul")
 *   currentOwner    — name of current owner (for display)
 *   currentOwnerId  — id of current owner (optional, used to exclude self-transfers
 *                     once the agents list already filters them out)
 *   agents          — array of { id, name, email } available recipients
 *   transferHistory — array of past transfer log entries
 *                     [{ id, from_user, to_user, notes, created_at }, …]
 *                     Most recent first (controller uses latest()).
 *   routeName       — Ziggy route name (e.g. 'properties.transfer')
 *   routeId         — id of the entity to transfer
 *   onClose         — callback to close the modal
 */
export default function TransferOwnershipModal({
    subject = 'obiectul',
    currentOwner,
    currentOwnerId, // kept in API even when unused — call sites already pass it
    agents = [],
    transferHistory = [],
    routeName,
    routeId,
    onClose,
}) {
    const { data, setData, patch, processing, errors } = useForm({
        user_id: '',
        notes:   '',
    });

    // Two-stage submit: first click validates + arms confirmation, second click
    // actually fires the request. Reset to step 1 whenever the agent changes so
    // the admin can never confirm a transfer to the wrong person.
    const [confirming, setConfirming] = useState(false);

    const selectedAgent = agents.find(a => String(a.id) === String(data.user_id));
    const transferCount = transferHistory.length;
    const lastTransfer  = transferHistory[0] ?? null;

    const submit = (e) => {
        e.preventDefault();
        if (!data.user_id || agents.length === 0) return;
        if (!confirming) { setConfirming(true); return; }
        patch(route(routeName, routeId), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const handleAgentChange = (e) => {
        setData('user_id', e.target.value);
        setConfirming(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-slate-200/70 w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Transferă {subject}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Închide">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-sm">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Agent curent</div>
                    <div className="text-slate-900 font-medium">{currentOwner ?? '—'}</div>
                </div>

                {transferCount > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm">
                        <div className="inline-flex items-center gap-1.5 text-amber-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            Transferat de {transferCount} {transferCount === 1 ? 'dată' : 'ori'}
                        </div>
                        {lastTransfer && (
                            <div className="text-amber-800 text-xs">
                                Ultimul: <span className="font-semibold">{lastTransfer.from_user ?? '—'}</span>
                                {' → '}
                                <span className="font-semibold">{lastTransfer.to_user ?? '—'}</span>
                                {' · '}
                                {new Date(lastTransfer.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Transferă către</label>
                        <select
                            value={data.user_id}
                            onChange={handleAgentChange}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Note (opțional)</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={2}
                            placeholder="Motivul transferului (vizibil în audit log)…"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                        />
                    </div>

                    {confirming && selectedAgent ? (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                            <p className="text-sm text-slate-700">
                                Clientul este acum la <span className="font-semibold text-slate-900">{currentOwner}</span>.
                                Sigur îl transferi către <span className="font-semibold text-slate-900">{selectedAgent.name}</span>?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {processing ? 'Se transferă…' : 'Da, transferă'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirming(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Înapoi
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={processing || !data.user_id || agents.length === 0}
                                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
                            >
                                Confirmă transfer
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Anulează
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
