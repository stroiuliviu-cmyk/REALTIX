import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    X as XIcon, ArrowRight, ArrowLeft, Check, Home, Banknote, Percent, Search,
} from 'lucide-react';

/**
 * Triggered when an agent flips a contact's status to "Închis" (closed).
 *
 * Asks whether the contact closed a deal with the agency. If yes, walks
 * through property selection + commission (percent vs fixed) and creates
 * a Deal with status='closed' so it lands in Statistics as revenue.
 *
 * Props:
 *   contactId           — current contact id
 *   contactName         — display in headers
 *   availableProperties — agency property list (id, title, city, price, currency, transaction_type)
 *   onClose             — close modal without doing anything
 *   onFinalize          — called after backend success; pass through here so the
 *                         parent can also PATCH the contact status to closed.
 */
export default function CloseContactWizard({
    contactId,
    contactName,
    availableProperties = [],
    onClose,
    onFinalize,
}) {
    // Step 1 = question, 2 = property, 3 = commission
    const [step, setStep] = useState(1);
    const [closedWithUs, setClosedWithUs] = useState(null); // 'yes' | 'no' | null
    const [propertyId, setPropertyId]   = useState(null);
    const [mode, setMode]               = useState('percent'); // 'percent' | 'fixed'
    const [percent, setPercent]         = useState('');
    const [fixed, setFixed]             = useState('');
    const [submitting, setSubmitting]   = useState(false);
    const [propertyQuery, setPropertyQuery] = useState('');

    const property = availableProperties.find(p => String(p.id) === String(propertyId));
    const value    = property ? Number(property.price ?? 0) : 0;
    const currency = property?.currency ?? 'EUR';

    const livePercentAmount = (mode === 'percent' && percent && value)
        ? Math.round(value * Number(percent) / 100 * 100) / 100
        : null;

    // "No, no deal" branch — just close the contact, no Deal created.
    const finishNoDeal = () => {
        setSubmitting(true);
        onFinalize({ createDeal: false, onSettled: () => setSubmitting(false) });
    };

    // Final submit — create a closed Deal, then close the contact.
    const finishWithDeal = () => {
        if (!propertyId) return;
        const payload = {
            contact_id:  contactId,
            property_id: property.id,
            status:      'closed',
            value:       value || null,
            currency,
            ...(mode === 'percent'
                ? { commission_percent: percent ? Number(percent) : null }
                : { commission: fixed ? Number(fixed) : null }),
        };
        setSubmitting(true);
        router.post(route('deals.store'), payload, {
            preserveScroll: true,
            onSuccess: () => {
                // Deal created — now flip the contact to closed.
                onFinalize({ createDeal: true, onSettled: () => setSubmitting(false) });
            },
            onError: () => setSubmitting(false),
        });
    };

    const canStep2Continue = !!propertyId;
    const canFinishDeal    = !!propertyId && (
        (mode === 'percent' && percent && Number(percent) > 0) ||
        (mode === 'fixed'   && fixed   && Number(fixed)   > 0)
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl border border-slate-200/70 w-full max-w-lg max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Închide contact</div>
                        <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">{contactName}</h3>
                        <div className="text-xs text-slate-500 mt-1">Pasul {step} din 3</div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        aria-label="Închide"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5 grow">
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-700">
                                Clientul a închis o tranzacție cu agenția?
                            </p>
                            <button
                                type="button"
                                onClick={() => { setClosedWithUs('no'); }}
                                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                                    closedWithUs === 'no'
                                        ? 'border-blue-600 bg-blue-50/60'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="font-semibold text-slate-900 text-sm">Nu, fără tranzacție cu noi</div>
                                <div className="text-xs text-slate-500 mt-1">Marchează contactul ca închis, fără deal.</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setClosedWithUs('yes'); }}
                                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                                    closedWithUs === 'yes'
                                        ? 'border-blue-600 bg-blue-50/60'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="font-semibold text-slate-900 text-sm">Da, a închis tranzacție cu noi</div>
                                <div className="text-xs text-slate-500 mt-1">Creează un deal închis și înregistrează comisionul în statistici.</div>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-700">Alege imobilul vândut/închiriat:</p>
                            {availableProperties.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    Nu există imobile disponibile în portofoliul agenției.
                                </p>
                            ) : (() => {
                                const q = propertyQuery.trim().toLowerCase();
                                // Search on id (exact-substring) OR title OR city — agents
                                // often know the internal #id from their kanban board.
                                const filtered = q
                                    ? availableProperties.filter(p =>
                                          String(p.id).includes(q) ||
                                          (p.title ?? '').toLowerCase().includes(q) ||
                                          (p.city  ?? '').toLowerCase().includes(q)
                                      )
                                    : availableProperties;
                                return (
                                    <>
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={propertyQuery}
                                                onChange={e => setPropertyQuery(e.target.value)}
                                                placeholder="Caută după ID, titlu sau oraș…"
                                                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                            />
                                        </div>
                                        {filtered.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-6">Niciun imobil nu corespunde căutării.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                {filtered.map(p => {
                                                    const selected = String(propertyId) === String(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setPropertyId(p.id)}
                                                            className={`w-full text-left rounded-xl border p-3 transition-colors ${
                                                                selected
                                                                    ? 'border-blue-600 bg-blue-50/60'
                                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <Home className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-semibold text-slate-900 text-sm truncate">{p.title || `Fără titlu`}</span>
                                                                        <span className="text-[10px] font-mono font-semibold text-slate-400">#{p.id}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                                                        {p.city && <span>{p.city}</span>}
                                                                        {p.transaction_type && (
                                                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wide">
                                                                                {p.transaction_type === 'rent' ? 'Chirie' : 'Vânzare'}
                                                                            </span>
                                                                        )}
                                                                        {p.price && (
                                                                            <span className="font-semibold text-slate-700 tabular-nums">
                                                                                {Number(p.price).toLocaleString('ro')} {p.currency ?? 'EUR'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {step === 3 && property && (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-sm">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Imobil ales</div>
                                <div className="font-semibold text-slate-900 truncate">{property.title || `#${property.id}`}</div>
                                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                    Valoare tranzacție: <strong className="text-slate-900">{Number(value).toLocaleString('ro')} {currency}</strong>
                                </div>
                            </div>

                            {/* Mode toggle */}
                            <div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mod comision</div>
                                <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setMode('percent')}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            mode === 'percent'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Percent className="w-3.5 h-3.5" />
                                        Procent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('fixed')}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            mode === 'fixed'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Banknote className="w-3.5 h-3.5" />
                                        Sumă fixă
                                    </button>
                                </div>
                            </div>

                            {mode === 'percent' && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Procent (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={percent}
                                        onChange={e => setPercent(e.target.value)}
                                        placeholder="ex: 3"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                    />
                                    <div className="mt-2 text-xs text-slate-500">
                                        Sumă rezultată:&nbsp;
                                        <span className="font-semibold text-slate-900 tabular-nums">
                                            {livePercentAmount !== null
                                                ? `${Number(livePercentAmount).toLocaleString('ro')} ${currency}`
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {mode === 'fixed' && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sumă fixă ({currency})</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={fixed}
                                        onChange={e => setFixed(e.target.value)}
                                        placeholder="ex: 1500"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(s => s - 1)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Înapoi
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Anulează
                        </button>
                    )}

                    {step === 1 && (
                        closedWithUs === 'no' ? (
                            <button
                                type="button"
                                onClick={finishNoDeal}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                                {submitting ? 'Se închide…' : 'Închide contactul'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={closedWithUs !== 'yes' || submitting}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuă
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )
                    )}

                    {step === 2 && (
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            disabled={!canStep2Continue}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuă
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}

                    {step === 3 && (
                        <button
                            type="button"
                            onClick={finishWithDeal}
                            disabled={!canFinishDeal || submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                            {submitting ? 'Se închide…' : 'Închide tranzacția'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
