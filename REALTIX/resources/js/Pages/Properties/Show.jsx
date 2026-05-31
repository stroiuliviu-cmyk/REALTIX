import AppLayout from '@/Layouts/AppLayout';
import TransferOwnershipModal from '@/Components/TransferOwnershipModal';
import PhoneInteractionModal from '@/Components/PhoneInteractionModal';
import PropertyGallery from '@/Components/PropertyGallery';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { getTransactionLabel } from '@/lib/propertyLabels';
import {
    Users, MessageSquare, Calendar, FileText, Eye, User as UserIcon,
    Edit, Phone, Upload, Link as LinkIcon, ArrowLeftRight, Trash2,
    ChevronRight, ExternalLink, ArrowRight, Download, Plus,
    ThumbsUp, ThumbsDown, Ban, HelpCircle, Clock,
} from 'lucide-react';

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
    liked:    { Icon: ThumbsUp,   label: 'Plăcut',     c: 'bg-emerald-100 text-emerald-700' },
    thinking: { Icon: HelpCircle, label: 'Se gândesc', c: 'bg-amber-100 text-amber-700' },
    rejected: { Icon: ThumbsDown, label: 'Refuz',      c: 'bg-red-100 text-red-600' },
    no_show:  { Icon: Ban,        label: 'N-au venit', c: 'bg-slate-100 text-slate-500' },
    pending:  { Icon: Clock,      label: 'Programat',  c: 'bg-blue-100 text-blue-600' },
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
        <div className="rounded-xl bg-white shadow-sm border border-slate-200/70 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Clienți asociați ({linked.length})</h3>
                </div>
                <button
                    type="button"
                    onClick={() => setAdding(v => !v)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                    {adding ? 'Anulează' : <><Plus className="w-3.5 h-3.5" /> Asociază</>}
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
                            type="button"
                            onClick={() => detach(c.id)}
                            className="text-slate-400 hover:text-red-600 ml-3 shrink-0"
                            title="Elimină asociere"
                            aria-label="Elimină asociere"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ActionRow — pill-shaped sidebar action. Pass Icon as a Lucide component.
function ActionRow({ Icon, label, href, onClick, external = false, danger = false }) {
    const wrapCls = danger
        ? 'border-red-100 bg-red-50/60 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 dark:hover:bg-red-900/30'
        : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800';
    const iconCls = danger ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    const textCls = danger ? 'text-red-600 dark:text-red-400'           : 'text-slate-700 dark:text-slate-200';

    const TrailingIcon = external ? ExternalLink : ChevronRight;

    const body = (
        <div className="flex items-center gap-2.5 px-3 py-2 w-full">
            <div className={`w-8 h-8 rounded-lg ${iconCls} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`flex-1 text-[13px] font-semibold text-left ${textCls}`}>{label}</span>
            <TrailingIcon className={`w-4 h-4 ${textCls} opacity-60`} />
        </div>
    );

    const cls = `block w-full rounded-lg border ${wrapCls} transition-colors`;

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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Comentarii interne</h3>
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
                type="button"
                onClick={submit}
                disabled={posting || !text.trim()}
                className="block w-full text-center rounded-lg bg-slate-900 hover:bg-slate-800 py-2 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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


                {/* Media gallery — Storia / Imobiliare.md style hero + thumbs +
                    lightbox (zoom, fullscreen, swipe). Lives in its own component
                    so the rest of Show.jsx stays focused on the data layout. */}
                <PropertyGallery media={property.media} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Main info ── */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/70">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-semibold text-slate-900">{property.title}</h1>
                                    <p className="text-slate-500 mt-1">
                                        {property.city}{property.district ? `, ${property.district}` : ''}
                                        {property.address ? ` • ${property.address}` : ''}
                                    </p>
                                </div>
                                {valCfg && (
                                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5 ${valCfg.bg} ${valCfg.text}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {valCfg.label}
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 text-3xl font-bold text-slate-900 tabular-nums">
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
                                            <div key={item.label} className="bg-slate-50 rounded-lg border border-slate-200/70 p-4 text-center">
                                                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                                <div className="font-semibold text-slate-900">{item.value}</div>
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
                                        <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                            Descriere
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">{lang}</span>
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
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200/70 overflow-hidden">
                                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-slate-600" />
                                        <h2 className="font-semibold text-slate-900 text-base">Vizionări</h2>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{viewings.length}</span>
                                    </div>
                                    <Link href="/calendar" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                                        Calendar
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {viewings.map(v => {
                                        const st = VIEWING_STATUS[v.status] ?? VIEWING_STATUS.pending;
                                        const StIcon = st.Icon;
                                        const dt = new Date(v.starts_at);
                                        const isPast = dt < new Date();
                                        return (
                                            <div key={v.id} className="flex items-center gap-4 px-8 py-3 hover:bg-slate-50 transition-colors">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${isPast ? 'bg-slate-300' : 'bg-blue-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{v.title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {dt.toLocaleDateString('ro', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {' '}{dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                                        {v.user ? ` • ${v.user.name}` : ''}
                                                    </p>
                                                    {v.contact && (
                                                        <p className="text-xs text-slate-500 truncate inline-flex items-center gap-1">
                                                            <UserIcon className="w-3 h-3 shrink-0" />
                                                            {v.contact.first_name} {v.contact.last_name ?? ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 ${st.c}`}>
                                                    <StIcon className="w-3 h-3" />
                                                    {st.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Contracts Card ── */}
                        {contracts.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200/70 overflow-hidden">
                                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                        <h2 className="font-semibold text-slate-900 text-base">Documente generate</h2>
                                    </div>
                                    <Link
                                        href="/contracts"
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                                    >
                                        Toate documentele
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {contracts.map(c => (
                                        <div key={c.id} className="flex items-center justify-between px-8 py-4 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{c.template?.name ?? '—'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {c.contact
                                                        ? `${c.contact.first_name} ${c.contact.last_name ?? ''} • `
                                                        : ''}
                                                    {new Date(c.created_at).toLocaleDateString('ro')}
                                                </p>
                                            </div>
                                            <a
                                                href={`/contracts/generated/${c.id}/docx`}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 ml-4 inline-flex items-center gap-1"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                DOCX
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ── Actions sidebar ── */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/70 space-y-3">
                            <div className="text-xs text-slate-500 mb-1">
                                Agent: <span className="font-semibold text-slate-700">{property.user?.name}</span>
                            </div>
                            <div className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_COLORS[property.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {STATUS_LABELS[property.status] ?? property.status}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Eye className="w-4 h-4" />
                                <span>{property.views_count} vizualizări</span>
                            </div>

                            <div className="space-y-1.5 mt-3">
                                <ActionRow Icon={Edit}     label="Editează" href={`/properties/${property.id}/edit`} />
                                <ActionRow Icon={Phone}    label="Sună client" onClick={() => setShowCall(true)} />
                                <ActionRow Icon={Calendar} label="Adaugă în calendar" href={`/calendar?property_id=${property.id}&type=viewing`} />
                                <ActionRow Icon={Upload}   label="Autopostare" href={`/autopost?property_id=${property.id}`} />
                                {property.meta?.source_url && (
                                    <ActionRow Icon={LinkIcon}
                                        label={`Anunț original ${(property.meta?.imported_from ?? '').toUpperCase()}`}
                                        href={property.meta.source_url} external />
                                )}
                                {isAdmin && (
                                    <ActionRow Icon={ArrowLeftRight} label="Transferă altui agent" onClick={() => setShowTransfer(true)} />
                                )}
                                <ActionRow Icon={Trash2} label="Șterge" onClick={handleDelete} danger />
                            </div>
                        </div>


                        {/* Internal notes about this property listing */}
                        <InternalNotesCard propertyId={property.id} notes={property.notes ?? []} />

                        {/* Quick AI stats */}
                        {(property.meta?.ai_price_min || property.ai_valuation) && (
                            <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analiză AI</p>
                                {priceEstimate && (
                                    <div>
                                        <p className="text-xs text-slate-500">Estimare preț</p>
                                        <p className="font-semibold text-slate-900 text-sm">{priceEstimate}</p>
                                    </div>
                                )}
                                {valCfg && (
                                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold ${valCfg.bg} ${valCfg.text}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {valCfg.label}
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
