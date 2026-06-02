import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import {
    User, Building2, Users, Bell, Lock, Link2, Phone, MessageCircle,
    Send, Mail, Clock, X as XIcon, Check, CheckCircle2, AlertTriangle,
    Ban, RotateCw, Home, Handshake, ScrollText, Smartphone, Laptop, Apple,
    Key, Image as ImageIcon, Pencil, Trash2, CreditCard, XCircle, Calendar,
    LogIn, LogOut, ShieldAlert, Briefcase, Share2, Globe,
} from 'lucide-react';

// ─── Primitive helpers ────────────────────────────────────────────────────────

function Label({ children }) {
    return <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>;
}

function Input({ value, onChange, type = 'text', placeholder, className = '' }) {
    return (
        <input
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors ${className}`}
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
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
        >
            {processing ? 'Se salvează…' : (
                <>
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                    {label}
                </>
            )}
        </button>
    );
}

function FieldError({ msg }) {
    return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
}

function SectionTitle({ children }) {
    return <h4 className="font-semibold text-slate-900 text-sm mb-4 mt-2">{children}</h4>;
}

function Toast({ message, onClose }) {
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [message]);

    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {message}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
                <XIcon className="w-4 h-4" />
            </button>
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
    const [avatarCompressing, setAvatarCompressing] = useState(false);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let toUpload = file;
        if (file.type !== 'image/svg+xml') {
            setAvatarCompressing(true);
            try {
                toUpload = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1024,
                    useWebWorker: true,
                });
            } catch (err) {
                console.error('Avatar compression failed, using original:', err);
            } finally {
                setAvatarCompressing(false);
            }
        }

        setAvatarUploading(true);
        router.post(route('settings.profile.avatar'), { avatar: toUpload }, {
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
        { key: 'phone',    label: 'Telefon',   Icon: Phone,          type: 'tel' },
        { key: 'whatsapp', label: 'WhatsApp',  Icon: MessageCircle,  type: 'tel' },
        { key: 'viber',    label: 'Viber',     Icon: Phone,          type: 'tel' },
        { key: 'telegram', label: 'Telegram',  Icon: Send,           type: 'text', placeholder: '@username' },
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
                            disabled={avatarUploading || avatarCompressing}
                            className="text-xs text-blue-700 hover:underline disabled:opacity-60"
                        >
                            {avatarCompressing
                                ? 'Se procesează imaginea...'
                                : avatarUploading ? 'Se încarcă...' : 'Schimbă fotografia'}
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
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <f.Icon className="w-4.5 h-4.5" strokeWidth={2} />
                            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Limbă interfață</Label>
                    <select
                        value={data.locale}
                        onChange={e => setData('locale', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                        <option value="ro">Română</option>
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div>
                    <Label>Fus orar</Label>
                    <select
                        value={data.timezone}
                        onChange={e => setData('timezone', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
    const [logoCompressing, setLogoCompressing] = useState(false);
    const fileInputRef = useRef(null);

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let toUpload = file;
        if (file.type !== 'image/svg+xml') {
            setLogoCompressing(true);
            try {
                toUpload = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1024,
                    useWebWorker: true,
                });
            } catch (err) {
                console.error('Logo compression failed, using original:', err);
            } finally {
                setLogoCompressing(false);
            }
        }

        setData('logo', toUpload);
        setData('remove_logo', false);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(toUpload);
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
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center overflow-hidden shadow-sm">
                    {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt={agency?.name} className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                    )}
                </div>
                <div>
                    <div className="font-bold text-slate-900 text-sm">{agency?.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={logoCompressing}
                            className="text-xs text-blue-700 hover:underline font-semibold disabled:opacity-60"
                        >
                            {logoCompressing
                                ? 'Se procesează imaginea...'
                                : currentLogoUrl ? 'Schimbă logo' : 'Încarcă logo'}
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
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
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
                <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <input value={agency?.slug ?? ''} readOnly
                        className="flex-1 px-3 py-2 text-sm bg-slate-50 text-slate-500 outline-none" />
                    <span className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 shrink-0">.realtix.md</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Descrierea agenției…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                    <div className="text-sm font-semibold text-slate-900">Plan abonament</div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5">{agency?.subscription_plan ?? '—'}</div>
                </div>
                <a href="/subscription" className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline">Gestionează →</a>
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
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-slate-200/70 w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Istoric login — {agent.name}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Închide">
                        <XIcon className="w-4 h-4" />
                    </button>
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
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                            Pachetul {planLabel} nu permite invitarea agenților
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                            Pachetul <strong>Solo</strong> e single-user. Pentru a adăuga colegi, fă upgrade la <strong>Team</strong> (5 agenți incluși) sau <strong>Growth</strong> (5 + nelimitat la 8€/agent extra).
                        </p>
                        <Link href="/subscription" className="inline-block mt-2 text-xs font-semibold text-amber-900 hover:underline">
                            Vezi pachete →
                        </Link>
                    </div>
                </div>
            )}

            {/* Seat-limit banner: Team plan reached cap */}
            {canInvite && !canInviteMore && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <Ban className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-900">
                            Ai atins limita de {seatsLimit} agenți a planului {planLabel}
                        </p>
                        <p className="text-xs text-rose-800 mt-1">
                            Pentru a adăuga mai mulți agenți, fă upgrade la <strong>Growth</strong> — primii 5 sunt incluși și fiecare suplimentar costă <strong>8€/lună</strong>.
                        </p>
                        <Link href="/subscription" className="inline-block mt-2 text-xs font-semibold text-rose-900 hover:underline">
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
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
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
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        canInviteMore
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {!canInvite ? <><Lock className="w-4 h-4" /> Invită agent (Team/Growth)</>
                        : !canInviteMore ? <><Ban className="w-4 h-4" /> Limită atinsă ({planLabel})</>
                        : <>+ Invită agent</>}
                </button>
            </div>

            {/* Invite form */}
            {showInvite && (
                <form onSubmit={submitInvite} className="flex gap-2 items-center p-4 rounded-xl bg-blue-50 border border-blue-100 flex-wrap">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                    <input
                        type="email"
                        value={invite.data.email}
                        onChange={e => invite.setData('email', e.target.value)}
                        placeholder="email@agent.md"
                        required
                        className="flex-1 min-w-48 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <select
                        value={invite.data.role}
                        onChange={e => invite.setData('role', e.target.value)}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none"
                    >
                        <option value="realtor">Agent</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" disabled={invite.processing}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
                        Trimite invitație
                    </button>
                    <button type="button" onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-100" aria-label="Închide">
                        <XIcon className="w-4 h-4" />
                    </button>
                </form>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-100/50 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <h4 className="text-sm font-semibold text-amber-900">Invitații în așteptare ({invitations.length})</h4>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {invitations.map(inv => (
                            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-900">{inv.email}</span>
                                        <span className="text-[10px] font-semibold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                                            {inv.role === 'admin' ? 'Admin' : 'Agent'}
                                        </span>
                                        {inv.is_expired && (
                                            <span className="text-[10px] font-semibold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
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
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors"
                                    title="Copiază linkul"
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    Copiază
                                </button>
                                <button
                                    onClick={() => resendInvitation(inv)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                    title="Retrimite email-ul"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Retrimite
                                </button>
                                <button
                                    onClick={() => cancelInvitation(inv)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                    Anulează
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
                    <div key={agent.id} className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-lg hover:border-slate-300/70 transition-all duration-200">
                        {/* Avatar + info group — stays horizontal even on mobile */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
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
                                    <span className="font-semibold text-slate-900 text-sm">{agent.name}</span>
                                    {agent.is_self && <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Tu</span>}
                                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                        {agent.is_active ? 'Activ' : 'Suspendat'}
                                    </span>
                                    {agent.is_online && (
                                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            online
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 truncate">{agent.email} {agent.position ? `· ${agent.position}` : ''}</div>

                                {/* Last login info */}
                                {agent.last_login_at && (
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                        <span title="Ultimul login" className="inline-flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(agent.last_login_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {agent.last_login_ip && <span className="font-mono">· {agent.last_login_ip}</span>}
                                        {agent.last_login_device && agent.last_login_device !== '—' && <span>· {agent.last_login_device}</span>}
                                        {agent.last_login_browser && agent.last_login_browser !== '—' && <span>· {agent.last_login_browser}</span>}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                                    <span className="inline-flex items-center gap-1"><Home className="w-3 h-3" /> {agent.properties_count}</span>
                                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {agent.contacts_count}</span>
                                    <span className="inline-flex items-center gap-1"><Handshake className="w-3 h-3" /> {agent.deals_count}</span>
                                    <button
                                        onClick={() => setHistoryAgent(agent)}
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                                    >
                                        <ScrollText className="w-3 h-3" />
                                        Istoric
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Role + actions group — full-width row on mobile, inline on desktop */}
                        {!agent.is_self && (
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0">
                                <select
                                    value={agent.role}
                                    onChange={e => changeRole(agent, e.target.value)}
                                    className="flex-1 sm:flex-initial rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="realtor">Realtor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button
                                    onClick={() => toggleActive(agent)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${agent.is_active ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    {agent.is_active ? 'Suspendă' : 'Activează'}
                                </button>
                                <button
                                    onClick={() => remove(agent)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                    <div className="rounded-xl bg-slate-50 border border-slate-200/70 divide-y divide-slate-200/70 px-5">
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

// Lucide component map for the activity log. Render as <Icon className=… />.
const ACTIVITY_ICON = {
    'auth.login':                    LogIn,
    'auth.logout':                   LogOut,
    'auth.failed':                   ShieldAlert,
    'profile.updated':               User,
    'profile.password_changed':      Key,
    'profile.avatar_updated':        ImageIcon,
    'profile.avatar_removed':        Trash2,
    'property.created':              Home,
    'property.updated':              Pencil,
    'property.deleted':              Trash2,
    'contact.created':               Users,
    'contact.updated':               Pencil,
    'contact.deleted':               Trash2,
    'deal.created':                  Briefcase,
    'deal.updated':                  Pencil,
    'deal.deleted':                  Trash2,
    'calendar.created':              Calendar,
    'calendar.deleted':              Trash2,
    'subscription.checkout_started': CreditCard,
    'subscription.cancelled':        XCircle,
};

function SecurityTab({ sessions, activityLog = [] }) {
    const pw = useForm({ current_password: '', password: '', password_confirmation: '' });
    const logoutOthers = useForm({ password: '' });
    const [showLogoutForm, setShowLogoutForm] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const { auth } = usePage().props;
    const isOwner = !!((auth?.user?.is_admin || auth?.user?.is_super_admin) && auth?.user?.agency);

    const deleteForm = useForm({ password: '' });

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

    const closeDeleteModal = () => {
        setConfirmingDelete(false);
        deleteForm.clearErrors();
        deleteForm.reset();
    };

    const submitDelete = (e) => {
        e.preventDefault();
        deleteForm.delete(route('profile.destroy'), {
            preserveScroll: true,
            onError: () => {},
        });
    };

    const uaIcon = (ua = '') => {
        if (/mobile|android|iphone/i.test(ua)) return Smartphone;
        if (/mac/i.test(ua)) return Apple;
        return Laptop;
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
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800 inline-flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>2FA prin email sau SMS — disponibil în versiunea viitoare.</span>
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
                    <form onSubmit={submitLogout} className="flex gap-2 mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100">
                        <input
                            type="password"
                            value={logoutOthers.data.password}
                            onChange={e => logoutOthers.setData('password', e.target.value)}
                            placeholder="Confirmă parola"
                            className="flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        <button type="submit" disabled={logoutOthers.processing}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
                            Confirmă
                        </button>
                    </form>
                )}

                <div className="space-y-2">
                    {sessions.length === 0 ? (
                        <div className="text-sm text-slate-400 text-center py-4">Nicio sesiune găsită.</div>
                    ) : (
                        sessions.map(s => {
                            const UaIcon = uaIcon(s.user_agent);
                            return (
                                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">
                                        <UaIcon className="w-4 h-4" strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-slate-700 truncate">{s.user_agent}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{s.ip} · {s.last_active}</div>
                                    </div>
                                    {s.is_current && (
                                        <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-md shrink-0">
                                            Curentă
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Danger zone — account deletion */}
            <div>
                <h4 className="font-semibold text-red-600 text-sm mb-4 mt-2 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                    Zonă periculoasă
                </h4>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-700">Ștergere cont</div>
                    <p className="text-xs text-red-700/80 mt-1.5 leading-relaxed">
                        Odată ce contul este șters, toate datele asociate vor fi eliminate
                        permanent. Această acțiune nu poate fi anulată.
                    </p>
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold shadow-sm transition-colors"
                    >
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        Șterge contul
                    </button>
                </div>
            </div>

            {/* Activity log */}
            <div>
                <SectionTitle>Jurnal activitate</SectionTitle>
                {activityLog.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-4 text-sm text-slate-400 text-center">
                        Nicio activitate înregistrată încă.
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200/70 divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {activityLog.map(a => {
                            const ActIcon = ACTIVITY_ICON[a.action];
                            return (
                                <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                        {ActIcon ? <ActIcon className="w-4 h-4" strokeWidth={2} /> : <span className="text-slate-400">•</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900">{a.description ?? a.action}</div>
                                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                            <span>{a.created_at}</span>
                                            {a.ip && <span className="text-slate-300">·</span>}
                                            {a.ip && <span className="font-mono">{a.ip}</span>}
                                            <span className="text-slate-300">·</span>
                                            <code className="text-[10px] text-slate-400">{a.action}</code>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete-account confirmation modal */}
            {confirmingDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => !deleteForm.processing && closeDeleteModal()}
                >
                    <form
                        onSubmit={submitDelete}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <h3 className="text-lg font-semibold text-slate-900">
                            Ești sigur că vrei să ștergi contul?
                        </h3>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            Această acțiune este permanentă. Toate datele tale vor fi
                            șterse definitiv. Introdu parola pentru a confirma.
                        </p>

                        {isOwner && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <strong className="font-semibold">ATENȚIE:</strong>{' '}
                                Ești administratorul agenției. Ștergerea contului
                                va anula abonamentul și va șterge PERMANENT agenția,
                                împreună cu toate proprietățile, contactele,
                                tranzacțiile și agenții asociați.
                            </div>
                        )}

                        <div className="mt-5">
                            <Label>Parola</Label>
                            <Input
                                type="password"
                                value={deleteForm.data.password}
                                onChange={(v) => deleteForm.setData('password', v)}
                                placeholder="Parola"
                            />
                            <FieldError msg={deleteForm.errors.password} />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleteForm.processing}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Anulează
                            </button>
                            <button
                                type="submit"
                                disabled={deleteForm.processing}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                {deleteForm.processing ? 'Se șterge…' : 'Șterge contul'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab({ agency }) {
    const s = agency?.settings ?? {};

    const { data, setData, patch, processing } = useForm({
        facebook_token:       s.facebook_token       ?? '',
        portal_999md_api_key: s.portal_999md_api_key ?? '',
    });

    const submit = (e) => { e.preventDefault(); patch(route('settings.integrations')); };

    const items = [
        {
            Icon: Share2,
            title: 'Facebook / Instagram',
            desc: 'Autopostare automată pe rețelele sociale',
            field: 'facebook_token',
            placeholder: 'Access token Facebook',
        },
        {
            Icon: Globe,
            title: '999.md Partners API',
            desc: 'Publică anunțuri imobiliare direct pe 999.md din REALTIX.',
            field: 'portal_999md_api_key',
            placeholder: 'Cheia ta API de pe partners-api.999.md',
        },
    ];

    return (
        <form onSubmit={submit} className="space-y-4 max-w-lg">
            {items.map(item => (
                <div key={item.field} className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <item.Icon className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                        </div>
                        {data[item.field] && (
                            <span className="ml-auto text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-md shrink-0">
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                </div>
            ))}
            <SaveBtn processing={processing} label="Salvează integrările" />
        </form>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// (PortalsTab eliminat — 999.md API key e acum în IntegrationsTab.)


const TABS = [
    { key: 'profile',       label: 'Profil',       Icon: User,       adminOnly: false },
    { key: 'agency',        label: 'Agenție',      Icon: Building2,  adminOnly: true  },
    { key: 'users',         label: 'Utilizatori',  Icon: Users,      adminOnly: true  },
    { key: 'notifications', label: 'Notificări',   Icon: Bell,       adminOnly: false },
    { key: 'security',      label: 'Securitate',   Icon: Lock,       adminOnly: false },
    { key: 'integrations',  label: 'Integrări',    Icon: Link2,      adminOnly: true  },
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
                {/* Sidebar — horizontal scroll on mobile, vertical list on desktop */}
                <div className="w-full lg:w-56 lg:shrink-0 rounded-xl bg-white border border-slate-200/70 shadow-sm p-2 lg:sticky lg:top-28 lg:self-start overflow-x-auto">
                    <div className="flex lg:flex-col gap-1 lg:gap-0.5 min-w-max lg:min-w-0">
                        {visibleTabs.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`shrink-0 lg:w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-left whitespace-nowrap ${
                                        isActive
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <tab.Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} strokeWidth={2} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="w-full flex-1 rounded-xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-8">
                    {(() => {
                        const active = visibleTabs.find(t => t.key === activeTab);
                        if (!active) return null;
                        return (
                            <h2 className="text-lg font-semibold text-slate-900 mb-6 inline-flex items-center gap-2">
                                <active.Icon className="w-5 h-5 text-slate-500" strokeWidth={2} />
                                {active.label}
                            </h2>
                        );
                    })()}

                    {activeTab === 'profile'       && <ProfileTab user={user} />}
                    {activeTab === 'agency'        && <AgencyTab agency={agency} />}
                    {activeTab === 'users'         && <UsersTab agents={agents} invitations={invitations} currentUserId={user.id} canInvite={canInviteAgents} canInviteMore={canInviteMoreAgents} seatsUsed={seatsUsed} seatsLimit={seatsLimit} agencyPlan={agency?.subscription_plan ?? 'starter'} />}
                    {activeTab === 'notifications' && <NotificationsTab user={user} />}
                    {activeTab === 'security'      && <SecurityTab sessions={sessions} activityLog={activityLog} />}
                    {activeTab === 'integrations'  && <IntegrationsTab agency={agency} />}
                </div>
            </div>
        </AppLayout>
    );
}
