import { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  .rt-page { font-family: 'Inter', system-ui, sans-serif; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatUp {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .form-enter { animation: fadeSlideIn 0.5s ease both; }
  .feat-1 { animation: floatUp 5s ease-in-out infinite 0s; }
  .feat-2 { animation: floatUp 5s ease-in-out infinite 0.8s; }
  .feat-3 { animation: floatUp 5s ease-in-out infinite 1.6s; }
  .feat-4 { animation: floatUp 5s ease-in-out infinite 2.4s; }
  .feat-5 { animation: floatUp 5s ease-in-out infinite 3.2s; }

  .btn-main {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(5,150,105,0.35);
  }
  .btn-main:hover:not(:disabled) {
    background: linear-gradient(135deg, #047857 0%, #065f46 100%);
    box-shadow: 0 6px 20px rgba(5,150,105,0.45);
    transform: translateY(-1px);
  }
  .btn-main:active:not(:disabled) { transform: translateY(0); }

  .social-btn {
    transition: all 0.18s ease;
    border: 1px solid #e2e8f0;
  }
  .social-btn:hover {
    border-color: #94a3b8;
    background: #f8fafc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .input-field { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .input-field:focus {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
    outline: none;
  }

  .strength-bar { transition: width 0.4s ease, background-color 0.4s ease; }
`;

/* ═══════════════════════════════════════════════════════════════════
   LEFT PANEL
═══════════════════════════════════════════════════════════════════ */
function LeftPanel({ t }) {
    const FEATURES = [
        { cls: 'feat-1', icon: '🏠', label: t('auth.feat_crm'),       desc: t('auth.feat_crm_desc') },
        { cls: 'feat-2', icon: '🤖', label: t('auth.feat_ai'),        desc: t('auth.feat_ai_desc') },
        { cls: 'feat-3', icon: '📢', label: t('auth.feat_autopost'),  desc: t('auth.feat_autopost_desc') },
        { cls: 'feat-4', icon: '📄', label: t('auth.feat_contracts'), desc: t('auth.feat_contracts_desc') },
        { cls: 'feat-5', icon: '📊', label: t('auth.feat_analytics'), desc: t('auth.feat_analytics_desc') },
    ];

    return (
        <div
            className="hidden lg:flex lg:w-[55%] flex-col justify-between relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #020617 0%, #0f172a 50%, #0c1a2e 100%)' }}
        >
            <div className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

            <div className="relative z-10 flex flex-col h-full p-12">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-auto">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="0.5" fill="none" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-wide">REALTIX</span>
                </div>

                {/* Main text */}
                <div className="my-auto">
                    <div className="mb-2">
                        <span className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#10b981' }}>
                            {t('auth.trial_label')}
                        </span>
                    </div>

                    <h1 className="text-4xl font-black text-white leading-tight mb-3">
                        {t('auth.build_modern')}<br />
                        <span style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {t('auth.modern_agency')}
                        </span>
                    </h1>

                    <p className="text-sm mb-8 leading-relaxed" style={{ color: '#64748b', maxWidth: '380px' }}>
                        {t('auth.modern_desc')}
                    </p>

                    {/* Feature cards */}
                    <div className="space-y-2.5">
                        {FEATURES.map(({ cls, icon, label, desc }) => (
                            <div key={label} className={`${cls} flex items-center gap-3 rounded-2xl px-4 py-3`}
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    {icon}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-white">{label}</div>
                                    <div className="text-xs" style={{ color: '#475569' }}>{desc}</div>
                                </div>
                                <svg className="w-4 h-4 ml-auto shrink-0" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trial badge */}
                <div className="flex items-center gap-3 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 rounded-full px-4 py-2"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="text-sm">⭐</span>
                        <span className="text-sm font-semibold" style={{ color: '#10b981' }}>{t('auth.trial_badge')}</span>
                    </div>
                    <span className="text-xs" style={{ color: '#334155' }}>{t('auth.no_card')}</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   PASSWORD STRENGTH
═══════════════════════════════════════════════════════════════════ */
function StrengthBar({ password, t }) {
    const { score, label, color } = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '#e2e8f0' };
        let s = 0;
        if (password.length >= 8) s++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^a-zA-Z0-9]/.test(password)) s++;
        if (s <= 1) return { score: s, label: t('auth.strength_weak'),   color: '#ef4444' };
        if (s === 2) return { score: s, label: t('auth.strength_medium'), color: '#f59e0b' };
        if (s === 3) return { score: s, label: t('auth.strength_good'),   color: '#3b82f6' };
        return           { score: s, label: t('auth.strength_strong'), color: '#10b981' };
    }, [password, t]);

    if (!password) return null;

    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full strength-bar"
                        style={{ backgroundColor: i <= score ? color : '#e2e8f0' }} />
                ))}
            </div>
            <p className="text-xs font-medium" style={{ color }}>{label}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED FIELD COMPONENTS
═══════════════════════════════════════════════════════════════════ */
function Icon({ d }) {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
        </svg>
    );
}

function Field({ id, label, icon, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold mb-1.5" style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none" style={{ color: '#94a3b8' }}>
                    <Icon d={icon} />
                </span>
                {children}
            </div>
            {error && <p className="mt-1 text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function Register() {
    const { t } = useTranslation();
    const [showPass, setShowPass] = useState(false);
    const [showConf, setShowConf] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name:                  '',
        email:                 '',
        phone:                 '',
        agency_name:           '',
        password:              '',
        password_confirmation: '',
        terms:                 false,
    });

    const set = (k) => (e) => setData(k, e.target.value);

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    const inputBase = {
        width: '100%',
        padding: '10px 14px 10px 40px',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        fontSize: '14px',
        color: '#0f172a',
        background: '#f8fafc',
        outline: 'none',
        fontFamily: 'inherit',
    };

    const EYE   = 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z';
    const EYOFF = 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21';

    return (
        <div className="rt-page flex min-h-screen">
            <style>{STYLES}</style>
            <Head title={t('auth.register_page_title')} />

            <LeftPanel t={t} />

            {/* ── RIGHT ── */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto"
                style={{ background: '#f1f5f9' }}>

                <div className="form-enter w-full py-4" style={{ maxWidth: '440px' }}>

                    {/* Card */}
                    <div className="rounded-3xl bg-white p-8"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>

                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#94a3b8' }}>REALTIX</div>
                                <div className="text-xs -mt-0.5" style={{ color: '#94a3b8' }}>{t('auth.trial_label')}</div>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('auth.create_account_h')}</h1>
                        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                            {t('auth.create_subtitle')}
                        </p>

                        <form onSubmit={submit} className="space-y-3.5">

                            {/* Name */}
                            <Field id="name" label={t('auth.full_name')}
                                icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                error={errors.name}>
                                <input id="name" type="text" value={data.name} onChange={set('name')}
                                    placeholder="Liviu Stroiu" autoFocus autoComplete="name"
                                    className="input-field" style={inputBase} />
                            </Field>

                            {/* Email */}
                            <Field id="email" label={t('auth.pro_email_req')}
                                icon="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                error={errors.email}>
                                <input id="email" type="email" value={data.email} onChange={set('email')}
                                    placeholder="office@agency.md" autoComplete="username"
                                    className="input-field" style={inputBase} />
                            </Field>

                            {/* Phone + Agency */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field id="phone" label={t('auth.phone')}
                                    icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    error={errors.phone}>
                                    <input id="phone" type="tel" value={data.phone} onChange={set('phone')}
                                        placeholder="+373..." autoComplete="tel"
                                        className="input-field" style={inputBase} />
                                </Field>

                                <Field id="agency_name" label={t('auth.agency')}
                                    icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    error={errors.agency_name}>
                                    <input id="agency_name" type="text" value={data.agency_name} onChange={set('agency_name')}
                                        placeholder="Lux Estate"
                                        className="input-field" style={inputBase} />
                                </Field>
                            </div>

                            {/* Password */}
                            <Field id="password" label={t('auth.password_req')}
                                icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                error={errors.password}>
                                <input id="password" type={showPass ? 'text' : 'password'} value={data.password} onChange={set('password')}
                                    placeholder="Min. 8 caractere" autoComplete="new-password"
                                    className="input-field" style={{ ...inputBase, paddingRight: '40px' }} />
                                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3" style={{ color: '#94a3b8' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPass ? EYOFF : EYE} />
                                    </svg>
                                </button>
                            </Field>
                            <StrengthBar password={data.password} t={t} />

                            {/* Confirm */}
                            <Field id="password_confirmation" label={t('auth.confirm_password')}
                                icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                error={errors.password_confirmation}>
                                <input id="password_confirmation" type={showConf ? 'text' : 'password'}
                                    value={data.password_confirmation} onChange={set('password_confirmation')}
                                    placeholder="••••••••" autoComplete="new-password"
                                    className="input-field" style={{ ...inputBase, paddingRight: '40px' }} />
                                <button type="button" tabIndex={-1} onClick={() => setShowConf(v => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3" style={{ color: '#94a3b8' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConf ? EYOFF : EYE} />
                                    </svg>
                                </button>
                            </Field>

                            {/* Checkboxes */}
                            <div className="space-y-2.5 pt-1">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={data.terms}
                                        onChange={e => setData('terms', e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-500" />
                                    <span className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                                        {t('auth.accept_terms')}{' '}
                                        <a href="#" className="font-medium hover:underline" style={{ color: '#10b981' }}>{t('auth.terms_link')}</a>
                                        {' '}{t('auth.and')}{' '}
                                        <a href="#" className="font-medium hover:underline" style={{ color: '#10b981' }}>{t('auth.privacy_link')}</a>
                                    </span>
                                </label>
                                {errors.terms && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{errors.terms}</p>}

                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" defaultChecked
                                        className="h-4 w-4 rounded border-gray-300 accent-emerald-500" readOnly />
                                    <span className="text-xs" style={{ color: '#64748b' }}>
                                        {t('auth.trial_checkbox')}
                                    </span>
                                </label>
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={processing || !data.terms}
                                className="btn-main w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-1">
                                {processing ? (
                                    <>
                                        <svg className="w-4 h-4" style={{ animation: 'spin 0.7s linear infinite' }} fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('auth.creating_account')}
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        {t('auth.create_btn')}
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Social */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t" style={{ borderColor: '#f1f5f9' }} />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-xs font-medium" style={{ color: '#94a3b8' }}>
                                    {t('auth.or_with')}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    provider: 'google', label: 'Google',
                                    logo: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    ),
                                },
                                {
                                    provider: 'microsoft', label: 'Microsoft',
                                    logo: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                            <path fill="#f25022" d="M1 1h10v10H1z"/>
                                            <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                                            <path fill="#7fba00" d="M1 13h10v10H1z"/>
                                            <path fill="#ffb900" d="M13 13h10v10H13z"/>
                                        </svg>
                                    ),
                                },
                            ].map(({ provider, label, logo }) => (
                                <a key={provider} href={route('social.redirect', provider)}
                                    className="social-btn flex items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                                    {logo}
                                    <span>{label}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-center">
                        <p className="text-sm" style={{ color: '#64748b' }}>
                            {t('auth.have_account')}{' '}
                            <Link href={route('login')} className="font-semibold hover:underline" style={{ color: '#10b981' }}>
                                {t('auth.login_here')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
