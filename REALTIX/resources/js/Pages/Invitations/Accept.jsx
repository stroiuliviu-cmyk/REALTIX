import { Head, Link, useForm, usePage } from '@inertiajs/react';

const ROLE_LABELS = { admin: 'Administrator', realtor: 'Agent imobiliar' };

export default function Accept({ invitation, flow, error }) {
    const { flash } = usePage().props;

    if (error || ! invitation) {
        return <ErrorScreen message={error ?? 'Invitație invalidă'} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Head title="Invitație REALTIX" />

            <div className="w-full max-w-md">
                {/* Logo header */}
                <div className="text-center mb-6">
                    <div className="text-3xl font-black tracking-widest text-blue-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        REALTIX
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-700 px-6 py-7 text-white text-center">
                        {invitation.agency.logo_path ? (
                            <img
                                src={`/storage/${invitation.agency.logo_path}`}
                                alt={invitation.agency.name}
                                className="w-16 h-16 rounded-2xl bg-white p-1 mx-auto mb-3 object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mx-auto mb-3">
                                🏢
                            </div>
                        )}
                        <h1 className="font-bold text-lg">{invitation.agency.name}</h1>
                        <p className="text-xs text-blue-100 mt-1">te invită pe REALTIX</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {flash?.success && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
                                ✓ {flash.success}
                            </div>
                        )}
                        {flash?.warning && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
                                ⚠ {flash.warning}
                            </div>
                        )}

                        <div className="space-y-2 text-sm">
                            <Row label="Email" value={invitation.email} />
                            <Row label="Rol" value={ROLE_LABELS[invitation.role] ?? invitation.role} />
                            <Row label="Invitat de" value={invitation.invited_by ?? '—'} />
                            {invitation.expires_at && (
                                <Row
                                    label="Expiră la"
                                    value={new Date(invitation.expires_at).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' })}
                                />
                            )}
                        </div>

                        <hr className="border-slate-100" />

                        {/* Decide which CTA to render */}
                        {flow.email_mismatch && (
                            <EmailMismatchScreen authEmail={flow.auth_user_email} invitationEmail={invitation.email} token={invitation.token} />
                        )}

                        {! flow.email_mismatch && flow.is_existing_user && flow.needs_login && (
                            <LoginPromptScreen email={invitation.email} token={invitation.token} />
                        )}

                        {! flow.email_mismatch && flow.is_existing_user && flow.is_authenticated && (
                            <ExistingUserAcceptScreen token={invitation.token} agencyName={invitation.agency.name} />
                        )}

                        {! flow.is_existing_user && (
                            <NewUserRegisterScreen
                                token={invitation.token}
                                email={invitation.email}
                                agencyName={invitation.agency.name}
                            />
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                    Nu cunoști persoana care te-a invitat? Poți ignora în siguranță acest email.
                </p>
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-medium text-slate-800 truncate ml-2">{value}</span>
        </div>
    );
}

function ErrorScreen({ message }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Head title="Invitație invalidă" />
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 max-w-md w-full text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h1 className="font-bold text-lg text-slate-900 mb-2">Invitație invalidă</h1>
                <p className="text-sm text-slate-600 mb-5">{message}</p>
                <Link href="/login" className="inline-block rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors">
                    Mergi la login
                </Link>
            </div>
        </div>
    );
}

function EmailMismatchScreen({ authEmail, invitationEmail, token }) {
    return (
        <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                Ești logat ca <strong>{authEmail}</strong>, dar invitația a fost trimisă către <strong>{invitationEmail}</strong>.
                Deconectează-te și loghează-te cu emailul corect.
            </div>
            <Link
                href="/logout"
                method="post"
                as="button"
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
                🚪 Deconectează-te
            </Link>
        </div>
    );
}

function LoginPromptScreen({ email, token }) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-700">
                Ai deja cont REALTIX cu emailul <strong>{email}</strong>.
                Loghează-te ca să accepți invitația.
            </p>
            <a
                href={`/login?intended=${encodeURIComponent('/invitations/' + token)}&email=${encodeURIComponent(email)}`}
                className="block w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-3 transition-colors text-center"
            >
                Loghează-te și acceptă
            </a>
        </div>
    );
}

function ExistingUserAcceptScreen({ token, agencyName }) {
    const { post, processing } = useForm({});
    const submit = (e) => { e.preventDefault(); post(`/invitations/${token}/accept`); };

    return (
        <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-slate-700">
                Apăsând „Acceptă", contul tău va fi adăugat la agenția <strong>{agencyName}</strong>.
                Vei putea comuta între agenții din meniul profilului.
            </p>
            <button
                type="submit"
                disabled={processing}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
                {processing ? 'Se procesează…' : '✓ Acceptă invitația'}
            </button>
        </form>
    );
}

function NewUserRegisterScreen({ token, email, agencyName }) {
    const { data, setData, post, processing, errors } = useForm({
        name:                  '',
        phone:                 '',
        password:              '',
        password_confirmation: '',
    });

    const submit = (e) => { e.preventDefault(); post(`/invitations/${token}/accept`); };

    return (
        <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-slate-500">
                Acceptând invitația vei primi un cont nou pentru <strong>{email}</strong> în agenția <strong>{agencyName}</strong>.
            </p>

            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nume complet *</label>
                <input
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Telefon (opțional)</label>
                <input
                    type="tel"
                    value={data.phone}
                    onChange={e => setData('phone', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Parolă *</label>
                <input
                    type="password"
                    value={data.password}
                    onChange={e => setData('password', e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Min. 8 caractere, cu litere mari/mici și cifre.</p>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Confirmă parola *</label>
                <input
                    type="password"
                    value={data.password_confirmation}
                    onChange={e => setData('password_confirmation', e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>

            <button
                type="submit"
                disabled={processing}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
                {processing ? 'Se creează contul…' : '✓ Creează cont și acceptă'}
            </button>
        </form>
    );
}
