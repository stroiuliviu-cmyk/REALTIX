import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/Hooks/useTranslation';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: #f8fafc; }

@keyframes floatUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRingA {
    0%   { transform: scale(1);   opacity: 0.5; }
    100% { transform: scale(1.7); opacity: 0; }
}
@keyframes pulseRingB {
    0%   { transform: scale(1);   opacity: 0.3; }
    100% { transform: scale(2.1); opacity: 0; }
}
@keyframes floatEnvelope {
    0%, 100% { transform: translateY(0)   rotate(-3deg); }
    50%       { transform: translateY(-10px) rotate(3deg); }
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
@keyframes tickPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.7; transform: scale(0.95); }
}
@keyframes benefitIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
}
`;

export default function VerifyEmail({ status, email }) {
    const { t } = useTranslation();
    const { post, processing } = useForm({});
    const [countdown, setCountdown] = useState(0);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const emailForm = useForm({ email: '' });

    const BENEFITS = [
        { icon: '🏘️', label: t('auth.verify_benefit_crm') },
        { icon: '🤖', label: t('auth.verify_benefit_ai') },
        { icon: '📢', label: t('auth.verify_benefit_autopost') },
        { icon: '🎁', label: t('auth.verify_benefit_trial') },
    ];

    useEffect(() => {
        if (status === 'verification-link-sent') {
            setCountdown(45);
        }
    }, [status]);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = (e) => {
        e.preventDefault();
        if (countdown > 0 || processing) return;
        post(route('verification.send'));
    };

    const canResend = countdown === 0 && !processing;

    return (
        <>
            <Head title={t('auth.verify_page_title')} />
            <style>{STYLES}</style>

            <div style={{
                fontFamily: "'Inter', sans-serif",
                minHeight: '100vh',
                background: 'linear-gradient(150deg, #f0f9ff 0%, #f0fdf4 45%, #fefce8 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 16px',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '460px',
                    animation: 'floatUp 0.55s ease-out both',
                }}>

                    {/* Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px', height: '38px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="9,22 9,12 15,12 15,22"
                                        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.6px' }}>
                                REAL<span style={{ color: '#10b981' }}>TIX</span>
                            </span>
                        </a>
                    </div>

                    {/* Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '48px 40px 40px',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.05)',
                    }}>

                        {/* Envelope with pulse rings */}
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{
                                    position: 'absolute', inset: '-18px', borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.12)',
                                    animation: 'pulseRingB 2.4s ease-out infinite 0.3s',
                                }} />
                                <div style={{
                                    position: 'absolute', inset: '-8px', borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.18)',
                                    animation: 'pulseRingA 2.4s ease-out infinite',
                                }} />
                                <div style={{
                                    position: 'relative', zIndex: 1,
                                    width: '88px', height: '88px',
                                    background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '38px',
                                    animation: 'floatEnvelope 3.5s ease-in-out infinite',
                                    boxShadow: '0 8px 24px rgba(16,185,129,0.2)',
                                }}>
                                    📩
                                </div>
                            </div>
                        </div>

                        {/* Heading */}
                        <h1 style={{
                            margin: '0 0 10px',
                            fontSize: '23px',
                            fontWeight: '800',
                            color: '#111827',
                            textAlign: 'center',
                            letterSpacing: '-0.5px',
                        }}>
                            {t('auth.verify_heading')}
                        </h1>
                        <p style={{
                            margin: '0 0 20px',
                            fontSize: '14px',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: '1.6',
                        }}>
                            {t('auth.verify_sent_to')}
                        </p>

                        {/* Email chip */}
                        {email && (
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                                border: '1.5px solid #a7f3d0',
                                borderRadius: '12px',
                                padding: '13px 20px',
                                marginBottom: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '9px',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                <span style={{
                                    fontSize: '15px', fontWeight: '700',
                                    color: '#065f46', letterSpacing: '-0.2px',
                                }}>
                                    {email}
                                </span>
                            </div>
                        )}

                        <p style={{
                            margin: '0 0 28px',
                            fontSize: '13px',
                            color: '#9ca3af',
                            textAlign: 'center',
                            lineHeight: '1.55',
                        }}>
                            {t('auth.verify_instruction')}
                            <br />
                            {t('auth.verify_spam')}{' '}
                            <strong style={{ color: '#6b7280' }}>{t('auth.verify_spam_folder')}</strong>.
                        </p>

                        {/* Success banner */}
                        {status === 'verification-link-sent' && (
                            <div style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <div style={{
                                    width: '22px', height: '22px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                        stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20,6 9,17 4,12"/>
                                    </svg>
                                </div>
                                <span style={{ fontSize: '13px', color: '#065f46', fontWeight: '500' }}>
                                    {t('auth.verify_success')}
                                </span>
                            </div>
                        )}

                        {/* Resend button */}
                        <form onSubmit={handleResend} style={{ marginBottom: '10px' }}>
                            <button
                                type="submit"
                                disabled={!canResend}
                                style={{
                                    width: '100%',
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: canResend
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : '#f3f4f6',
                                    color: canResend ? 'white' : '#9ca3af',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: canResend ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: canResend ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
                                    letterSpacing: '-0.1px',
                                }}
                            >
                                {processing ? (
                                    <>
                                        <svg style={{ animation: 'spin 0.8s linear infinite', width: '16px', height: '16px' }}
                                            viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor"
                                                strokeWidth="4" strokeOpacity="0.3"/>
                                            <path d="M4 12a8 8 0 018-8" stroke="currentColor"
                                                strokeWidth="4" strokeLinecap="round"/>
                                        </svg>
                                        {t('auth.verify_sending')}
                                    </>
                                ) : countdown > 0 ? (
                                    <>
                                        <span style={{ animation: 'tickPulse 1s ease-in-out infinite', fontSize: '14px' }}>⏱</span>
                                        {t('auth.verify_resend_in', { seconds: countdown })}
                                    </>
                                ) : (
                                    <>🔄 {t('auth.verify_resend_btn')}</>
                                )}
                            </button>
                        </form>

                        {/* Secondary actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setShowEmailForm(v => !v)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '7px',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e5e7eb',
                                    background: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'all 0.18s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                            >
                                ✏️ {t('auth.verify_change_email')}
                            </button>

                            {showEmailForm && (
                                <form
                                    onSubmit={e => {
                                        e.preventDefault();
                                        emailForm.post(route('email.change'), {
                                            onSuccess: () => { setShowEmailForm(false); emailForm.reset(); },
                                        });
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                                >
                                    <input
                                        type="email"
                                        value={emailForm.data.email}
                                        onChange={e => emailForm.setData('email', e.target.value)}
                                        placeholder="email@nou.com"
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '11px 14px',
                                            borderRadius: '10px',
                                            border: '1.5px solid #e5e7eb',
                                            fontSize: '14px',
                                            color: '#111827',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    {emailForm.errors.email && (
                                        <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{emailForm.errors.email}</p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={emailForm.processing || !emailForm.data.email}
                                        style={{
                                            padding: '11px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: emailForm.processing ? 'not-allowed' : 'pointer',
                                            opacity: emailForm.processing ? 0.7 : 1,
                                        }}
                                    >
                                        {emailForm.processing ? '...' : 'Salvează adresa nouă'}
                                    </button>
                                </form>
                            )}

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '11px 20px',
                                    borderRadius: '12px',
                                    border: '1.5px solid transparent',
                                    background: 'transparent',
                                    color: '#9ca3af',
                                    fontSize: '13px',
                                    fontWeight: '400',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#6b7280'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
                            >
                                {t('auth.verify_logout')}
                            </Link>
                        </div>

                        {/* Divider */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            margin: '28px 0 22px',
                        }}>
                            <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }} />
                            <span style={{ fontSize: '11px', color: '#d1d5db', whiteSpace: 'nowrap', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('auth.verify_divider')}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }} />
                        </div>

                        {/* Benefits grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                        }}>
                            {BENEFITS.map(({ icon, label }, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: '#f9fafb',
                                        borderRadius: '10px',
                                        padding: '13px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '9px',
                                        border: '1px solid #f3f4f6',
                                        animation: `benefitIn 0.5s ease-out ${0.15 + i * 0.07}s both`,
                                    }}
                                >
                                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
                                    <span style={{
                                        fontSize: '12px', fontWeight: '500',
                                        color: '#374151', lineHeight: '1.35',
                                    }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginTop: '20px',
                        lineHeight: '1.5',
                    }}>
                        © 2025 REALTIX · {t('auth.verify_footer')}
                        <br />
                        <span style={{ color: '#d1d5db' }}>{t('auth.verify_help')}</span>{' '}
                        <a href="mailto:support@realtix.md" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>
                            {t('auth.verify_contact')}
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}
