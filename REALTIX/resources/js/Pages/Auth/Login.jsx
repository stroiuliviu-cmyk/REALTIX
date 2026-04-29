import { useState, useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';

/* ═══════════════════════════════════════════════════════════════════
   ANIMATIONS (inline so no build config changes needed)
═══════════════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  .rt-page { font-family: 'Inter', system-ui, sans-serif; }

  @keyframes chartScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes chartScroll2 {
    0%   { transform: translateX(-10%); }
    100% { transform: translateX(-60%); }
  }
  @keyframes floatUp {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40%            { transform: scale(1);   opacity: 1; }
  }

  .chart-line-1 { animation: chartScroll  18s linear infinite; }
  .chart-line-2 { animation: chartScroll2 24s linear infinite; }
  .stat-card    { animation: floatUp 4s ease-in-out infinite; }
  .stat-card-2  { animation: floatUp 4s ease-in-out infinite 1.3s; }
  .stat-card-3  { animation: floatUp 4s ease-in-out infinite 2.6s; }
  .form-enter   { animation: fadeSlideIn 0.5s ease both; }

  .btn-primary {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(37,99,235,0.35);
  }
  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    box-shadow: 0 6px 20px rgba(37,99,235,0.45);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }

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

  .input-field {
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .input-field:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    outline: none;
  }

  .dot-1 { animation: dotPulse 1.4s ease infinite 0s; }
  .dot-2 { animation: dotPulse 1.4s ease infinite 0.2s; }
  .dot-3 { animation: dotPulse 1.4s ease infinite 0.4s; }
`;

/* ═══════════════════════════════════════════════════════════════════
   ANIMATED MARKET CHART
═══════════════════════════════════════════════════════════════════ */
function MarketChart() {
    const line1 = "M0,110 C40,100 70,75 110,68 C150,61 175,80 215,58 C255,38 285,50 325,38 C365,26 395,34 435,24 C475,14 505,20 545,12 C585,4 600,8 600,8";
    const line2 = "M0,130 C45,122 80,105 120,98 C160,91 185,108 225,88 C265,70 295,78 335,62 C375,48 405,58 445,46 C485,36 515,42 555,32 C595,22 600,25 600,25";

    return (
        <div className="absolute bottom-0 left-0 right-0 h-52 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
            <svg className="chart-line-1 absolute bottom-0" style={{ width: '200%', height: '100%' }} viewBox="0 0 1200 140" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="fill1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={line1 + ' L600,140 L0,140 Z'} fill="url(#fill1)" />
                <path d={line1} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
                <path d={line1.replace(/M0/,'M600').replace(/C/g,'C').replace(/600,8/,'1200,8')} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
            </svg>
            <svg className="chart-line-2 absolute bottom-0" style={{ width: '200%', height: '100%' }} viewBox="0 0 1200 140" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="fill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={line2 + ' L600,140 L0,140 Z'} fill="url(#fill2)" />
                <path d={line2} fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
                <path d={line2.replace(/M0/,'M600').replace(/600,25/,'1200,25')} fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   LEFT PANEL
═══════════════════════════════════════════════════════════════════ */
function LeftPanel({ t }) {
    const stats = [
        { value: '2,400+', label: t('auth.stat_agents'),       delay: 'stat-card' },
        { value: '€120M',  label: t('auth.stat_transactions'), delay: 'stat-card-2' },
        { value: '98%',    label: t('auth.stat_satisfaction'), delay: 'stat-card-3' },
    ];

    const trust = [
        { icon: '🔒', text: 'SSL 256-bit' },
        { icon: '🛡️', text: 'GDPR Compliant' },
        { icon: '⚡', text: '99.9% Uptime' },
    ];

    return (
        <div
            className="hidden lg:flex lg:w-[55%] flex-col justify-between relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #020617 0%, #0f172a 50%, #0c1a2e 100%)' }}
        >
            <div className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />

            <div className="relative z-10 flex flex-col h-full p-12">
                <div className="flex items-center gap-3 mb-auto">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="0.5" fill="none" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-wide">REALTIX</span>
                </div>

                <div className="my-auto">
                    <div className="mb-2">
                        <span className="text-xs font-semibold tracking-[0.3em] uppercase"
                            style={{ color: '#3b82f6' }}>
                            Real Estate Platform
                        </span>
                    </div>

                    <h1 className="text-5xl font-black text-white leading-tight mb-6">
                        Find. Value.<br />
                        <span style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Sell. Faster.
                        </span>
                    </h1>

                    <p className="text-base leading-relaxed mb-10" style={{ color: '#94a3b8', maxWidth: '420px' }}>
                        {t('auth.platform_sub')}
                    </p>

                    <div className="flex gap-4">
                        {stats.map(({ value, label, delay }) => (
                            <div key={label} className={`${delay} rounded-2xl px-5 py-4`}
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backdropFilter: 'blur(12px)',
                                }}>
                                <div className="text-2xl font-black text-white mb-0.5">{value}</div>
                                <div className="text-xs font-medium" style={{ color: '#64748b' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {trust.map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-2">
                            <span className="text-sm">{icon}</span>
                            <span className="text-xs font-medium" style={{ color: '#475569' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <MarketChart />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   LOADING OVERLAY
═══════════════════════════════════════════════════════════════════ */
function LoadingOverlay({ t }) {
    const [msg, setMsg] = useState(t('auth.verifying_data'));

    useEffect(() => {
        const t1 = setTimeout(() => setMsg(t('auth.authenticating')), 800);
        const t2 = setTimeout(() => setMsg(t('auth.preparing_ws')), 1600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}>
            <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400 dot-1" />
                    <div className="w-2 h-2 rounded-full bg-blue-400 dot-2" />
                    <div className="w-2 h-2 rounded-full bg-blue-400 dot-3" />
                </div>
                <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{msg}</p>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   SOCIAL BUTTON
═══════════════════════════════════════════════════════════════════ */
function SocialBtn({ href, logo, label }) {
    return (
        <a href={href}
            className="social-btn flex items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
            {logo}
            <span>{label}</span>
        </a>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function Login({ status, canResetPassword }) {
    const { t } = useTranslation();
    const [showPass, setShowPass] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const inputBase = {
        width: '100%',
        padding: '11px 14px 11px 42px',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        fontSize: '14px',
        color: '#0f172a',
        background: '#f8fafc',
        outline: 'none',
        fontFamily: 'inherit',
    };

    return (
        <div className="rt-page flex min-h-screen">
            <style>{STYLES}</style>
            <Head title={t('auth.login_page_title')} />

            {processing && <LoadingOverlay t={t} />}

            <LeftPanel t={t} />

            {/* ── RIGHT ── */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10"
                style={{ background: '#f1f5f9' }}>

                <div className="form-enter w-full" style={{ maxWidth: '420px' }}>

                    <div className="rounded-3xl bg-white p-8"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>

                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-7">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-slate-400 tracking-widest uppercase">REALTIX</div>
                                <div className="text-xs text-slate-400 -mt-0.5">Workspace</div>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('auth.welcome_back')}</h1>
                        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                            {t('auth.login_subtitle')}
                        </p>

                        {/* Status */}
                        {status && (
                            <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    {t('auth.pro_email')}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none" style={{ color: '#94a3b8' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        placeholder="name@agency.md"
                                        autoComplete="username"
                                        autoFocus
                                        className="input-field"
                                        style={inputBase}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1.5 text-xs font-medium" style={{ color: '#ef4444' }}>{errors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('auth.password')}</label>
                                    {canResetPassword && (
                                        <Link href={route('password.request')}
                                            className="text-xs font-medium hover:underline"
                                            style={{ color: '#3b82f6' }}>
                                            {t('auth.forgot_password')}
                                        </Link>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none" style={{ color: '#94a3b8' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="input-field"
                                        style={{ ...inputBase, paddingRight: '44px' }}
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowPass(v => !v)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                                        style={{ color: '#94a3b8' }}>
                                        {showPass ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1.5 text-xs font-medium" style={{ color: '#ef4444' }}>{errors.password}</p>
                                )}
                            </div>

                            {/* Remember */}
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <Checkbox
                                        name="remember"
                                        checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                    />
                                    <span className="text-sm text-slate-600">{t('auth.remember_me')}</span>
                                </label>
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={processing}
                                className="btn-primary w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
                                {processing ? (
                                    <>
                                        <svg className="w-4 h-4" style={{ animation: 'spin 0.7s linear infinite' }} fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('auth.logging_in')}
                                    </>
                                ) : (
                                    <>
                                        {t('auth.login_btn')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
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

                        {/* Social */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <SocialBtn
                                href={route('social.redirect', 'google')}
                                label="Google"
                                logo={
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                }
                            />
                            <SocialBtn
                                href={route('social.redirect', 'apple')}
                                label="Apple"
                                logo={
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                    </svg>
                                }
                            />
                            <SocialBtn
                                href={route('social.redirect', 'microsoft')}
                                label="Microsoft"
                                logo={
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#f25022" d="M1 1h10v10H1z"/>
                                        <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                                        <path fill="#7fba00" d="M1 13h10v10H1z"/>
                                        <path fill="#ffb900" d="M13 13h10v10H13z"/>
                                    </svg>
                                }
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 text-center">
                        <p className="text-sm" style={{ color: '#64748b' }}>
                            {t('auth.no_account')}{' '}
                            <Link href={route('register')}
                                className="font-semibold hover:underline"
                                style={{ color: '#3b82f6' }}>
                                {t('auth.request_demo')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
