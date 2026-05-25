import { useEffect, useState } from 'react';

const OUTCOME_ICONS = {
    viewed:    '👁',
    called:    '📞',
    no_answer: '⏳',
    refused:   '❌',
};

const OUTCOME_LABELS = {
    viewed:    'Am văzut numărul',
    called:    'Am sunat',
    no_answer: 'Nu a răspuns',
    refused:   'Refuz',
};

const HISTORY_LABELS = {
    viewed:    'A văzut numărul',
    called:    'A sunat',
    no_answer: 'Nu a răspuns',
    refused:   'Refuz',
};

/**
 * Phone interaction popup. Used in two layouts:
 *   mode='modal'  — centered modal (Web Offers — scraped listing)
 *   mode='drawer' — right-side drawer (Properties Show)
 *
 * Props:
 *   subjectType  'scraped_listing' | 'property'
 *   subjectId    number
 *   onClose      function
 *   onLogged     function — called after a successful log (parent can refresh hint)
 *   mandatory    if true, blocks closing the popup until one of the action
 *                buttons is clicked (used on Web Offers to enforce activity log)
 */
export default function PhoneInteractionModal({ subjectType, subjectId, onClose, onLogged, mode = 'modal', mandatory = false }) {
    const [loading, setLoading]   = useState(true);
    const [phone,   setPhone]     = useState(null);
    const [owner,   setOwner]     = useState(null);
    const [history, setHistory]   = useState([]);
    const [posting, setPosting]   = useState(null); // outcome currently being submitted
    const [error,   setError]     = useState('');

    const outcomes = mode === 'drawer'
        ? ['called', 'no_answer', 'refused']
        : ['called', 'no_answer', 'viewed'];

    const isDrawer = mode === 'drawer';

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError('');
        window.axios.get(`/phone-interactions/${subjectType}/${subjectId}`)
            .then(res => {
                if (!alive) return;
                setPhone(res.data.phone ?? null);
                setOwner(res.data.owner ?? null);
                setHistory(res.data.history ?? []);
            })
            .catch(e => {
                if (!alive) return;
                setError(e.response?.data?.message || 'Eroare la încărcarea contactului.');
            })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [subjectType, subjectId]);

    const submit = async (outcome) => {
        setPosting(outcome);
        setError('');
        try {
            const res = await window.axios.post('/phone-interactions', {
                subject_type: subjectType,
                subject_id:   subjectId,
                outcome,
                note: null,
            });
            setHistory(res.data.history ?? []);
            onLogged?.(res.data.interaction);
            // Mandatory mode: choosing an outcome is the only way out — close now.
            if (mandatory) onClose?.();
        } catch (e) {
            setError(e.response?.data?.message || 'Eroare la salvare.');
        } finally {
            setPosting(null);
        }
    };

    const wrapperClass = isDrawer
        ? 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end'
        : 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4';

    const panelClass = isDrawer
        ? 'bg-white shadow-2xl w-full max-w-md h-full overflow-y-auto p-6 space-y-5'
        : 'bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5';

    // In mandatory mode the backdrop is inert — the only way out is one of the
    // three action buttons. This enforces activity logging on Web Offers.
    const handleBackdropClick = mandatory ? undefined : onClose;

    return (
        <div className={wrapperClass} onClick={handleBackdropClick}>
            <div onClick={e => e.stopPropagation()} className={panelClass}>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {isDrawer ? '📞 Apel client' : 'Contact'}
                    </h3>
                    {!mandatory && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                    )}
                </div>

                {mandatory && (
                    <p className="text-[11px] text-slate-400 -mt-2">
                        Alege o opțiune pentru a continua.
                    </p>
                )}

                {loading && (
                    <div className="py-8 text-center text-sm text-slate-400">Se încarcă…</div>
                )}

                {!loading && (
                    <>
                        {/* Phone block — always rendered. For Property the phone
                            comes from the linked owner contact OR, when no owner
                            is linked, from property.meta.phone (captured at import
                            from the scraped listing). */}
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefon</div>
                            <div className="text-lg font-bold text-slate-900 tracking-wide">
                                {phone ? (
                                    <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
                                ) : '—'}
                            </div>
                            {owner && (
                                <div className="text-xs text-slate-500 mt-1">
                                    {owner.first_name} {owner.last_name ?? ''}
                                </div>
                            )}
                        </div>

                        {/* Action buttons — always enabled (parity with Web Offers). */}
                        <div className="grid grid-cols-1 gap-2">
                            {outcomes.map(o => (
                                <button
                                    key={o}
                                    onClick={() => submit(o)}
                                    disabled={posting !== null}
                                    className="flex items-center gap-2 justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span>{OUTCOME_ICONS[o]}</span>
                                    <span>{posting === o ? 'Se salvează…' : OUTCOME_LABELS[o]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Subtle hint when owner is missing (only on property drawer).
                            Apelul tot se înregistrează — sugestia e doar pentru comentariile interne. */}
                        {isDrawer && !owner && (
                            <p className="text-xs text-slate-400">
                                Asociază un client cu relația <strong>Proprietar</strong> din „Clienți asociați" ca să poți adăuga comentarii interne despre client.
                            </p>
                        )}

                        {error && <p className="text-xs text-rose-600">{error}</p>}

                        {/* History */}
                        {history.length > 0 && (
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Istoric apeluri</div>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {history.map(h => {
                                        const dt = new Date(h.created_at);
                                        return (
                                            <div key={h.id} className="flex items-center gap-2 text-xs text-slate-600 border-b border-slate-50 pb-1">
                                                <span>{OUTCOME_ICONS[h.outcome]}</span>
                                                <span className="font-semibold text-slate-700">{h.user?.name ?? '—'}</span>
                                                <span className="text-slate-400">{HISTORY_LABELS[h.outcome] ?? h.outcome}</span>
                                                <span className="text-slate-400 ml-auto">
                                                    {dt.toLocaleDateString('ro', { day: 'numeric', month: 'short' })}
                                                    {' '}
                                                    {dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </>
                )}
            </div>
        </div>
    );
}
