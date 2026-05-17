import { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';

const COMMON_FEATURES = [
    { ok: true, label: 'Sistem CRM' },
    { ok: true, label: 'Catalog Anunțuri' },
    { ok: true, label: 'Asistent AI' },
    { ok: true, label: 'Contracte PDF' },
    { ok: true, label: 'Statistici + export' },
];

const PLAN_META = {
    starter: {
        gradient: 'from-slate-50 to-slate-100',
        accent: 'border-slate-300 ring-slate-300',
        button: 'bg-slate-900 hover:bg-slate-700',
        tag: null,
        seats: '1 agent (doar tu)',
        features: COMMON_FEATURES,
    },
    medium: {
        gradient: 'from-blue-50 to-indigo-100',
        accent: 'border-blue-500 ring-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700',
        tag: 'Cel mai popular',
        seats: 'Până la 5 agenți',
        features: COMMON_FEATURES,
    },
    pro: {
        gradient: 'from-purple-50 to-fuchsia-100',
        accent: 'border-purple-500 ring-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700',
        tag: 'Pentru agenții mari',
        seats: '5 agenți incluși + 8€/agent suplimentar',
        features: COMMON_FEATURES,
    },
};

function PlanCard({ plan, meta, selected, onSelect, submitting }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(plan.slug)}
            disabled={submitting}
            className={`relative text-left rounded-3xl border-2 bg-linear-to-br ${meta.gradient} p-7 transition-all hover:scale-[1.015] hover:shadow-2xl disabled:opacity-60 ${
                selected ? `${meta.accent} ring-4 ring-offset-2 shadow-2xl` : 'border-slate-200'
            }`}
        >
            {meta.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {meta.tag}
                </span>
            )}

            <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                {selected && <span className="text-emerald-600 text-2xl">✓</span>}
            </div>

            <div className="mb-1">
                <span className="text-4xl font-black text-slate-900">€{Number(plan.price_monthly).toFixed(0)}</span>
                <span className="text-sm text-slate-500 font-medium ml-1">/lună</span>
                {Number(plan.price_per_extra_seat) > 0 && (
                    <span className="text-xs text-slate-500 font-medium ml-1">
                        + €{Number(plan.price_per_extra_seat).toFixed(0)}/agent extra
                    </span>
                )}
            </div>
            <div className="text-xs text-slate-600 font-semibold mb-1">{meta.seats}</div>
            <div className="text-xs font-semibold text-emerald-700 mb-5">14 zile trial gratis</div>

            <ul className="space-y-2 text-sm">
                {meta.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 ${f.ok ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                        <span className={`mt-0.5 ${f.ok ? 'text-emerald-500' : 'text-slate-300'}`}>{f.ok ? '✓' : '×'}</span>
                        <span>{f.label}</span>
                    </li>
                ))}
            </ul>

            <div className={`mt-6 w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-colors ${meta.button}`}>
                {submitting && selected ? 'Se redirecționează...' : selected ? 'Selectat' : 'Continuă spre plată'}
            </div>
        </button>
    );
}

export default function OnboardingPlan({ plans, stripe_configured }) {
    const [selected, setSelected] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { flash } = usePage().props;

    const handleSelect = (slug) => {
        if (submitting || !stripe_configured) return;
        setSelected(slug);
        setSubmitting(true);
        router.post(route('onboarding.plan.select'), { plan: slug }, {
            onError: () => {
                setSubmitting(false);
                setSelected(null);
            },
        });
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-100 via-white to-blue-50 py-12 px-4">
            <Head title="Alege planul tău" />

            {/* Discreet logout in corner */}
            <button
                onClick={handleLogout}
                className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-700 font-medium"
            >
                Deconectare
            </button>

            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Activare cont — pasul final
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Alege planul potrivit
                    </h1>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Toate planurile includ o perioadă de <strong>trial gratuit de 14 zile</strong>. Adaugi cardul acum, dar nu vei fi taxat pe durata celor 14 zile. Poți anula oricând, fără costuri sau obligații.
                    </p>
                </div>

                {flash?.error && (
                    <div className="max-w-2xl mx-auto mb-8 rounded-2xl bg-red-50 border border-red-200 px-5 py-3.5 text-sm text-red-700 font-semibold">
                        ✕ {flash.error}
                    </div>
                )}

                {!stripe_configured && (
                    <div className="max-w-2xl mx-auto mb-8 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3.5 text-sm text-amber-800 font-semibold">
                        ⚠ Stripe nu este configurat. Contactează administratorul platformei.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.slug}
                            plan={plan}
                            meta={PLAN_META[plan.slug] ?? PLAN_META.starter}
                            selected={selected === plan.slug}
                            onSelect={handleSelect}
                            submitting={submitting}
                        />
                    ))}
                </div>

                <div className="mt-10 text-center text-xs text-slate-400 space-y-1">
                    <p>🔒 Plata securizată prin <strong className="text-slate-600">Stripe</strong>. Cardul nu este stocat la noi.</p>
                    <p>După 14 zile, abonamentul se reînnoiește automat. Anulezi oricând fără cost din Setări → Abonament.</p>
                </div>
            </div>
        </div>
    );
}
