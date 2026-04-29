import { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useTranslation } from '@/Hooks/useTranslation';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  .ob-page { font-family: 'Inter', system-ui, sans-serif; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  .step-enter { animation: fadeIn 0.35s ease both; }
  .btn-em {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 4px 14px rgba(5,150,105,0.3);
    transition: all 0.2s;
  }
  .btn-em:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(5,150,105,0.4); }
  .lang-btn { transition: all 0.15s; }
  .lang-btn:hover { transform: scale(1.04); }
`;

/* ── Progress bar ── */
function Progress({ current, steps }) {
    return (
        <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${current === s.id ? 'text-white' : current > s.id ? 'text-white' : 'text-slate-400 bg-slate-100'}`}
                        style={current >= s.id ? { background: 'linear-gradient(135deg,#10b981,#059669)' } : {}}>
                        {current > s.id ? '✓' : s.id}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${current >= s.id ? 'text-slate-700' : 'text-slate-400'}`}>
                        {s.label}
                    </span>
                    {i < steps.length - 1 && (
                        <div className={`h-0.5 w-8 sm:w-16 rounded-full transition-all ${current > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── Step 1: Logo ── */
function StepLogo({ agency, onNext, onSkip, t }) {
    const [preview, setPreview] = useState(agency?.logo_path ? `/storage/${agency.logo_path}` : null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('logo', file);
            await axios.post('/api/agency/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch {}
        setUploading(false);
    };

    return (
        <div className="step-enter space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('onboarding.logo_title')}</h2>
                <p className="text-sm text-slate-500">{t('onboarding.logo_sub')}</p>
            </div>

            <div className="flex flex-col items-center gap-5">
                <div
                    onClick={() => fileRef.current?.click()}
                    className="w-32 h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50 overflow-hidden"
                    style={{ borderColor: preview ? '#10b981' : '#e2e8f0', background: preview ? 'transparent' : '#f8fafc' }}>
                    {preview ? (
                        <img src={preview} alt="Logo" className="w-full h-full object-contain p-3" />
                    ) : (
                        <>
                            <span className="text-3xl mb-1">🏢</span>
                            <span className="text-xs text-slate-400 font-medium">{t('onboarding.logo_click')}</span>
                        </>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <p className="text-xs text-slate-400">{t('onboarding.logo_hint')}</p>
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onSkip} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('onboarding.skip')}
                </button>
                <button onClick={onNext} disabled={uploading}
                    className="btn-em flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {uploading ? t('onboarding.uploading') : t('onboarding.continue')}
                </button>
            </div>
        </div>
    );
}

/* ── Step 2: Language ── */
function StepLanguage({ currentLocale, onNext, onSkip, t }) {
    const [selected, setSelected] = useState(currentLocale ?? 'ro');
    const langs = [
        { code: 'ro', flag: '🇲🇩', label: t('onboarding.lang_ro_label'), sub: t('onboarding.lang_ro_sub') },
        { code: 'ru', flag: '🇷🇺', label: t('onboarding.lang_ru_label'), sub: t('onboarding.lang_ru_sub') },
        { code: 'en', flag: '🇬🇧', label: t('onboarding.lang_en_label'), sub: t('onboarding.lang_en_sub') },
    ];

    return (
        <div className="step-enter space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('onboarding.language_title')}</h2>
                <p className="text-sm text-slate-500">{t('onboarding.language_sub')}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {langs.map(({ code, flag, label, sub }) => (
                    <button key={code} onClick={() => setSelected(code)}
                        className={`lang-btn flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all
                            ${selected === code ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <span className="text-3xl">{flag}</span>
                        <span className={`text-sm font-semibold ${selected === code ? 'text-emerald-700' : 'text-slate-700'}`}>{label}</span>
                        <span className="text-xs text-slate-400">{sub}</span>
                    </button>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onSkip} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('onboarding.skip')}
                </button>
                <button onClick={() => onNext(selected)}
                    className="btn-em flex-1 rounded-xl py-2.5 text-sm font-semibold text-white">
                    {t('onboarding.confirm')}
                </button>
            </div>
        </div>
    );
}

/* ── Step 3: Invite agents ── */
function StepAgents({ onNext, onSkip, t }) {
    const [emails, setEmails] = useState(['']);
    const add    = () => setEmails(e => [...e, '']);
    const remove = (i) => setEmails(e => e.filter((_, idx) => idx !== i));
    const update = (i, v) => setEmails(e => e.map((x, idx) => idx === i ? v : x));

    const send = async () => {
        const valid = emails.filter(e => e.includes('@'));
        if (valid.length) {
            try { await axios.post('/api/agency/invite', { emails: valid }); } catch {}
        }
        onNext();
    };

    return (
        <div className="step-enter space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('onboarding.agents_title')}</h2>
                <p className="text-sm text-slate-500">{t('onboarding.agents_sub')}</p>
            </div>

            <div className="space-y-2.5">
                {emails.map((email, i) => (
                    <div key={i} className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={e => update(i, e.target.value)}
                            placeholder={t('onboarding.agent_placeholder')}
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                        />
                        {emails.length > 1 && (
                            <button onClick={() => remove(i)}
                                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-200 transition-colors">
                                ×
                            </button>
                        )}
                    </div>
                ))}
                <button onClick={add}
                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    <span className="text-lg leading-none">+</span> {t('onboarding.add_agent')}
                </button>
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onSkip} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('onboarding.skip')}
                </button>
                <button onClick={send}
                    className="btn-em flex-1 rounded-xl py-2.5 text-sm font-semibold text-white">
                    {t('onboarding.send_invites')}
                </button>
            </div>
        </div>
    );
}

/* ── Step 4: First listing ── */
function StepListing({ t }) {
    const [loading, setLoading] = useState(false);

    const goToListing = () => {
        setLoading(true);
        router.post(route('onboarding.complete'), {}, {
            onFinish: () => router.visit(route('properties.create')),
        });
    };

    const finish = () => {
        setLoading(true);
        router.post(route('onboarding.complete'));
    };

    return (
        <div className="step-enter space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('onboarding.listing_title')}</h2>
                <p className="text-sm text-slate-500">{t('onboarding.listing_sub')}</p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">🏠</span>
                <p className="text-sm font-medium text-slate-700">{t('onboarding.listing_cta')}</p>
                <p className="text-xs text-slate-400">{t('onboarding.listing_types')}</p>
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={finish} disabled={loading}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60">
                    {t('onboarding.go_dashboard')}
                </button>
                <button onClick={goToListing} disabled={loading}
                    className="btn-em flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                        <svg className="w-4 h-4" style={{ animation: 'spin 0.7s linear infinite' }} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : null} {t('onboarding.add_first_listing')}
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════ */
export default function OnboardingIndex({ user, agency }) {
    const { t } = useTranslation();
    const [step, setStep]     = useState(1);
    const [locale, setLocale] = useState(user?.locale ?? 'ro');

    const STEPS = [
        { id: 1, label: t('onboarding.step_logo'),    icon: '🏢' },
        { id: 2, label: t('onboarding.step_language'), icon: '🌍' },
        { id: 3, label: t('onboarding.step_agents'),   icon: '👥' },
        { id: 4, label: t('onboarding.step_listing'),  icon: '🏠' },
    ];

    const next = () => setStep(s => Math.min(s + 1, 4));
    const skip = () => next();

    const handleLanguage = (lang) => {
        setLocale(lang);
        axios.post(`/language/${lang}`).catch(() => {});
        next();
    };

    return (
        <div className="ob-page min-h-screen flex" style={{ background: '#f1f5f9' }}>
            <style>{STYLES}</style>
            <Head title={t('onboarding.page_title')} />

            {/* Left decorative panel */}
            <div className="hidden lg:flex lg:w-[38%] flex-col justify-center items-center p-12 relative"
                style={{ background: 'linear-gradient(145deg,#020617 0%,#0f172a 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="relative z-10 text-center space-y-6">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('onboarding.welcome')}</h3>
                        <p className="text-sm" style={{ color: '#64748b' }}>
                            {t('onboarding.welcome_sub')}
                        </p>
                    </div>
                    <div className="space-y-2 text-left">
                        {STEPS.map(s => (
                            <div key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all
                                ${step === s.id ? 'bg-white/8' : ''}`}
                                style={step === s.id ? { background: 'rgba(255,255,255,0.06)' } : {}}>
                                <span className="text-base">{s.icon}</span>
                                <span className={`text-sm font-medium ${step >= s.id ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
                                {step > s.id && <span className="ml-auto text-emerald-400 text-xs font-semibold">✓</span>}
                                {step === s.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: step content */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full" style={{ maxWidth: '480px' }}>
                    <Progress current={step} steps={STEPS} />

                    <div className="bg-white rounded-3xl p-8"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>

                        {step === 1 && <StepLogo    agency={agency} onNext={next} onSkip={skip} t={t} />}
                        {step === 2 && <StepLanguage currentLocale={locale} onNext={handleLanguage} onSkip={skip} t={t} />}
                        {step === 3 && <StepAgents   onNext={next} onSkip={skip} t={t} />}
                        {step === 4 && <StepListing  t={t} />}
                    </div>

                    <p className="mt-4 text-center text-xs" style={{ color: '#94a3b8' }}>
                        {t('onboarding.step_progress', { step, total: STEPS.length })}
                    </p>
                </div>
            </div>
        </div>
    );
}
