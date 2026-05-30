import AppLayout from '@/Layouts/AppLayout';
import TransferOwnershipModal from '@/Components/TransferOwnershipModal';
import { Head, useForm, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    StickyNote, Phone, Mail, Home, FileText, MessageSquare,
    Pencil, Trash2, Calendar, Clock, Building, ArrowLeftRight,
    Link2, Users, CheckSquare, Pin, X as XIcon, ArrowRight,
} from 'lucide-react';

const typeLabels = {
    buyer: 'Cumpărător', seller: 'Vânzător', landlord: 'Proprietar', tenant: 'Chiriaș',
};

// Lucide components keyed by interaction type — render with <Icon className=… />.
const interactionIcons = {
    note: StickyNote, call: Phone, email: Mail, viewing: Home, contract: FileText,
};
const interactionFallback = MessageSquare;

function InteractionItem({ interaction, contactId }) {
    const [editing, setEditing] = useState(false);
    const [type, setType] = useState(interaction.type);
    const [body, setBody] = useState(interaction.body ?? '');
    // ISO → `YYYY-MM-DDTHH:mm` (drop seconds + tz suffix) so DateTimeField parses correctly.
    const toLocalInput = (iso) => iso ? iso.slice(0, 16) : '';
    const [scheduledAt, setScheduledAt] = useState(toLocalInput(interaction.scheduled_at));
    const [busy, setBusy] = useState(false);

    const save = () => {
        if (! body.trim()) return;
        setBusy(true);
        router.patch(
            route('contacts.interactions.update', [contactId, interaction.id]),
            { type, body, scheduled_at: scheduledAt || null },
            { preserveScroll: true, onFinish: () => { setBusy(false); setEditing(false); } },
        );
    };

    const remove = () => {
        if (! confirm('Ștergi această interacțiune?')) return;
        setBusy(true);
        router.delete(
            route('contacts.interactions.destroy', [contactId, interaction.id]),
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    const cancel = () => {
        setType(interaction.type);
        setBody(interaction.body ?? '');
        setScheduledAt(toLocalInput(interaction.scheduled_at));
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-sm">
                <div className="flex gap-2 mb-2">
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-slate-900"
                    >
                        <option value="note">Notă</option>
                        <option value="call">Apel</option>
                        <option value="email">Email</option>
                        <option value="viewing">Vizionare</option>
                        <option value="contract">Contract</option>
                    </select>
                </div>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-2"
                />
                <DateTimeField value={scheduledAt} onChange={setScheduledAt} />
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={cancel}
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Anulează
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={busy || ! body.trim()}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                    >
                        {busy ? 'Salvez…' : 'Salvează'}
                    </button>
                </div>
            </div>
        );
    }

    const Icon = interactionIcons[interaction.type] ?? interactionFallback;

    return (
        <div className="group flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{interaction.type}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{new Date(interaction.created_at).toLocaleDateString('ro')}</span>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200/70 text-slate-500 hover:text-blue-600"
                            title="Editează"
                        ><Pencil className="w-3.5 h-3.5" /></button>
                        <button
                            type="button"
                            onClick={remove}
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                            title="Șterge"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{interaction.body}</p>
                {interaction.scheduled_at && (
                    <p className="mt-1 text-xs text-blue-600 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Programat: {new Date(interaction.scheduled_at).toLocaleString('ro')}
                    </p>
                )}
                <p className="mt-1 text-xs text-slate-400">{interaction.user?.name}</p>
            </div>
        </div>
    );
}

function localNow() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function DateTimeField({ value, onChange }) {
    const [dateVal, setDateVal] = useState(() => value ? value.split('T')[0] : '');
    const [timeVal, setTimeVal] = useState(() => value ? (value.split('T')[1] ?? localNow()) : localNow());
    const [dateFocused, setDateFocused] = useState(false);
    const [timeFocused, setTimeFocused] = useState(false);
    const dateRef = useRef(null);
    const timeRef = useRef(null);

    useEffect(() => {
        if (!value) { setDateVal(''); setTimeVal(localNow()); }
    }, [value]);

    const handleDate = (d) => {
        setDateVal(d);
        if (d && timeVal) onChange(`${d}T${timeVal}`);
        else if (!d) onChange('');
    };

    const handleTime = (t) => {
        setTimeVal(t);
        if (dateVal && t) onChange(`${dateVal}T${t}`);
    };

    const fieldCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
    const placeholderCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left text-slate-400 hover:border-slate-300 transition-colors inline-flex items-center gap-1.5';

    return (
        <div className="flex gap-2 flex-1">
            {/* Data */}
            <div className="relative flex-1">
                <input
                    ref={dateRef}
                    type="date"
                    value={dateVal}
                    onChange={e => handleDate(e.target.value)}
                    onFocus={() => setDateFocused(true)}
                    onBlur={() => setDateFocused(false)}
                    className={`${fieldCls} ${(dateFocused || dateVal) ? '' : 'sr-only'}`}
                />
                {!dateFocused && !dateVal && (
                    <button type="button" onClick={() => dateRef.current?.focus()} className={placeholderCls}>
                        <Calendar className="w-4 h-4" />
                        Data
                    </button>
                )}
            </div>
            {/* Ora */}
            <div className="relative w-32">
                <input
                    ref={timeRef}
                    type="time"
                    value={timeVal}
                    onChange={e => handleTime(e.target.value)}
                    onFocus={() => setTimeFocused(true)}
                    onBlur={() => setTimeFocused(false)}
                    className={`${fieldCls} ${(timeFocused || timeVal) ? '' : 'sr-only'}`}
                />
                {!timeFocused && !timeVal && (
                    <button type="button" onClick={() => timeRef.current?.focus()} className={placeholderCls}>
                        <Clock className="w-4 h-4" />
                        Ora
                    </button>
                )}
            </div>
        </div>
    );
}

const EVT_ICONS  = { viewing: Home, meeting: Users, call: Phone, contract: FileText, task: CheckSquare, other: Pin };
const EVT_LABELS = { viewing: 'Vizionare', meeting: 'Întâlnire', call: 'Apel', contract: 'Contract', task: 'Sarcină', other: 'Altele' };
const EVT_COLORS = { viewing: 'bg-blue-100 text-blue-700', meeting: 'bg-violet-100 text-violet-700', call: 'bg-amber-100 text-amber-700', contract: 'bg-emerald-100 text-emerald-700', task: 'bg-rose-100 text-rose-700', other: 'bg-slate-100 text-slate-500' };

const RELATION_LABELS = { owner: 'Proprietar', interested: 'Interesat', tenant: 'Chiriaș' };
const RELATION_COLORS = {
    owner:      'bg-emerald-100 text-emerald-700',
    interested: 'bg-blue-100 text-blue-700',
    tenant:     'bg-violet-100 text-violet-700',
};

function LinkedProperties({ contact, availableProperties = [] }) {
    const [adding, setAdding]       = useState(false);
    const [pickedId, setPickedId]   = useState('');
    const [relation, setRelation]   = useState('interested');
    const [notes, setNotes]         = useState('');
    const linked = contact.properties ?? [];

    const submit = () => {
        if (!pickedId) return;
        router.post(route('contacts.properties.attach', contact.id), {
            property_id: pickedId, relation, notes,
        }, {
            preserveScroll: true,
            onSuccess: () => { setAdding(false); setPickedId(''); setNotes(''); setRelation('interested'); },
        });
    };

    const detach = (propertyId) => {
        if (!confirm('Sigur elimini asocierea?')) return;
        router.delete(route('contacts.properties.detach', [contact.id, propertyId]), { preserveScroll: true });
    };

    return (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200/70 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-900 text-sm">Proprietăți asociate ({linked.length})</h3>
                </div>
                <button
                    onClick={() => setAdding(v => !v)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                    {adding ? 'Anulează' : '+ Asociază'}
                </button>
            </div>

            {adding && (
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
                    <select
                        value={pickedId} onChange={e => setPickedId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                        <option value="">— Alege proprietate —</option>
                        {availableProperties.map(p => (
                            <option key={p.id} value={p.id}>
                                #{p.id} · {p.title} {p.address ? `(${p.address})` : ''}
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(RELATION_LABELS).map(([v, l]) => (
                            <button
                                key={v}
                                onClick={() => setRelation(v)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                                    relation === v ? RELATION_COLORS[v] : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Notițe (opțional)"
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                    />
                    <button
                        onClick={submit}
                        disabled={!pickedId}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Asociază
                    </button>
                </div>
            )}

            {linked.length === 0 && !adding && (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                    Nicio proprietate asociată. Apasă „+ Asociază" pentru a adăuga.
                </div>
            )}

            <div className="divide-y divide-slate-100">
                {linked.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <a href={`/properties/${p.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600 truncate">
                                    {p.title}
                                </a>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${RELATION_COLORS[p.pivot?.relation] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {RELATION_LABELS[p.pivot?.relation] ?? p.pivot?.relation}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                                {[p.city, p.address].filter(Boolean).join(' · ')}
                                {p.price && ` · ${Number(p.price).toLocaleString('ro')} ${p.currency ?? '€'}`}
                            </p>
                            {p.pivot?.notes && <p className="text-xs text-slate-500 mt-1 italic">{p.pivot.notes}</p>}
                        </div>
                        <button
                            onClick={() => detach(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-3 shrink-0 transition-colors"
                            title="Elimină asociere"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Show({ contact, contracts = [], meetings = [], availableProperties = [], isAdmin = false, agencyAgents = [] }) {
    const { data, setData, post, processing, reset } = useForm({
        type: 'note',
        body: '',
        scheduled_at: '',
    });
    const [showTransfer, setShowTransfer] = useState(false);

    const submitInteraction = (e) => {
        e.preventDefault();
        post(`/contacts/${contact.id}/interactions`, {
            onSuccess: () => reset(),
        });
    };

    return (
        <AppLayout title={`${contact.first_name} ${contact.last_name ?? ''}`}>
            <Head title={`${contact.first_name} ${contact.last_name ?? ''}`} />

            {showTransfer && (
                <TransferOwnershipModal
                    subject="clientul"
                    currentOwner={contact.user?.name ?? `User #${contact.user_id}`}
                    agents={agencyAgents}
                    routeName="contacts.transfer"
                    routeId={contact.id}
                    onClose={() => setShowTransfer(false)}
                />
            )}

            {isAdmin && (
                <div className="flex justify-end mb-3">
                    <button
                        onClick={() => setShowTransfer(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-700 px-3 py-1.5 text-xs font-semibold hover:bg-violet-100 transition-colors"
                    >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Transferă altui agent
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Contact info */}
                <div className="space-y-5">
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200/70">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                                {contact.first_name[0]}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">{contact.first_name} {contact.last_name}</h2>
                                <span className="text-xs text-slate-500">{typeLabels[contact.type] ?? contact.type}</span>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            {contact.phone && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                    <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-700 hover:underline">{contact.phone}</a>
                                </div>
                            )}
                            {contact.email && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-700 hover:underline truncate">{contact.email}</a>
                                </div>
                            )}
                            {contact.source && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-slate-600">{contact.source}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                contact.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                contact.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                                {contact.status}
                            </span>
                        </div>

                        {contact.notes && (
                            <div className="mt-4 p-3 rounded-lg bg-slate-50 text-sm text-slate-600">
                                {contact.notes}
                            </div>
                        )}
                    </div>

                    {/* Deals */}
                    {contact.deals?.length > 0 && (
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200/70">
                            <h3 className="font-semibold text-slate-900 text-sm mb-4">Tranzacții asociate</h3>
                            <div className="space-y-3">
                                {contact.deals.map(deal => (
                                    <div key={deal.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-sm">
                                        <div className="font-semibold text-slate-900">{deal.property?.title ?? 'Fără proprietate'}</div>
                                        <div className="text-slate-500 mt-1">
                                            {deal.value ? `€${Number(deal.value).toLocaleString('ro')}` : '—'} • {deal.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Timeline + add interaction */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Add interaction */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200/70">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Adaugă interacțiune</h3>
                        <form onSubmit={submitInteraction} className="space-y-3">
                            <div className="flex gap-3">
                                <select
                                    value={data.type}
                                    onChange={e => setData('type', e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="note">Notă</option>
                                    <option value="call">Apel</option>
                                    <option value="email">Email</option>
                                    <option value="viewing">Vizionare</option>
                                    <option value="contract">Contract</option>
                                </select>
                                <DateTimeField
                                    value={data.scheduled_at}
                                    onChange={v => setData('scheduled_at', v)}
                                />
                            </div>
                            <textarea
                                value={data.body}
                                onChange={e => setData('body', e.target.value)}
                                placeholder="Detalii interacțiune…"
                                className="w-full h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                                required
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Se salvează…' : 'Adaugă'}
                            </button>
                        </form>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200/70">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Istoric interacțiuni</h3>
                        {contact.interactions?.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-6">Nicio interacțiune încă.</p>
                        ) : (
                            <div className="space-y-3">
                                {contact.interactions.map(interaction => (
                                    <InteractionItem key={interaction.id} interaction={interaction} contactId={contact.id} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Meetings timeline */}
                    {meetings.length > 0 && (
                        <div className="rounded-xl bg-white shadow-sm border border-slate-200/70 overflow-hidden">
                            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    <h3 className="font-semibold text-slate-900 text-sm">Activitate calendar</h3>
                                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{meetings.length}</span>
                                </div>
                                <a href="/calendar" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                                    Calendar
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {meetings.map(m => {
                                    const dt = new Date(m.starts_at);
                                    const isPast = dt < new Date();
                                    const EvIcon = EVT_ICONS[m.type] ?? Pin;
                                    return (
                                        <div key={m.id} className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                                            <span className={`mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md ${EVT_COLORS[m.type] ?? 'bg-slate-100 text-slate-500'}`}>
                                                <EvIcon className="w-3.5 h-3.5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
                                                    {m.title}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {dt.toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {' '}{dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                                    {m.user ? ` • ${m.user.name}` : ''}
                                                </p>
                                                {m.property && (
                                                    <a href={`/properties/${m.property_id}`}
                                                       className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate inline-flex items-center gap-1 mt-0.5">
                                                        <Home className="w-3 h-3" />
                                                        {m.property.title}
                                                    </a>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-400 shrink-0 mt-1">
                                                {EVT_LABELS[m.type] ?? m.type}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Linked properties */}
                    <LinkedProperties contact={contact} availableProperties={availableProperties} />

                    {/* Contracts */}
                    {contracts.length > 0 && (
                        <div className="rounded-xl bg-white shadow-sm border border-slate-200/70 overflow-hidden">
                            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    <h3 className="font-semibold text-slate-900 text-sm">Documente generate</h3>
                                </div>
                                <a href="/contracts" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                                    Toate
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {contracts.map(c => (
                                    <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{c.template?.name ?? '—'}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {c.property?.title
                                                    ? `${c.property.title} • `
                                                    : ''}
                                                {new Date(c.created_at).toLocaleDateString('ro')}
                                            </p>
                                        </div>
                                        <a
                                            href={`/contracts/generated/${c.id}/docx`}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 ml-4"
                                        >
                                            ↓ DOCX
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
