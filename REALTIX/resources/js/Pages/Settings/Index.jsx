import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-black text-blue-700 shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                    <button type="button" className="text-xs text-blue-700 hover:underline mt-1">
                        Schimbă fotografia
                    </button>
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
    const { data, setData, patch, processing, errors } = useForm({
        name:          agency?.name          ?? '',
        contact_phone: s.contact_phone       ?? '',
        contact_email: s.contact_email       ?? '',
        address:       s.address             ?? '',
        director_name: s.director_name       ?? '',
        about:         s.about               ?? '',
        brand_color:   s.brand_color         ?? '#1e40af',
    });

    const submit = (e) => { e.preventDefault(); patch(route('settings.agency')); };

    return (
        <form onSubmit={submit} className="space-y-5 max-w-lg">
            {/* Logo */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-sm">
                    🏢
                </div>
                <div>
                    <div className="font-bold text-slate-900 text-sm">{agency?.name}</div>
                    <button type="button" className="text-xs text-blue-700 hover:underline mt-1">Încarcă logo</button>
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

function UsersTab({ agents, currentUserId }) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false);

    const invite = useForm({ email: '' });
    const submitInvite = (e) => {
        e.preventDefault();
        invite.post(route('settings.users.invite'), {
            onSuccess: () => { setShowInvite(false); invite.reset(); },
        });
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">{agents.length} cont{agents.length !== 1 ? 'uri' : ''} înregistrate</div>
                <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="rounded-2xl bg-slate-900 text-white px-5 py-2 text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                    + Invită agent
                </button>
            </div>

            {/* Invite form */}
            {showInvite && (
                <form onSubmit={submitInvite} className="flex gap-3 items-center p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <span className="text-lg">✉️</span>
                    <input
                        type="email"
                        value={invite.data.email}
                        onChange={e => invite.setData('email', e.target.value)}
                        placeholder="email@agent.md"
                        required
                        className="flex-1 rounded-xl border border-blue-200 px-4 py-2 text-sm focus:outline-none focus:border-blue-700 bg-white"
                    />
                    <button type="submit" disabled={invite.processing}
                        className="rounded-xl bg-blue-700 text-white px-4 py-2 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                        Trimite invitație
                    </button>
                    <button type="button" onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </form>
            )}

            {/* Agent list */}
            <div className="space-y-3">
                {agents.map(agent => (
                    <div key={agent.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {agent.name[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 text-sm">{agent.name}</span>
                                {agent.is_self && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Tu</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                    {agent.is_active ? 'Activ' : 'Suspendat'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{agent.email} {agent.position ? `· ${agent.position}` : ''}</div>
                            <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                                <span>🏠 {agent.properties_count}</span>
                                <span>👥 {agent.contacts_count}</span>
                                <span>🤝 {agent.deals_count}</span>
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

function SecurityTab({ sessions }) {
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

            {/* Activity log placeholder */}
            <div>
                <SectionTitle>Jurnal activitate</SectionTitle>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-400 text-center">
                    Istoricul acțiunilor — disponibil în versiunea viitoare.
                </div>
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

const TABS = [
    { key: 'profile',       label: 'Profil',        icon: '👤', adminOnly: false },
    { key: 'agency',        label: 'Agenție',        icon: '🏢', adminOnly: true  },
    { key: 'users',         label: 'Utilizatori',   icon: '👥', adminOnly: true  },
    { key: 'notifications', label: 'Notificări',    icon: '🔔', adminOnly: false },
    { key: 'security',      label: 'Securitate',    icon: '🔒', adminOnly: false },
    { key: 'integrations',  label: 'Integrări',     icon: '🔗', adminOnly: true  },
];

export default function Index({ user, agency, isAdmin, sessions = [], agents = [], flash }) {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const [activeTab, setActiveTab] = useState(urlParams.get('tab') ?? 'profile');
    const [toast, setToast] = useState(flash ?? null);

    useEffect(() => { if (flash) setToast(flash); }, [flash]);

    const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

    return (
        <AppLayout title="Setări">
            <Head title="Setări" />
            <Toast message={toast} onClose={() => setToast(null)} />

            <div className="flex gap-6 items-start">
                {/* Sidebar */}
                <div className="w-52 shrink-0 rounded-4xl bg-white border border-slate-100 shadow-xl p-3 sticky top-28 self-start">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors text-left ${
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

                {/* Content */}
                <div className="flex-1 rounded-4xl bg-white border border-slate-100 shadow-xl p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        {visibleTabs.find(t => t.key === activeTab)?.icon}{' '}
                        {visibleTabs.find(t => t.key === activeTab)?.label}
                    </h2>

                    {activeTab === 'profile'       && <ProfileTab user={user} />}
                    {activeTab === 'agency'        && <AgencyTab agency={agency} />}
                    {activeTab === 'users'         && <UsersTab agents={agents} currentUserId={user.id} />}
                    {activeTab === 'notifications' && <NotificationsTab user={user} />}
                    {activeTab === 'security'      && <SecurityTab sessions={sessions} />}
                    {activeTab === 'integrations'  && <IntegrationsTab agency={agency} user={user} />}
                </div>
            </div>
        </AppLayout>
    );
}
