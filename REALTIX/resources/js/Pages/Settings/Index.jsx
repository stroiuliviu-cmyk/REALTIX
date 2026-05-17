import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// ─── Primitive helpers ────────────────────────────────────────────────────────

function Label({ children }) {
    return <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>;
}

function Input({ value, onChange, type = 'text', placeholder, className = '' }) {
    return (
        <input
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 transition-colors ${className}`}
        />
    );
}

function Toggle({ checked, onChange, label, sub }) {
    return (
        <div className="flex items-center justify-between py-3.5 gap-4">
            <div>
                <div className="text-sm font-semibold text-slate-700">{label}</div>
                {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-700' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}

function SaveBtn({ processing, label = 'Salvează' }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="rounded-2xl bg-slate-900 px-6 py-2.5 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
            {processing ? 'Se salvează...' : label}
        </button>
    );
}

function FieldError({ msg }) {
    return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
}

function SectionTitle({ children }) {
    return <h4 className="font-bold text-slate-800 mb-4 mt-2">{children}</h4>;
}

function Toast({ message, onClose }) {
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [message]);

    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-2">
            <span>✅</span> {message}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
    );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user }) {
    const { data, setData, patch, processing, errors } = useForm({
        name:     user.name     ?? '',
        email:    user.email    ?? '',
        phone:    user.phone    ?? '',
        whatsapp: user.whatsapp ?? '',
        viber:    user.viber    ?? '',
        telegram: user.telegram ?? '',
        position: user.position ?? '',
        locale:   user.locale   ?? 'ro',
        timezone: user.timezone ?? 'Europe/Chisinau',
    });

    const submit = (e) => { e.preventDefault(); patch(route('settings.profile')); };

    const avatarInputRef = useRef(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        router.post(route('settings.profile.avatar'), { avatar: file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setAvatarUploading(false);
                if (avatarInputRef.current) avatarInputRef.current.value = '';
            },
        });
    };

    const handleAvatarRemove = () => {
        if (!confirm('Ștergi fotografia de profil?')) return;
        router.delete(route('settings.profile.avatar.remove'), { preserveScroll: true });
    };

    const contactFields = [
        { key: 'phone',    label: 'Telefon',   icon: '📞', type: 'tel' },
        { key: 'whatsapp', label: 'WhatsApp',  icon: '💬', type: 'tel' },
        { key: 'viber',    label: 'Viber',     icon: '📲', type: 'tel' },
        { key: 'telegram', label: 'Telegram',  icon: '✈️', type: 'text', placeholder: '@username' },
    ];

    return (
        <form onSubmit={submit} className="space-y-6 max-w-lg">
            {/* Avatar */}
            <div className="flex items-center gap-5">
                {user.avatar_path ? (
                    <img
                        src={`/storage/${user.avatar_path}`}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-black text-blue-700 shrink-0">
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                )}
                <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                    <div className="flex items-center gap-3 mt-1">
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="text-xs text-blue-700 hover:underline disabled:opacity-60"
                        >
                            {avatarUploading ? 'Se încarcă...' : 'Schimbă fotografia'}
                        </button>
                        {user.avatar_path && (
                            <button
                                type="button"
                                onClick={handleAvatarRemove}
                                className="text-xs text-red-600 hover:underline"
                            >
                                Șterge
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Basic */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <Label>Nume complet *</Label>
                    <Input value={data.name} onChange={v => setData('name', v)} />
                    <FieldError msg={errors.name} />
                </div>
                <div>
                    <Label>Email *</Label>
                    <Input value={data.email} onChange={v => setData('email', v)} type="email" />
                    <FieldError msg={errors.email} />
                </div>
                <div>
                    <Label>Funcție</Label>
                    <Input value={data.position} onChange={v => setData('position', v)} placeholder="ex: Agent imobiliar" />
                </div>
            </div>

            {/* Contact channels */}
            <div>
                <SectionTitle>Canale de contact</SectionTitle>
                <div className="grid grid-cols-1 gap-3">
                    {contactFields.map(f => (
                        <div key={f.key} className="flex items-center gap-3">
                            <span className="text-xl w-7 shrink-0">{f.icon}</span>
                            <div className="flex-1">
                                <Input
                                    value={data[f.key]}
                                    onChange={v => setData(f.key, v)}
                                    type={f.type}
                                    placeholder={f.placeholder ?? f.label}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Locale & timezone */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Limbă interfață</Label>
                    <select
                        value={data.locale}
                        onChange={e => setData('locale', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                    >
                        <option value="ro">🇷🇴 Română</option>
                        <option value="ru">🇷🇺 Русский</option>
                        <option value="en">🇬🇧 English</option>
                    </select>
                </div>
                <div>
                    <Label>Fus orar</Label>
                    <select
                        value={data.timezone}
                        onChange={e => setData('timezone', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                    >
                        <option value="Europe/Chisinau">Chișinău (UTC+3)</option>
                        <option value="Europe/Bucharest">București (UTC+3)</option>
                        <option value="Europe/Moscow">Moscova (UTC+3)</option>
                        <option value="UTC">UTC</option>
                    </select>
                </div>
            </div>

            <SaveBtn processing={processing} />
        </form>
    );
}

// ─── Agency Tab ───────────────────────────────────────────────────────────────

function AgencyTab({ agency }) {
    const s = agency?.settings ?? {};
    const { data, setData, post, processing, errors } = useForm({
        _method:       'PATCH',
        name:          agency?.name          ?? '',
        contact_phone: s.contact_phone       ?? '',
        contact_email: s.contact_email       ?? '',
        address:       s.address             ?? '',
        director_name: s.director_name       ?? '',
        about:         s.about               ?? '',
        brand_color:   s.brand_color         ?? '#1e40af',
        logo:          null,
        remove_logo:   false,
    });

    const [logoPreview, setLogoPreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setData('logo', file);
        setData('remove_logo', false);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleLogoRemove = () => {
        setData('logo', null);
        setData('remove_logo', true);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('settings.agency'), { forceFormData: true, preserveScroll: true });
    };

    const currentLogoUrl = logoPreview
        ?? (data.remove_logo ? null : (agency?.logo_path ? `/storage/${agency.logo_path}` : null));

    return (
        <form onSubmit={submit} className="space-y-5 max-w-lg">
            {/* Logo */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt={agency?.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl">🏢</span>
                    )}
                </div>
                <div>
                    <div className="font-bold text-slate-900 text-sm">{agency?.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-700 hover:underline font-semibold"
                        >
                            {currentLogoUrl ? 'Schimbă logo' : 'Încarcă logo'}
                        </button>
                        {currentLogoUrl && (
                            <button
                                type="button"
                                onClick={handleLogoRemove}
                                className="text-xs text-red-600 hover:underline"
                            >Elimină</button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                    />
                    <FieldError msg={errors.logo} />
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Label>Culoare brand</Label>
                    <input
                        type="color"
                        value={data.brand_color}
                        onChange={e => setData('brand_color', e.target.value)}
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                    />
                </div>
            </div>

            <div>
                <Label>Denumirea agenției *</Label>
                <Input value={data.name} onChange={v => setData('name', v)} />
                <FieldError msg={errors.name} />
            </div>

            <div>
                <Label>Subdomeniu</Label>
                <div className="flex items-center rounded-2xl border border-slate-200 overflow-hidden">
                    <input value={agency?.slug ?? ''} readOnly
                        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 text-slate-500 outline-none" />
                    <span className="px-4 py-2.5 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 shrink-0">.realtix.md</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Telefon agenție</Label>
                    <Input value={data.contact_phone} onChange={v => setData('contact_phone', v)} type="tel" />
                </div>
                <div>
                    <Label>Email agenție</Label>
                    <Input value={data.contact_email} onChange={v => setData('contact_email', v)} type="email" />
                </div>
            </div>

            <div>
                <Label>Adresă</Label>
                <Input value={data.address} onChange={v => setData('address', v)} placeholder="str. Exemplu 1, Chișinău" />
            </div>

            <div>
                <Label>Director / Fondator</Label>
                <Input value={data.director_name} onChange={v => setData('director_name', v)} placeholder="Nume Prenume" />
            </div>

            <div>
                <Label>Despre companie</Label>
                <textarea
                    value={data.about}
                    onChange={e => setData('about', e.target.value)}
                    rows={4}
                    placeholder="Descrierea agenției..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-700 resize-none"
                />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                    <div className="text-sm font-semibold text-slate-800">Plan abonament</div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5">{agency?.subscription_plan ?? '—'}</div>
                </div>
                <a href="/subscription" className="text-xs text-blue-700 font-semibold hover:underline">Gestionează →</a>
            </div>

            <SaveBtn processing={processing} />
        </form>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function LoginHistoryModal({ agent, onClose }) {
    const [logs, setLogs] = useState(null);

    useEffect(() => {
        fetch(route('settings.users.login-history', agent.id))
            .then(r => r.json())
            .then(d => setLogs(d.logs ?? []))
            .catch(() => setLogs([]));
    }, [agent.id]);

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Istoric login — {agent.name}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {logs === null ? (
                        <p className="p-8 text-center text-sm text-slate-400">Se încarcă…</p>
                    ) : logs.length === 0 ? (
                        <p className="p-8 text-center text-sm text-slate-400">Niciun log de autentificare.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-2">Time</th>
                                    <th className="text-left px-4 py-2">Action</th>
                                    <th className="text-left px-4 py-2">IP</th>
                                    <th className="text-left px-4 py-2">Device</th>
                                    <th className="text-left px-4 py-2">Browser</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2 text-xs text-slate-500 font-mono whitespace-nowrap">
                                            {new Date(l.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${l.action === 'auth.failed' ? 'bg-rose-100 text-rose-700' : l.action === 'auth.login' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {l.action.replace('auth.', '')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{l.ip ?? '—'}</td>
                                        <td className="px-4 py-2 text-xs text-slate-700">{l.device}</td>
                                        <td className="px-4 py-2 text-xs text-slate-700">{l.browser}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function UsersTab({ agents, invitations = [], currentUserId, canInvite = true, canInviteMore = true, seatsUsed = 0, seatsLimit = null, agencyPlan = 'starter' }) {
    const [showInvite, setShowInvite] = useState(false);
    const [historyAgent, setHistoryAgent] = useState(null);

    const planLabels = { starter: 'Solo', medium: 'Team', pro: 'Growth' };
    const planLabel = planLabels[agencyPlan] ?? agencyPlan;
    const seatLabel = seatsLimit === null
        ? `${seatsUsed} agenți (nelimitat)`
        : `${seatsUsed} / ${seatsLimit} agenți`;
    const nearLimit = seatsLimit !== null && seatsUsed >= seatsLimit - 1;

    const invite = useForm({ email: '', role: 'realtor' });
    const submitInvite = (e) => {
        e.preventDefault();
        invite.post(route('settings.users.invite'), {
            onSuccess: () => { setShowInvite(false); invite.reset(); },
        });
    };

    const cancelInvitation = (inv) => {
        if (!confirm(`Anulezi invitația pentru ${inv.email}?`)) return;
        router.delete(route('settings.invitations.cancel', inv.id), { preserveScroll: true });
    };

    const resendInvitation = (inv) => {
        router.post(route('settings.invitations.resend', inv.id), {}, { preserveScroll: true });
    };

    const copyLink = (inv) => {
        const url = `${window.location.origin}/invitations/${inv.token}`;
        navigator.clipboard?.writeText(url);
    };

    const toggleActive = (agent) => {
        router.patch(route('settings.users.update', agent.id), { is_active: !agent.is_active });
    };

    const changeRole = (agent, role) => {
        router.patch(route('settings.users.update', agent.id), { role });
    };

    const remove = (agent) => {
        if (!confirm(`Elimini agentul ${agent.name}?`)) return;
        router.delete(route('settings.users.remove', agent.id));
    };

    return (
        <div className="space-y-5">
            {/* Plan-gated banner: Solo can't invite at all */}
            {!canInvite && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                    <span className="text-2xl shrink-0">🔒</span>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">
                            Pachetul {planLabel} nu permite invitarea agenților
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                            Pachetul <strong>Solo</strong> e single-user. Pentru a adăuga colegi, fă upgrade la <strong>Team</strong> (5 agenți incluși) sau <strong>Growth</strong> (5 + nelimitat la 8€/agent extra).
                        </p>
                        <Link href="/subscription" className="inline-block mt-2 text-xs font-bold text-amber-900 hover:underline">
                            Vezi pachete →
                        </Link>
                    </div>
                </div>
            )}

            {/* Seat-limit banner: Team plan reached cap */}
            {canInvite && !canInviteMore && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
                    <span className="text-2xl shrink-0">⛔</span>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-rose-900">
                            Ai atins limita de {seatsLimit} agenți a planului {planLabel}
                        </p>
                        <p className="text-xs text-rose-800 mt-1">
                            Pentru a adăuga mai mulți agenți, fă upgrade la <strong>Growth</strong> — primii 5 sunt incluși și fiecare suplimentar costă <strong>8€/lună</strong>.
                        </p>
                        <Link href="/subscription" className="inline-block mt-2 text-xs font-bold text-rose-900 hover:underline">
                            Upgrade la Growth →
                        </Link>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">{agents.length} cont{agents.length !== 1 ? 'uri' : ''} active</span>
                    {canInvite && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            !canInviteMore ? 'bg-rose-100 text-rose-700'
                                : nearLimit ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {seatLabel}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => canInviteMore && setShowInvite(!showInvite)}
                    disabled={!canInviteMore}
                    title={!canInvite ? 'Disponibil cu Team sau Growth' : !canInviteMore ? `Ai atins limita planului ${planLabel}` : ''}
                    className={`rounded-2xl px-5 py-2 text-sm font-bold transition-colors ${
                        canInviteMore
                            ? 'bg-slate-900 text-white hover:bg-slate-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {!canInvite ? '🔒 Invită agent (Team/Growth)'
                        : !canInviteMore ? `⛔ Limită atinsă (${planLabel})`
                        : '+ Invită agent'}
                </button>
            </div>

            {/* Invite form */}
            {showInvite && (
                <form onSubmit={submitInvite} className="flex gap-3 items-center p-4 rounded-2xl bg-blue-50 border border-blue-100 flex-wrap">
                    <span className="text-lg">✉️</span>
                    <input
                        type="email"
                        value={invite.data.email}
                        onChange={e => invite.setData('email', e.target.value)}
                        placeholder="email@agent.md"
                        required
                        className="flex-1 min-w-48 rounded-xl border border-blue-200 px-4 py-2 text-sm focus:outline-none focus:border-blue-700 bg-white"
                    />
                    <select
                        value={invite.data.role}
                        onChange={e => invite.setData('role', e.target.value)}
                        className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold focus:outline-none bg-white"
                    >
                        <option value="realtor">Agent</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" disabled={invite.processing}
                        className="rounded-xl bg-blue-700 text-white px-4 py-2 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                        Trimite invitație
                    </button>
                    <button type="button" onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </form>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-100/50 flex items-center gap-2">
                        <span className="text-base">⏳</span>
                        <h4 className="text-sm font-bold text-amber-900">Invitații în așteptare ({invitations.length})</h4>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {invitations.map(inv => (
                            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-800">{inv.email}</span>
                                        <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                            {inv.role === 'admin' ? 'Admin' : 'Agent'}
                                        </span>
                                        {inv.is_expired && (
                                            <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                                Expirat
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Trimisă de {inv.invited_by ?? '—'}
                                        {inv.expires_at && ` · expiră ${new Date(inv.expires_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyLink(inv)}
                                    className="text-xs font-semibold text-slate-600 hover:text-blue-700 px-2"
                                    title="Copiază linkul"
                                >
                                    🔗 Copiază
                                </button>
                                <button
                                    onClick={() => resendInvitation(inv)}
                                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2"
                                    title="Retrimite email-ul"
                                >
                                    ↻ Retrimite
                                </button>
                                <button
                                    onClick={() => cancelInvitation(inv)}
                                    className="text-xs font-semibold text-red-600 hover:text-red-800 px-2"
                                >
                                    ✕ Anulează
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {historyAgent && <LoginHistoryModal agent={historyAgent} onClose={() => setHistoryAgent(null)} />}

            {/* Agent list */}
            <div className="space-y-3">
                {agents.map(agent => (
                    <div key={agent.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                        {/* Avatar with online dot */}
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                {agent.name[0].toUpperCase()}
                            </div>
                            <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${agent.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                title={agent.is_online ? 'Online' : 'Offline'}
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 text-sm">{agent.name}</span>
                                {agent.is_self && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Tu</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                    {agent.is_active ? 'Activ' : 'Suspendat'}
                                </span>
                                {agent.is_online && (
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">● online</span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{agent.email} {agent.position ? `· ${agent.position}` : ''}</div>

                            {/* Last login info */}
                            {agent.last_login_at && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span title="Ultimul login">🕐 {new Date(agent.last_login_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    {agent.last_login_ip && <span className="font-mono">· {agent.last_login_ip}</span>}
                                    {agent.last_login_device && agent.last_login_device !== '—' && <span>· {agent.last_login_device}</span>}
                                    {agent.last_login_browser && agent.last_login_browser !== '—' && <span>· {agent.last_login_browser}</span>}
                                </div>
                            )}

                            <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                                <span>🏠 {agent.properties_count}</span>
                                <span>👥 {agent.contacts_count}</span>
                                <span>🤝 {agent.deals_count}</span>
                                <button
                                    onClick={() => setHistoryAgent(agent)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                                >📜 Istoric</button>
                            </div>
                        </div>

                        {/* Role selector */}
                        {!agent.is_self && (
                            <select
                                value={agent.role}
                                onChange={e => changeRole(agent, e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            >
                                <option value="realtor">Realtor</option>
                                <option value="admin">Admin</option>
                            </select>
                        )}

                        {/* Actions */}
                        {!agent.is_self && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => toggleActive(agent)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${agent.is_active ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    {agent.is_active ? 'Suspendă' : 'Activează'}
                                </button>
                                <button
                                    onClick={() => remove(agent)}
                                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    Elimină
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ user }) {
    const defaultPrefs = {
        new_deals:           true,
        subscription_end:    true,
        ai_valuation_change: false,
        calendar_reminders:  true,
        email_enabled:       true,
        push_enabled:        false,
    };

    const { data, setData, patch, processing } = useForm(
        Object.assign({}, defaultPrefs, user.notification_prefs ?? {})
    );

    const submit = (e) => {
        e.preventDefault();
        patch(route('settings.notifications'), { data: { prefs: data } });
    };

    const groups = [
        {
            label: 'Evenimente',
            items: [
                { key: 'new_deals',           label: 'Tranzacții noi',           sub: 'Notificare la fiecare deal creat' },
                { key: 'subscription_end',    label: 'Expirare abonament',        sub: 'Cu 7 zile înainte de expirare' },
                { key: 'ai_valuation_change', label: 'Modificare evaluare AI',    sub: 'Când prețul estimat se schimbă' },
                { key: 'calendar_reminders',  label: 'Remindere calendar',        sub: '30 minute înainte de eveniment' },
            ],
        },
        {
            label: 'Canale de livrare',
            items: [
                { key: 'email_enabled', label: 'Notificări pe email',   sub: user.email },
                { key: 'push_enabled',  label: 'Notificări push',        sub: 'Browser / Aplicație mobilă' },
            ],
        },
    ];

    return (
        <form onSubmit={submit} className="space-y-6 max-w-lg">
            {groups.map(g => (
                <div key={g.label}>
                    <SectionTitle>{g.label}</SectionTitle>
                    <div className="rounded-3xl bg-slate-50 border border-slate-100 divide-y divide-slate-100 px-5">
                        {g.items.map(item => (
                            <Toggle
                                key={item.key}
                                label={item.label}
                                sub={item.sub}
                                checked={!!data[item.key]}
                                onChange={v => setData(item.key, v)}
                            />
                        ))}
                    </div>
                </div>
            ))}
            <SaveBtn processing={processing} label="Salvează preferințele" />
        </form>
    );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

const ACTIVITY_ICON = {
    'auth.login':              '🔓',
    'auth.logout':             '🔒',
    'auth.failed':             '⛔',
    'profile.updated':         '👤',
    'profile.password_changed':'🔑',
    'profile.avatar_updated':  '🖼',
    'profile.avatar_removed':  '🗑',
    'property.created':        '🏠',
    'property.updated':        '✏️',
    'property.deleted':        '🗑',
    'contact.created':         '👥',
    'contact.updated':         '✏️',
    'contact.deleted':         '🗑',
    'deal.created':            '💼',
    'deal.updated':            '✏️',
    'deal.deleted':            '🗑',
    'calendar.created':        '📅',
    'calendar.deleted':        '🗑',
    'subscription.checkout_started': '💳',
    'subscription.cancelled':  '❌',
};

function SecurityTab({ sessions, activityLog = [] }) {
    const pw = useForm({ current_password: '', password: '', password_confirmation: '' });
    const logoutOthers = useForm({ password: '' });
    const [showLogoutForm, setShowLogoutForm] = useState(false);

    const submitPw = (e) => {
        e.preventDefault();
        pw.patch(route('settings.password'), { onSuccess: () => pw.reset() });
    };

    const submitLogout = (e) => {
        e.preventDefault();
        logoutOthers.post(route('settings.logout.others'), {
            onSuccess: () => { setShowLogoutForm(false); logoutOthers.reset(); },
        });
    };

    const uaIcon = (ua = '') => {
        if (/mobile|android|iphone/i.test(ua)) return '📱';
        if (/mac/i.test(ua)) return '🍎';
        return '💻';
    };

    return (
        <div className="space-y-8 max-w-lg">
            {/* Change password */}
            <div>
                <SectionTitle>Schimbă parola</SectionTitle>
                <form onSubmit={submitPw} className="space-y-4">
                    {[
                        { key: 'current_password',      label: 'Parola curentă' },
                        { key: 'password',              label: 'Parola nouă' },
                        { key: 'password_confirmation', label: 'Confirmă parola nouă' },
                    ].map(f => (
                        <div key={f.key}>
                            <Label>{f.label}</Label>
                            <Input
                                type="password"
                                value={pw.data[f.key]}
                                onChange={v => pw.setData(f.key, v)}
                            />
                            <FieldError msg={pw.errors[f.key]} />
                        </div>
                    ))}
                    <SaveBtn processing={pw.processing} label="Actualizează parola" />
                </form>
            </div>

            {/* 2FA */}
            <div>
                <SectionTitle>Autentificare în doi factori (2FA)</SectionTitle>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    ⚠️ 2FA prin email sau SMS — disponibil în versiunea viitoare.
                </div>
            </div>

            {/* Active sessions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <SectionTitle>Sesiuni active</SectionTitle>
                    <button
                        onClick={() => setShowLogoutForm(!showLogoutForm)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                        Deconectează toate
                    </button>
                </div>

                {showLogoutForm && (
                    <form onSubmit={submitLogout} className="flex gap-3 mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100">
                        <input
                            type="password"
                            value={logoutOthers.data.password}
                            onChange={e => logoutOthers.setData('password', e.target.value)}
                            placeholder="Confirmă parola"
                            className="flex-1 rounded-xl border border-rose-200 px-3 py-2 text-sm focus:outline-none bg-white"
                        />
                        <button type="submit" disabled={logoutOthers.processing}
                            className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                            Confirmă
                        </button>
                    </form>
                )}

                <div className="space-y-2">
                    {sessions.length === 0 ? (
                        <div className="text-sm text-slate-400 text-center py-4">Nicio sesiune găsită.</div>
                    ) : (
                        sessions.map(s => (
                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                <span className="text-xl">{uaIcon(s.user_agent)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-slate-700 truncate">{s.user_agent}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{s.ip} · {s.last_active}</div>
                                </div>
                                {s.is_current && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                                        Curentă
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Activity log */}
            <div>
                <SectionTitle>Jurnal activitate</SectionTitle>
                {activityLog.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-400 text-center">
                        Nicio activitate înregistrată încă.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {activityLog.map(a => (
                            <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                                <div className="text-xl shrink-0 mt-0.5">{ACTIVITY_ICON[a.action] ?? '•'}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-700">{a.description ?? a.action}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                        <span>{a.created_at}</span>
                                        {a.ip && <span className="text-slate-300">·</span>}
                                        {a.ip && <span className="font-mono">{a.ip}</span>}
                                        <span className="text-slate-300">·</span>
                                        <code className="text-[10px] text-slate-400">{a.action}</code>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab({ agency, user }) {
    const s = agency?.settings ?? {};
    const googleConnected = !!user?.google_access_token;
    const [disconnecting, setDisconnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const { data, setData, patch, processing } = useForm({
        facebook_token: s.facebook_token ?? '',
        claude_api_key: s.claude_api_key ?? '',
    });

    const submit = (e) => { e.preventDefault(); patch(route('settings.integrations')); };

    const handleDisconnect = () => {
        setDisconnecting(true);
        router.post(route('google.calendar.disconnect'), {}, {
            onFinish: () => setDisconnecting(false),
        });
    };

    const handleSync = () => {
        setSyncing(true);
        router.post(route('google.calendar.sync'), {}, {
            onFinish: () => setSyncing(false),
        });
    };

    return (
        <div className="space-y-4 max-w-lg">
            {/* ── Google Calendar ── */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-2xl shrink-0">
                        📅
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm">Google Calendar</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            Sincronizare bidirecțională — evenimentele create în REALTIX apar automat în Google Calendar.
                        </div>
                    </div>
                    {googleConnected
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">✅ Conectat</span>
                        : <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full shrink-0">Neconectat</span>
                    }
                </div>

                {googleConnected ? (
                    <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleSync}
                            disabled={syncing}
                            className="rounded-xl bg-blue-700 text-white px-4 py-2 text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
                        >
                            {syncing ? '⏳ Sincronizez...' : '🔄 Sincronizează acum'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="rounded-xl border border-rose-200 text-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-50 disabled:opacity-50 transition-colors"
                        >
                            {disconnecting ? 'Se deconectează...' : 'Deconectează'}
                        </button>
                    </div>
                ) : (
                    <div className="mt-4">
                        <a
                            href={route('google.calendar.connect')}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-bold hover:bg-slate-700 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Conectează cu Google
                        </a>
                        <p className="text-xs text-slate-400 mt-2">
                            Necesită cont Google. Evenimentele vor fi sincronizate automat la creare.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Other integrations ── */}
            <form onSubmit={submit} className="space-y-4">
                {[
                    {
                        icon: '📘',
                        title: 'Facebook / Instagram',
                        desc: 'Autopostare automată pe rețelele sociale',
                        field: 'facebook_token',
                        placeholder: 'Access token Facebook',
                    },
                    {
                        icon: '🤖',
                        title: 'Anthropic Claude API',
                        desc: 'Cheie API pentru generare descrieri AI și evaluare',
                        field: 'claude_api_key',
                        placeholder: 'sk-ant-...',
                    },
                ].map(item => (
                    <div key={item.field} className="rounded-3xl border border-slate-100 bg-white p-5">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                            </div>
                            {data[item.field] && (
                                <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                                    Conectat
                                </span>
                            )}
                        </div>
                        <input
                            type="password"
                            value={data[item.field]}
                            onChange={e => setData(item.field, e.target.value)}
                            placeholder={item.placeholder}
                            autoComplete="new-password"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 font-mono"
                        />
                    </div>
                ))}
                <SaveBtn processing={processing} label="Salvează integrările" />
            </form>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Portals Tab ──────────────────────────────────────────────────────────────

function PortalsTab({ agency }) {
    const s = agency?.settings ?? {};
    const configured = !!s.portal_999md_api_key;
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [categories, setCategories] = useState(null);

    const { data, setData, patch, processing } = useForm({
        portal_999md_api_key:     s.portal_999md_api_key     ?? '',
        p999_category_id:         s.p999_category_id         ?? '',
        p999_subcat_apartment:    s.p999_subcat_apartment    ?? '',
        p999_subcat_house:        s.p999_subcat_house        ?? '',
        p999_subcat_commercial:   s.p999_subcat_commercial   ?? '',
        p999_subcat_land:         s.p999_subcat_land         ?? '',
        p999_offer_sale:          s.p999_offer_sale          ?? '',
        p999_offer_rent:          s.p999_offer_rent          ?? '',
        p999_offer_rent_short:    s.p999_offer_rent_short    ?? '',
        p999_feature_price:       s.p999_feature_price       ?? '2',
        p999_feature_title:       s.p999_feature_title       ?? '12',
        p999_feature_description: s.p999_feature_description ?? '13',
        p999_feature_images:      s.p999_feature_images      ?? '14',
        p999_feature_contacts:    s.p999_feature_contacts    ?? '16',
        p999_feature_location:    s.p999_feature_location    ?? '',
    });

    const submit = (e) => { e.preventDefault(); patch(route('settings.portals')); };

    const discoverCategories = () => {
        setDiscovering(true);
        fetch(route('settings.portals.discover'))
            .then(r => r.json())
            .then(d => { setCategories(d.categories); setDiscovering(false); })
            .catch(() => setDiscovering(false));
    };

    return (
        <form onSubmit={submit} className="space-y-4 max-w-lg">
            {/* 999.md card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                        🏠
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm">999.md Partners API</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            Publică anunțuri imobiliare direct pe 999.md din REALTIX.
                        </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${configured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {configured ? '✅ Configurat' : 'Neconfigurat'}
                    </span>
                </div>

                <div>
                    <Label>API Key 999.md</Label>
                    <Input
                        type="password"
                        value={data.portal_999md_api_key}
                        onChange={e => setData('portal_999md_api_key', e.target.value)}
                        placeholder="Cheia ta API de pe partners-api.999.md"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        Obține cheia din <span className="font-mono">partners-api.999.md</span> → Settings → API Keys
                    </p>
                </div>

                {/* Discover button */}
                {data.portal_999md_api_key && (
                    <div>
                        <button
                            type="button"
                            onClick={discoverCategories}
                            disabled={discovering}
                            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                            {discovering ? 'Se încarcă...' : '🔍 Descoperă categoriile disponibile'}
                        </button>
                        {categories && (
                            <pre className="mt-2 text-xs bg-slate-50 rounded-xl p-3 overflow-auto max-h-40 border border-slate-100">
                                {JSON.stringify(categories, null, 2)}
                            </pre>
                        )}
                    </div>
                )}

                {/* Advanced toggle */}
                <button
                    type="button"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                >
                    {showAdvanced ? '▲ Ascunde' : '▼ Configurare avansată (categorii & features)'}
                </button>

                {showAdvanced && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                            Completează ID-urile după ce ai descoperit categoriile de mai sus.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Category ID (Imobiliare)</Label>
                                <Input value={data.p999_category_id} onChange={e => setData('p999_category_id', e.target.value)} placeholder="ex: 2" />
                            </div>
                            <div>
                                <Label>Subcat. Apartamente</Label>
                                <Input value={data.p999_subcat_apartment} onChange={e => setData('p999_subcat_apartment', e.target.value)} placeholder="ex: 201" />
                            </div>
                            <div>
                                <Label>Subcat. Case</Label>
                                <Input value={data.p999_subcat_house} onChange={e => setData('p999_subcat_house', e.target.value)} placeholder="ex: 202" />
                            </div>
                            <div>
                                <Label>Subcat. Comercial</Label>
                                <Input value={data.p999_subcat_commercial} onChange={e => setData('p999_subcat_commercial', e.target.value)} placeholder="ex: 203" />
                            </div>
                            <div>
                                <Label>Subcat. Teren</Label>
                                <Input value={data.p999_subcat_land} onChange={e => setData('p999_subcat_land', e.target.value)} placeholder="ex: 204" />
                            </div>
                            <div>
                                <Label>Offer type: Vânzare</Label>
                                <Input value={data.p999_offer_sale} onChange={e => setData('p999_offer_sale', e.target.value)} placeholder="ex: 18979" />
                            </div>
                            <div>
                                <Label>Offer type: Chirie</Label>
                                <Input value={data.p999_offer_rent} onChange={e => setData('p999_offer_rent', e.target.value)} placeholder="ex: 18980" />
                            </div>
                            <div>
                                <Label>Offer type: Chirie scurtă</Label>
                                <Input value={data.p999_offer_rent_short} onChange={e => setData('p999_offer_rent_short', e.target.value)} placeholder="ex: 18981" />
                            </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-600 mt-2">Feature IDs</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                ['p999_feature_price',       'Preț'],
                                ['p999_feature_title',       'Titlu'],
                                ['p999_feature_description', 'Descriere'],
                                ['p999_feature_images',      'Imagini'],
                                ['p999_feature_contacts',    'Telefon'],
                                ['p999_feature_location',    'Locație'],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <Label>{label}</Label>
                                    <Input value={data[key]} onChange={e => setData(key, e.target.value)} placeholder="ID" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={processing}
                className="w-full rounded-2xl bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
                {processing ? 'Se salvează...' : 'Salvează configurarea portalurilor'}
            </button>
        </form>
    );
}

const TABS = [
    { key: 'profile',       label: 'Profil',        icon: '👤', adminOnly: false },
    { key: 'agency',        label: 'Agenție',        icon: '🏢', adminOnly: true  },
    { key: 'users',         label: 'Utilizatori',   icon: '👥', adminOnly: true  },
    { key: 'notifications', label: 'Notificări',    icon: '🔔', adminOnly: false },
    { key: 'security',      label: 'Securitate',    icon: '🔒', adminOnly: false },
    { key: 'integrations',  label: 'Integrări',     icon: '🔗', adminOnly: true  },
    { key: 'portals',       label: 'Portaluri',     icon: '🌐', adminOnly: true  },
];

export default function Index({ user, agency, isAdmin, sessions = [], agents = [], invitations = [], canInviteAgents = false, canInviteMoreAgents = false, seatsUsed = 0, seatsLimit = null, activityLog = [], flash }) {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const [activeTab, setActiveTab] = useState(urlParams.get('tab') ?? 'profile');
    const [toast, setToast] = useState(flash ?? null);

    useEffect(() => { if (flash) setToast(flash); }, [flash]);

    const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

    return (
        <AppLayout title="Setări">
            <Head title="Setări" />
            <Toast message={toast} onClose={() => setToast(null)} />

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
                {/* Sidebar — horizontal scroll on mobile, vertical on desktop */}
                <div className="w-full lg:w-52 lg:shrink-0 rounded-3xl lg:rounded-4xl bg-white border border-slate-100 shadow-xl p-2 lg:p-3 lg:sticky lg:top-28 lg:self-start overflow-x-auto">
                    <div className="flex lg:flex-col gap-1 lg:gap-0 min-w-max lg:min-w-0">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl lg:rounded-2xl text-sm font-semibold transition-colors text-left whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="w-full flex-1 rounded-3xl lg:rounded-4xl bg-white border border-slate-100 shadow-xl p-5 sm:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        {visibleTabs.find(t => t.key === activeTab)?.icon}{' '}
                        {visibleTabs.find(t => t.key === activeTab)?.label}
                    </h2>

                    {activeTab === 'profile'       && <ProfileTab user={user} />}
                    {activeTab === 'agency'        && <AgencyTab agency={agency} />}
                    {activeTab === 'users'         && <UsersTab agents={agents} invitations={invitations} currentUserId={user.id} canInvite={canInviteAgents} canInviteMore={canInviteMoreAgents} seatsUsed={seatsUsed} seatsLimit={seatsLimit} agencyPlan={agency?.subscription_plan ?? 'starter'} />}
                    {activeTab === 'notifications' && <NotificationsTab user={user} />}
                    {activeTab === 'security'      && <SecurityTab sessions={sessions} activityLog={activityLog} />}
                    {activeTab === 'integrations'  && <IntegrationsTab agency={agency} user={user} />}
                    {activeTab === 'portals'       && <PortalsTab agency={agency} />}
                </div>
            </div>
        </AppLayout>
    );
}
