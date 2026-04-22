import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const planMeta = {
    starter: {
        dot:   'bg-emerald-400',
        ring:  'border-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700',
        btn:   'bg-slate-900 hover:bg-slate-700 text-white',
        who:   'Agenți individuali',
    },
    medium: {
        dot:   'bg-blue-500',
        ring:  'border-blue-600',
        badge: 'bg-blue-100 text-blue-700',
        btn:   'bg-blue-700 hover:bg-blue-800 text-white',
        who:   'Agenții și echipe mici',
    },
    pro: {
        dot:   'bg-violet-500',
        ring:  'border-violet-600',
        badge: 'bg-violet-100 text-violet-700',
        btn:   'bg-linear-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white',
        who:   'Agenții mari / enterprise',
    },
};

const planFeatures = {
    starter: ['CRM de bază', '1 agent', '50 anunțuri', 'Calendar', 'Contracte PDF', 'Suport email'],
    medium:  ['CRM avansat', '5 agenți', '500 anunțuri', 'Instrumente AI', 'Scraper web', 'Statistici', 'Suport prioritar'],
    pro:     ['CRM + Analytics', 'Agenți nelimitați', 'Anunțuri nelimitate', 'AI prioritar', 'Autopostare social', 'Acces API', 'Manager dedicat'],
};

function fmt(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('ro', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Payment History Modal ───────────────────────────────────────────── */
function PaymentHistoryModal({ invoices, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-4xl bg-white p-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Istoricul plăților</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
                    >✕</button>
                </div>

                {invoices.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-3">🧾</div>
                        <p className="text-slate-400 text-sm">Nicio plată înregistrată încă.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">
                            <span>Dată</span>
                            <span className="text-right">Sumă</span>
                            <span className="text-center">Status</span>
                            <span className="text-right">Chitanță</span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {invoices.map((inv, i) => (
                                <div key={i} className="grid grid-cols-4 items-center p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm">
                                    <span className="font-semibold text-slate-800">{inv.date}</span>
                                    <span className="text-right font-bold text-slate-900">{inv.total}</span>
                                    <span className="text-center">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            inv.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {inv.status === 'paid' ? 'Plătit' : inv.status}
                                        </span>
                                    </span>
                                    <span className="text-right">
                                        {inv.pdf ? (
                                            <a
                                                href={inv.pdf}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-blue-700 font-semibold hover:underline text-xs"
                                            >
                                                PDF ↓
                                            </a>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function Index({ agency, plans, activeSubscription, invoices, stripe_key, isAdmin }) {
    const [showHistory, setShowHistory]   = useState(false);
    const [loading, setLoading]           = useState(null);
    const { flash }                       = usePage().props;

    const currentSlug  = agency.subscription_plan ?? 'starter';
    const currentPlan  = plans.find(p => p.slug === currentSlug);
    const meta         = planMeta[currentSlug] ?? planMeta.starter;
    const planEndsAt   = fmt(agency.subscription_ends_at);
    const trialEndsAt  = fmt(agency.trial_ends_at);
    const isOnTrial    = !activeSubscription && !!agency.trial_ends_at;
    const isActive     = activeSubscription?.stripe_status === 'active';

    const handleSubscribe = (slug) => {
        setLoading(slug);
        router.post(route('subscription.subscribe', slug), {}, {
            onFinish: () => setLoading(null),
        });
    };

    return (
        <AppLayout title="Plan abonament">
            <Head title="Plan abonament" />
            {showHistory && <PaymentHistoryModal invoices={invoices} onClose={() => setShowHistory(false)} />}

            <div className="space-y-8 max-w-4xl mx-auto">

                {/* Flash */}
                {flash?.success && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3.5 text-sm text-emerald-800 font-semibold">
                        ✓ {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3.5 text-sm text-red-700 font-semibold">
                        ✕ {flash.error}
                    </div>
                )}

                {/* ─── Current plan card ──────────────────────────────── */}
                <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-8">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                        Planul tău curent
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`w-4 h-4 rounded-full ${meta.dot}`} />
                                <span className="text-3xl font-black text-slate-900 capitalize">
                                    {currentPlan?.name ?? currentSlug}
                                </span>
                                {isActive && (
                                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                        Activ
                                    </span>
                                )}
                                {isOnTrial && (
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                        Trial
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1 text-sm text-slate-600">
                                <div>
                                    Preț:{' '}
                                    <strong className="text-slate-900">
                                        {currentPlan ? `${currentPlan.price_monthly} €/lună` : '—'}
                                    </strong>
                                </div>
                                {planEndsAt && (
                                    <div>
                                        Activ până la:{' '}
                                        <strong className="text-slate-900">{planEndsAt}</strong>
                                    </div>
                                )}
                                {isOnTrial && trialEndsAt && (
                                    <div>
                                        Trial expiră:{' '}
                                        <strong className="text-amber-700">{trialEndsAt}</strong>
                                    </div>
                                )}
                                {!isAdmin && (
                                    <div className="mt-2 text-xs text-slate-400 italic">
                                        Abonamentul se gestionează de administratorul agenției.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons — admin only */}
                        {isAdmin && (
                            <div className="flex flex-wrap gap-3 shrink-0">
                                {activeSubscription && (
                                    <button
                                        onClick={() => router.get(route('subscription.portal'))}
                                        className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                                    >
                                        Prelungire
                                    </button>
                                )}
                                {activeSubscription && (
                                    <button
                                        onClick={() => router.get(route('subscription.portal'))}
                                        className="rounded-2xl border border-slate-200 px-5 py-2.5 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                    >
                                        Actualizare plan
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="rounded-2xl border border-slate-200 px-5 py-2.5 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Istoric plăți
                                </button>
                            </div>
                        )}

                        {/* Realtor: only payment history (view) */}
                        {!isAdmin && (
                            <button
                                onClick={() => setShowHistory(true)}
                                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shrink-0"
                            >
                                Istoric plăți
                            </button>
                        )}
                    </div>

                    {/* Trial banner */}
                    {isOnTrial && (
                        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
                            <span className="text-xl mt-0.5">⏰</span>
                            <div>
                                <div className="font-bold text-amber-800 text-sm">Perioadă de probă — 14 zile</div>
                                <div className="text-xs text-amber-700 mt-1">
                                    Disponibilă pentru utilizatori noi. Alege un plan înainte de expirare pentru a continua fără întrerupere.
                                    {!trialEndsAt && ' Fără card necesar.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Plan cards ─────────────────────────────────────── */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">
                        {isAdmin ? 'Alege sau schimbă planul' : 'Planuri disponibile'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {plans.map(plan => {
                            const isCurrent = plan.slug === currentSlug;
                            const m         = planMeta[plan.slug] ?? planMeta.starter;
                            const features  = planFeatures[plan.slug] ?? [];
                            const isLoading = loading === plan.slug;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-4xl border-2 p-6 transition-all ${
                                        isCurrent
                                            ? `${m.ring} bg-white shadow-2xl`
                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg'
                                    }`}
                                >
                                    {isCurrent && (
                                        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${m.badge} text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-sm`}>
                                            ✓ Planul tău
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`w-3 h-3 rounded-full ${m.dot}`} />
                                        <span className="font-black text-slate-900 text-lg">{plan.name}</span>
                                    </div>

                                    <div className="mb-1">
                                        <span className="text-4xl font-black text-slate-900">
                                            {parseFloat(plan.price_monthly).toFixed(0)} €
                                        </span>
                                        <span className="text-slate-400 text-sm"> / lună</span>
                                    </div>

                                    <div className="text-xs text-slate-500 mb-5 font-medium">
                                        {m.who}
                                    </div>

                                    <ul className="space-y-2 mb-6">
                                        {features.map(f => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 text-xs mt-0.5 shrink-0">✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {isCurrent ? (
                                        <div className={`text-center text-sm font-semibold ${m.badge} rounded-2xl py-3`}>
                                            Plan curent
                                        </div>
                                    ) : isAdmin ? (
                                        <button
                                            onClick={() => handleSubscribe(plan.slug)}
                                            disabled={isLoading || !stripe_key}
                                            className={`w-full rounded-2xl py-3 text-sm font-bold transition-all ${m.btn} disabled:opacity-50`}
                                        >
                                            {isLoading
                                                ? 'Se procesează...'
                                                : !stripe_key
                                                ? 'Stripe neconfigurat'
                                                : `Alege ${plan.name}`}
                                        </button>
                                    ) : (
                                        <div className="text-center text-xs text-slate-400 italic py-3">
                                            Contactează administratorul
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Info footer ────────────────────────────────────── */}
                <div className="rounded-3xl bg-slate-50 border border-slate-100 p-6 space-y-2 text-sm text-slate-500">
                    <div className="flex items-start gap-2">
                        <span>💳</span>
                        <span>Plata se procesează securizat prin <strong className="text-slate-700">Stripe</strong> — card bancar sau altă metodă suportată.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span>🔄</span>
                        <span>La upgrade — diferența se calculează proporțional pentru perioada rămasă.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span>⏰</span>
                        <span>Poți anula sau schimba planul oricând; accesul rămâne activ până la finalul perioadei plătite.</span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
