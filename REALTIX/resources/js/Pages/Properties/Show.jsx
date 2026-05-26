import AppLayout from '@/Layouts/AppLayout';
import TransferOwnershipModal from '@/Components/TransferOwnershipModal';
import PhoneInteractionModal from '@/Components/PhoneInteractionModal';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { getTransactionLabel } from '@/lib/propertyLabels';

// ── constants ────────────────────────────────────────────────────────────────
const VALUATION_CONFIG = {
    cheap:     { label: 'Avantajos',  bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', dot: '●' },
    average:   { label: 'La piață',   bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-400',   dot: '●' },
    expensive: { label: 'Ridicat',    bg: 'bg-red-100',     text: 'text-red-600',     bar: 'bg-red-500',     dot: '●' },
};

const STATUS_COLORS = {
    active: 'bg-emerald-100 text-emerald-700',
    sold:   'bg-blue-100 text-blue-700',
    rented: 'bg-purple-100 text-purple-700',
};
const STATUS_LABELS = { active: 'Activ', inactive: 'Inactiv', sold: 'Vândut', rented: 'Închiriat' };

const VIEWING_STATUS = {
    liked:    { l: '👍 Plăcut',     c: 'bg-emerald-100 text-emerald-700' },
    thinking: { l: '🤔 Se gândesc', c: 'bg-amber-100 text-amber-700' },
    rejected: { l: '👎 Refuz',      c: 'bg-red-100 text-red-600' },
    no_show:  { l: '🚫 N-au venit', c: 'bg-slate-100 text-slate-500' },
    pending:  { l: 'Programat',     c: 'bg-blue-100 text-blue-600' },
};

const RELATION_LABELS = { owner: 'Proprietar', interested: 'Interesat', tenant: 'Chiriaș' };
const RELATION_COLORS = {
    owner:      'bg-emerald-100 text-emerald-700',
    interested: 'bg-blue-100 text-blue-700',
    tenant:     'bg-violet-100 text-violet-700',
};
const CONTACT_TYPE_LABELS = { buyer: 'Cumpărător', seller: 'Vânzător', landlord: 'Proprietar', tenant: 'Chiriaș' };

function LinkedContacts({ property, availableContacts = [] }) {
    const [adding, setAdding]     = useState(false);
    const [pickedId, setPickedId] = useState('');
    const [relation, setRelation] = useState('interested');
    const [notes, setNotes]       = useState('');
    const linked = property.contacts ?? [];

    const submit = () => {
        if (!pickedId) return;
        router.post(route('properties.contacts.attach', property.id), {
            contact_id: pickedId, relation, notes,
        }, {
            preserveScroll: true,
            onSuccess: () => { setAdding(false); setPickedId(''); setNotes(''); setRelation('interested'); },
        });
    };

    const detach = (contactId) => {
        if (!confirm('Sigur elimini asocierea?')) return;
        router.delete(route('properties.contacts.detach', [property.id, contactId]), { preserveScroll: true });
    };

    return (
        <div className="rounded-4xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <h3 className="font-bold text-slate-800">Clienți asociați ({linked.length})</h3>
                </div>
                <button
                    onClick={() => setAdding(v => !v)}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                >
                    {adding ? 'Anulează' : '+ Asociază'}
                </button>
            </div>

            {adding && (
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
                    <select
                        value={pickedId} onChange={e => setPickedId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                    >
                        <option value="">— Alege client —</option>
                        {availableContacts.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.first_name} {c.last_name} {c.phone ? `· ${c.phone}` : ''} {c.type ? `(${CONTACT_TYPE_LABELS[c.type] ?? c.type})` : ''}
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(RELATION_LABELS).map(([v, l]) => (
                            <button
                                key={v}
                                onClick={() => setRelation(v)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none bg-white"
                    />
                    <button
                        onClick={submit}
                        disabled={!pickedId}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Asociază
                    </button>
                </div>
            )}

            {linked.length === 0 && !adding && (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                    Niciun client asociat. Apasă „+ Asociază" pentru a adăuga.
                </div>
            )}

            <div className="divide-y divide-slate-50">
                {linked.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <Link href={route('contacts.show', c.id)} className="text-sm font-semibold text-slate-800 hover:text-blue-700 truncate">
                                    {c.first_name} {c.last_name}
                                </Link>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RELATION_COLORS[c.pivot?.relation] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {RELATION_LABELS[c.pivot?.relation] ?? c.pivot?.relation}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                {[c.phone, c.email].filter(Boolean).join(' · ')}
                            </p>
                            {c.pivot?.notes && <p className="text-xs text-slate-500 mt-1 italic">{c.pivot.notes}</p>}
                        </div>
                        <button
                            onClick={() => detach(c.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold ml-3 shrink-0"
                            title="Elimină asociere"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Heroicons-style 24×24 outline SVG paths (kept inline to avoid a new dep).
const ICON = {
    edit:     'M16.862 4.487 18.549 2.799a2.121 2.121 0 1 1 3 3L19.862 7.487M16.862 4.487 9.396 11.953a4.5 4.5 0 0 0-1.13 1.897l-.85 2.85 2.85-.85a4.5 4.5 0 0 0 1.897-1.13l7.466-7.466M16.862 4.487 19.862 7.487M4.5 19.5h15',
    phone:    'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    upload:   'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12M12 7.5v9',
    link:     'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
    transfer: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
    trash:    'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
    chevron:  'm8.25 4.5 7.5 7.5-7.5 7.5',
    external: 'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
    eye:      'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
};

function Svg({ path, className = 'w-5 h-5' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
             className={className}>
            <path d={path} />
        </svg>
    );
}

function ActionRow({ iconPath, label, href, onClick, external = false, danger = false }) {
    const wrapCls = danger
        ? 'border-red-100 bg-red-50/60 hover:bg-red-50'
        : 'border-blue-100 bg-blue-50/60 hover:bg-blue-50';
    const iconCls = danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700';
    const textCls = danger ? 'text-red-600'           : 'text-blue-700';

    const body = (
        <div className="flex items-center gap-2.5 px-3 py-2 w-full">
            <div className={`w-8 h-8 rounded-lg ${iconCls} flex items-center justify-center shrink-0`}>
                <Svg path={iconPath} className="w-4 h-4" />
            </div>
            <span className={`flex-1 text-[13px] font-bold text-left ${textCls}`}>{label}</span>
            <Svg path={external ? ICON.external : ICON.chevron} className={`w-4 h-4 ${textCls} opacity-80`} />
        </div>
    );

    const cls = `block w-full rounded-xl border ${wrapCls} transition-colors`;

    if (href) {
        return external ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
        ) : (
            <Link href={href} className={cls}>{body}</Link>
        );
    }
    return <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function InternalNotesCard({ propertyId, notes = [] }) {
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);

    const submit = () => {
        if (!text.trim()) return;
        setPosting(true);
        router.post(route('properties.notes.store', propertyId), {
            body: text.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => setText(''),
            onFinish:  () => setPosting(false),
        });
    };

    return (
        <div className="bg-white p-6 rounded-4xl shadow-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h3 className="font-bold text-slate-800 text-sm">Comentarii interne</h3>
                <span className="text-xs text-slate-400 ml-auto">{notes.length}</span>
            </div>

            {notes.length === 0 && (
                <p className="text-xs text-slate-400">Niciun comentariu încă.</p>
            )}

            {notes.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notes.map(n => {
                        const dt = new Date(n.created_at);
                        return (
                            <div key={n.id} className="rounded-xl bg-slate-50 px-3 py-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                                    <span className="font-semibold text-slate-600">{n.user?.name ?? '—'}</span>
                                    <span>
                                        {dt.toLocaleDateString('ro', { day: 'numeric', month: 'short' })}
                                        {' '}
                                        {dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap wrap-break-word">{n.body}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={2}
                placeholder="Adaugă un comentariu intern…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 resize-none"
            />
            <button
                onClick={submit}
                disabled={posting || !text.trim()}
                className="block w-full text-center rounded-2xl bg-slate-900 py-2 text-white text-xs font-bold hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {posting ? 'Se salvează…' : 'Salvează comentariu'}
            </button>
        </div>
    );
}

export default function Show({ property, contracts = [], viewings = [], availableContacts = [], isAdmin = false, agencyAgents = [], ownerContactId = null, ownerNotes = [] }) {
    const { flash } = usePage().props;
    const [showTransfer, setShowTransfer] = useState(false);
    const [showCall,     setShowCall]     = useState(false);

    const handleDelete = () => {
        if (confirm('Sigur vrei să ștergi această proprietate?')) {
            router.delete(`/properties/${property.id}`);
        }
    };

    const priceEstimate = property.meta?.ai_price_min
        ? `€${Number(property.meta.ai_price_min).toLocaleString('ro')} – €${Number(property.meta.ai_price_max).toLocaleString('ro')}`
        : null;

    const valCfg = property.ai_valuation ? VALUATION_CONFIG[property.ai_valuation] : null;

    return (
        <AppLayout title={property.title}>
            <Head title={property.title} />

            {showTransfer && (
                <TransferOwnershipModal
                    subject="anunțul"
                    currentOwner={property.user?.name ?? `User #${property.user_id}`}
                    agents={agencyAgents}
                    routeName="properties.transfer"
                    routeId={property.id}
                    onClose={() => setShowTransfer(false)}
                />
            )}

            {showCall && (
                <PhoneInteractionModal
                    subjectType="property"
                    subjectId={property.id}
                    mode="drawer"
                    onClose={() => setShowCall(false)}
                />
            )}

            <div className="max-w-5xl space-y-6">

                {flash?.ai_queued && (
                    <div className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3 text-sm text-blue-800">
                        {flash.ai_queued}
                    </div>
                )}


                {/* Media gallery */}
                <div className="bg-white rounded-4xl shadow-xl border border-slate-100 overflow-hidden">
                    {property.media?.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1 h-64">
                            {property.media.slice(0, 3).map((m, i) => (
                                <img
                                    key={m.id}
                                    src={`/storage/${m.path}`}
                                    className={`object-cover w-full h-full ${i === 0 ? 'col-span-2' : ''}`}
                                    alt=""
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-48 bg-slate-100 flex items-center justify-center text-5xl text-slate-300">🏠</div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Main info ── */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                                    <p className="text-slate-500 mt-1">
                                        {property.city}{property.district ? `, ${property.district}` : ''}
                                        {property.address ? ` • ${property.address}` : ''}
                                    </p>
                                </div>
                                {valCfg && (
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${valCfg.bg} ${valCfg.text}`}>
                                        {valCfg.dot} {valCfg.label}
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 text-4xl font-bold text-emerald-600">
                                {property.price
                                    ? `${property.currency === 'EUR' ? '€' : property.currency} ${Number(property.price).toLocaleString('ro')}`
                                    : 'Preț negociabil'}
                            </div>
                            {property.price && property.area_total > 0 && (
                                <div className="text-xs text-slate-400 mt-1">
                                    {Math.round(property.price / property.area_total).toLocaleString('ro')} {property.currency === 'EUR' ? '€' : property.currency}/m²
                                </div>
                            )}

                            {priceEstimate && (
                                <div className="mt-2 text-sm text-slate-500">
                                    Estimare AI: <span className="font-semibold text-slate-700">{priceEstimate}</span>
                                    {property.meta?.ai_price_reason && (
                                        <span className="text-xs ml-2 text-slate-400">({property.meta.ai_price_reason})</span>
                                    )}
                                </div>
                            )}

                            {(() => {
                                // Build cards array — skip cards with null/empty values.
                                // Tranzacția afișează mereu (e mereu setată: sale/rent).
                                // Astea care pot fi NULL (area_total, rooms, floor) se ascund când lipsesc.
                                const cards = [
                                    property.area_total && {
                                        label: 'Suprafață',
                                        value: `${property.area_total} m²`,
                                    },
                                    property.rooms && {
                                        label: 'Camere',
                                        value: property.rooms,
                                    },
                                    property.floor && {
                                        label: 'Etaj',
                                        value: `${property.floor}/${property.floors_total ?? '?'}`,
                                    },
                                    {
                                        label: 'Tranzacție',
                                        value: getTransactionLabel(property.transaction_type),
                                    },
                                ].filter(Boolean);

                                // Adapt grid columns to number of visible cards (2-4)
                                const gridCols = cards.length === 4 ? 'sm:grid-cols-4'
                                               : cards.length === 3 ? 'sm:grid-cols-3'
                                               : cards.length === 2 ? 'sm:grid-cols-2'
                                               : 'sm:grid-cols-1';

                                return (
                                    <div className={`mt-6 grid grid-cols-2 ${gridCols} gap-4`}>
                                        {cards.map(item => (
                                            <div key={item.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                                                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                                <div className="font-bold text-slate-900">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Descriptions */}
                            {['ro', 'ru'].map(lang => {
                                const key = `description_${lang}`;
                                if (!property[key]) return null;
                                return (
                                    <div key={lang} className="mt-5 border-t border-slate-100 pt-5">
                                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            Descriere
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{lang}</span>
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{property[key]}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Linked clients ── */}
                        <LinkedContacts property={property} availableContacts={availableContacts} />

                        {/* ── Viewings Card ── */}
                        {viewings.length > 0 && (
                            <div className="bg-white rounded-4xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🏠</span>
                                        <h2 className="font-bold text-slate-800 text-base">Vizionări</h2>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{viewings.length}</span>
                                    </div>
                                    <Link href="/calendar" className="text-xs font-semibold text-blue-700 hover:underline">
                                        Calendar →
                                    </Link>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {viewings.map(v => {
                                        const st = VIEWING_STATUS[v.status] ?? VIEWING_STATUS.pending;
                                        const dt = new Date(v.starts_at);
                                        const isPast = dt < new Date();
                                        return (
                                            <div key={v.id} className="flex items-center gap-4 px-8 py-3 hover:bg-slate-50 transition-colors">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${isPast ? 'bg-slate-300' : 'bg-blue-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{v.title}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {dt.toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {' '}{dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                                        {v.user ? ` • ${v.user.name}` : ''}
                                                    </p>
                                                    {v.contact && (
                                                        <p className="text-xs text-slate-400 truncate">
                                                            👤 {v.contact.first_name} {v.contact.last_name ?? ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.c}`}>
                                                    {st.l}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Contracts Card ── */}
                        {contracts.length > 0 && (
                            <div className="bg-white rounded-4xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📄</span>
                                        <h2 className="font-bold text-slate-800 text-base">Documente generate</h2>
                                    </div>
                                    <Link
                                        href="/contracts"
                                        className="text-xs font-semibold text-blue-700 hover:underline"
                                    >
                                        Toate documentele →
                                    </Link>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {contracts.map(c => (
                                        <div key={c.id} className="flex items-center justify-between px-8 py-4 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{c.template?.name ?? '—'}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {c.contact
                                                        ? `${c.contact.first_name} ${c.contact.last_name ?? ''} • `
                                                        : ''}
                                                    {new Date(c.created_at).toLocaleDateString('ro')}
                                                </p>
                                            </div>
                                            <a
                                                href={`/contracts/generated/${c.id}/docx`}
                                                className="text-xs font-semibold text-blue-700 hover:underline shrink-0 ml-4"
                                            >
                                                ↓ DOCX
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ── Actions sidebar ── */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-4xl shadow-xl border border-slate-100 space-y-3">
                            <div className="text-xs text-slate-500 mb-1">
                                Agent: <span className="font-semibold text-slate-700">{property.user?.name}</span>
                            </div>
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[property.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {STATUS_LABELS[property.status] ?? property.status}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Svg path={ICON.eye} className="w-4 h-4" />
                                <span>{property.views_count} vizualizări</span>
                            </div>

                            <div className="space-y-1.5 mt-3">
                                <ActionRow iconPath={ICON.edit}     label="Editează" href={`/properties/${property.id}/edit`} />
                                <ActionRow iconPath={ICON.phone}    label="Sună client" onClick={() => setShowCall(true)} />
                                <ActionRow iconPath={ICON.calendar} label="Adaugă în calendar" href={`/calendar?property_id=${property.id}&type=viewing`} />
                                <ActionRow iconPath={ICON.upload}   label="Autopostare" href={`/autopost?property_id=${property.id}`} />
                                {property.meta?.source_url && (
                                    <ActionRow iconPath={ICON.link}
                                        label={`Anunț original ${(property.meta?.imported_from ?? '').toUpperCase()}`}
                                        href={property.meta.source_url} external />
                                )}
                                {isAdmin && (
                                    <ActionRow iconPath={ICON.transfer} label="Transferă altui agent" onClick={() => setShowTransfer(true)} />
                                )}
                                <ActionRow iconPath={ICON.trash} label="Șterge" onClick={handleDelete} danger />
                            </div>
                        </div>


                        {/* Internal notes about this property listing */}
                        <InternalNotesCard propertyId={property.id} notes={property.notes ?? []} />

                        {/* Quick AI stats */}
                        {(property.meta?.ai_price_min || property.ai_valuation) && (
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Analiză AI</p>
                                {priceEstimate && (
                                    <div>
                                        <p className="text-xs text-slate-500">Estimare preț</p>
                                        <p className="font-bold text-slate-800 text-sm">{priceEstimate}</p>
                                    </div>
                                )}
                                {valCfg && (
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${valCfg.bg} ${valCfg.text}`}>
                                        {valCfg.dot} {valCfg.label}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
