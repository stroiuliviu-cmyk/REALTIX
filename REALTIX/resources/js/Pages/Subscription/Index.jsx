import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const planColors = {
    starter: { dot: 'bg-emerald-400', ring: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
    medium:  { dot: 'bg-blue-500',    ring: 'border-blue-500',    badge: 'bg-blue-100 text-blue-700' },
    pro:     { dot: 'bg-purple-500',  ring: 'border-purple-500',  badge: 'bg-purple-100 text-purple-700' },
};

const planFeatures = {
    starter: ['50 anunțuri', '1 agent', 'CRM de bază', 'Calendar', 'Contracte PDF'],
    medium:  ['500 anunțuri', '5 agenți', 'CRM complet', 'Instrumente AI', 'Scraper web', 'Contracte PDF', 'Statistici'],
    pro:     ['Anunțuri nelimitate', 'Agenți nelimitați', 'CRM + Analytics', 'AI prioritar', 'Autopostare', 'API access', 'Suport dedicat'],
};

function PaymentHistoryModal({ invoices, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg rounded-4xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Istoricul plăților</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm">✕</button>
                </div>
                {invoices.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">Nicio plată înregistrată.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {invoices.map((inv, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                <div>
                                    <div className="text-sm font-semibold">{inv.date}</div>
                                    <div className="text-xs text-slate-500">{inv.status}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-slate-900">{inv.total}</span>
                                    {inv.pdf && (
                                        <a href={inv.pdf} target="_blank" rel="noopener" className="text-xs text-blue-700 font-semibold hover:underline">
                                            PDF ↓
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Index({ agency, plans, activeSubscription, invoices, stripe_key }) {
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(null);
    const { flash } = usePage().props;

    const currentPlan  = agency.subscription_plan ?? 'starter';
    const planEndsAt   = agency.subscription_ends_at
        ? new Date(agency.subscription_ends_at).toLocaleDateString('ro', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
    const trialEndsAt  = agency.trial_ends_at
        ? new Date(agency.trial_ends_at).toLocaleDateString('ro', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const handleSubscribe = (slug) => {
        setLoading(slug);
        router.post(`/subscription/subscribe/${slug}`, {}, {
            onFinish: () => setLoading(null),
        });
    };

    const handlePortal = () => {
        router.get('/subscription/portal');
    };

    return (
        <AppLayout title="Plan abonament">
            <Head title="Plan abonament" />
            {showHistory && <PaymentHistoryModal invoices={invoices} onClose={() => setShowHistory(false)} />}

            <div className="space-y-8 max-w-4xl">

                {/* ─── Current plan summary ─── */}
                <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Planul tău curent</div>
                            <div className="flex items-center gap-3">
                                <span className={`w-4 h-4 rounded-full ${planColors[currentPlan]?.dot ?? 'bg-slate-300'}`} />
                                <span className="text-3xl font-black text-slate-900 capitalize">
                                    {plans.find(p => p.slug === currentPlan)?.name ?? currentPlan}
                                </span>
                                {activeSubscription?.stripe_status === 'active' && (
                                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">Activ</span>
                                )}
                                {trialEndsAt && (
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">Trial până la {trialEndsAt}</span>
                                )}
                            </div>
                            <div className="mt-2 text-slate-500 text-sm">
                                Preț: <strong>€{plans.find(p => p.slug === currentPlan)?.price_monthly ?? 0}/lună</strong>
                                {planEndsAt && <span> &bull; Activ până la: <strong>{planEndsAt}</strong></span>}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {activeSubscription ? (
                                <button
                                    onClick={handlePortal}
                                    className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                                >
                                    Gestionează abonamentul
                                </button>
                            ) : null}
                            <button
                                onClick={() => setShowHistory(true)}
                                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Istoric plăți
                            </button>
                        </div>
                    </div>

                    {/* Trial banner */}
                    {!activeSubscription && (
                        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
                            <span className="text-xl">⏰</span>
                            <div>
                                <div className="text-sm font-bold text-amber-800">Perioadă de probă</div>
                                <div className="text-xs text-amber-700 mt-0.5">
                                    Perioada de probă de 14 zile este disponibilă pentru utilizatori noi. Alege un plan pentru a continua după expirare.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Plan cards ─── */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Alege planul tău</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {plans.map(plan => {
                            const isActive  = plan.slug === currentPlan;
                            const colors    = planColors[plan.slug] ?? planColors.starter;
                            const features  = planFeatures[plan.slug] ?? [];
                            const isLoading = loading === plan.slug;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-4xl border-2 p-6 transition-all ${
                                        isActive
                                            ? `${colors.ring} bg-white shadow-2xl`
                                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-lg'
                                    }`}
                                >
                                    {isActive && (
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${colors.badge} text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap`}>
                                            ✓ Planul tău
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                                        <span className="font-black text-slate-900 text-lg">{plan.name}</span>
                                    </div>

                                    <div className="mb-1">
                                        <span className="text-4xl font-black text-slate-900">€{plan.price_monthly}</span>
                                        <span className="text-slate-400 text-sm">/lună</span>
                                    </div>

                                    <div className="text-xs text-slate-500 mb-5">
                                        {plan.slug === 'starter' && 'Pentru agenți individuali'}
                                        {plan.slug === 'medium'  && 'Pentru agenții și echipe'}
                                        {plan.slug === 'pro'     && 'Pentru agenții mari'}
                                    </div>

                                    <ul className="space-y-2 mb-6">
                                        {features.map(f => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 text-xs">✓</span>
                                                {f}
                                            </li>
                                        ))}
                                        {plan.max_listings > 0 && (
                                            <li className="flex items-center gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 text-xs">✓</span>
                                                {plan.max_listings} anunțuri max
                                            </li>
                                        )}
                                        {plan.max_realtors > 0 && (
                                            <li className="flex items-center gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 text-xs">✓</span>
                                                {plan.max_realtors} {plan.max_realtors === 1 ? 'agent' : 'agenți'}
                                            </li>
                                        )}
                                    </ul>

                                    {isActive ? (
                                        <div className={`text-center text-sm font-semibold ${colors.badge} rounded-2xl py-3`}>
                                            Plan curent
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleSubscribe(plan.slug)}
                                            disabled={isLoading || !stripe_key}
                                            className={`w-full rounded-2xl py-3 text-sm font-bold transition-colors ${
                                                plan.slug === 'pro'
                                                    ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                                                    : plan.slug === 'medium'
                                                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                                                    : 'bg-slate-900 text-white hover:bg-slate-700'
                                            } disabled:opacity-50`}
                                        >
                                            {isLoading ? 'Se procesează...' : !stripe_key ? 'Stripe neconfigurat' : `Alege ${plan.name}`}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Info ─── */}
                <div className="rounded-4xl bg-slate-50 border border-slate-100 p-6 text-sm text-slate-500 space-y-1">
                    <p>💳 Plata se procesează prin <strong>Stripe</strong> — card bancar, în siguranță.</p>
                    <p>🔄 Poți schimba sau anula planul oricând din portalul de facturare.</p>
                    <p>⏰ La upgrade — diferența se calculează proporțional pentru perioada rămasă.</p>
                </div>
            </div>
        </AppLayout>
    );
}
