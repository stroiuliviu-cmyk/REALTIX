import { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';

const PLAN_META = {
    starter: {
        gradient: 'from-slate-50 to-slate-100',
        accent: 'border-slate-300 ring-slate-300',
        button: 'bg-slate-900 hover:bg-slate-700',
        tag: null,
        features: [
            { ok: true,  label: 'Până la 50 anunțuri active' },
            { ok: true,  label: '1 cont (doar tu)' },
            { ok: false, label: 'Instrumente AI (descriere + estimare)' },
            { ok: false, label: 'Web Offers (scraping piață)' },
            { ok: false, label: 'Contracte PDF' },
            { ok: false, label: 'Statistici avansate' },
        ],
    },
    medium: {
        gradient: 'from-blue-50 to-indigo-100',
        accent: 'border-blue-500 ring-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700',
        tag: 'Cel mai popular',
        features: [
            { ok: true, label: 'Până la 500 anunțuri active' },
            { ok: true, label: 'Până la 5 agenți' },
            { ok: true, label: 'Instrumente AI nelimitate' },
            { ok: true, label: 'Web Offers + scraper 999.md' },
            { ok: true, label: 'Contracte PDF (13+ șabloane)' },
            { ok: false, label: 'Statistici avansate' },
        ],
    },
    pro: {
        gradient: 'from-purple-50 to-fuchsia-100',
        accent: 'border-purple-500 ring-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700',
        tag: 'Toate funcțiile',
        features: [
            { ok: true, label: 'Anunțuri nelimitate' },
            { ok: true, label: 'Agenți nelimitați' },
            { ok: true, label: 'Instrumente AI nelimitate' },
            { ok: true, label: 'Web Offers + scraper 999.md' },
            { ok: true, label: 'Contracte PDF + DOCX' },
            { ok: true, label: 'Statistici avansate + AI insights' },
        ],
    },
};

function PlanCard({ plan, meta, selected, onSelect, submitting }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(plan.slug)}
            disabled={submitting}
            className={`relative text-left rounded-3xl border-2 bg-gradient-to-br ${meta.gradient} p-7 transition-all hover:scale-[1.015] hover:shadow-2xl disabled:opacity-60 ${
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

            <div className="mb-2">
                <span className="text-4xl font-black text-slate-900">€{Number(plan.price_monthly).toFixed(0)}</span>
                <span className="text-sm text-slate-500 font-medium ml-1">/lună</span>
            </div>
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
                {submitting && selected ? 'Se activează...' : selected ? 'Selectat' : 'Începe trial'}
            </div>
        </button>
    );
}

export default function OnboardingPlan({ plans }) {
    const [selected, setSelected] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSelect = (slug) => {
        if (submitting) return;
        setSelected(slug);
        setSubmitting(true);
        router.post(route('onboarding.plan.select'), { plan: slug }, {
            onError: () => {
                setSubmitting(false);
                setSelected(null);
            },
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 py-12 px-4">
            <Head title="Alege planul tău" />

            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Pasul 1 din 1
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Alege planul potrivit
                    </h1>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Toate planurile încep cu <strong>14 zile trial gratis</strong>. Nu ai nevoie de card bancar acum — îl adaugi doar dacă vrei să continui după trial.
                    </p>
                </div>

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

                <div className="mt-10 text-center text-xs text-slate-400">
                    <p>Poți schimba planul oricând din <Link href="/subscription" className="text-blue-600 hover:underline font-semibold">Setări → Abonament</Link>.</p>
                    <p className="mt-1">După cele 14 zile gratis vei primi o notificare pentru activarea plății.</p>
                </div>
            </div>
        </div>
    );
}
