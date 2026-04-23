import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const typeLabels = {
    buyer: 'Cumpărător', seller: 'Vânzător', landlord: 'Proprietar', tenant: 'Chiriaș',
};

const interactionIcons = {
    note: '📝', call: '📞', email: '✉️', viewing: '🏠', contract: '📄',
};

function InteractionItem({ interaction }) {
    return (
        <div className="flex gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-2xl">{interactionIcons[interaction.type] ?? '💬'}</div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{interaction.type}</span>
                    <span className="text-xs text-slate-400">{new Date(interaction.created_at).toLocaleDateString('ro')}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{interaction.body}</p>
                {interaction.scheduled_at && (
                    <p className="mt-1 text-xs text-blue-600">
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
                    className={`w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 ${(dateFocused || dateVal) ? '' : 'sr-only'}`}
                />
                {!dateFocused && !dateVal && (
                    <button type="button" onClick={() => dateRef.current?.focus()}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-left text-slate-400 hover:border-slate-300 transition-colors">
                        📅 Data
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
                    className={`w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 ${(timeFocused || timeVal) ? '' : 'sr-only'}`}
                />
                {!timeFocused && !timeVal && (
                    <button type="button" onClick={() => timeRef.current?.focus()}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-left text-slate-400 hover:border-slate-300 transition-colors">
                        🕐 Ora
                    </button>
                )}
            </div>
        </div>
    );
}

const EVT_ICONS = { viewing: '🏠', meeting: '🤝', call: '📞', contract: '📄', task: '✅', other: '📌' };
const EVT_LABELS = { viewing: 'Vizionare', meeting: 'Întâlnire', call: 'Apel', contract: 'Contract', task: 'Sarcină', other: 'Altele' };
const EVT_COLORS = { viewing: 'bg-blue-100 text-blue-700', meeting: 'bg-purple-100 text-purple-700', call: 'bg-amber-100 text-amber-700', contract: 'bg-emerald-100 text-emerald-700', task: 'bg-rose-100 text-rose-700', other: 'bg-slate-100 text-slate-500' };

export default function Show({ contact, contracts = [], meetings = [] }) {
    const { data, setData, post, processing, reset } = useForm({
        type: 'note',
        body: '',
        scheduled_at: '',
    });

    const submitInteraction = (e) => {
        e.preventDefault();
        post(`/contacts/${contact.id}/interactions`, {
            onSuccess: () => reset(),
        });
    };

    return (
        <AppLayout title={`${contact.first_name} ${contact.last_name ?? ''}`}>
            <Head title={`${contact.first_name} ${contact.last_name ?? ''}`} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Contact info */}
                <div className="space-y-5">
                    <div className="rounded-4xl bg-white p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 text-2xl font-bold">
                                {contact.first_name[0]}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{contact.first_name} {contact.last_name}</h2>
                                <span className="text-xs text-slate-500">{typeLabels[contact.type] ?? contact.type}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {contact.phone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-lg">📞</span>
                                    <a href={`tel:${contact.phone}`} className="text-blue-700 hover:underline">{contact.phone}</a>
                                </div>
                            )}
                            {contact.email && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-lg">✉️</span>
                                    <a href={`mailto:${contact.email}`} className="text-blue-700 hover:underline">{contact.email}</a>
                                </div>
                            )}
                            {contact.source && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-lg">🔗</span>
                                    <span className="text-slate-600">{contact.source}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                contact.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                contact.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                                {contact.status}
                            </span>
                        </div>

                        {contact.notes && (
                            <div className="mt-4 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                                {contact.notes}
                            </div>
                        )}
                    </div>

                    {/* Deals */}
                    {contact.deals?.length > 0 && (
                        <div className="rounded-4xl bg-white p-6 shadow-2xl border border-slate-100">
                            <h3 className="font-bold mb-4">Tranzacții asociate</h3>
                            <div className="space-y-3">
                                {contact.deals.map(deal => (
                                    <div key={deal.id} className="p-3 rounded-xl bg-slate-50 text-sm">
                                        <div className="font-semibold">{deal.property?.title ?? 'Fără proprietate'}</div>
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
                    <div className="rounded-4xl bg-white p-6 shadow-2xl border border-slate-100">
                        <h3 className="font-bold mb-4">Adaugă interacțiune</h3>
                        <form onSubmit={submitInteraction} className="space-y-3">
                            <div className="flex gap-3">
                                <select
                                    value={data.type}
                                    onChange={e => setData('type', e.target.value)}
                                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
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
                                placeholder="Detalii interacțiune..."
                                className="w-full h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-700 resize-none"
                                required
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-2xl bg-slate-900 px-6 py-2.5 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Se salvează...' : 'Adaugă'}
                            </button>
                        </form>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-4xl bg-white p-6 shadow-2xl border border-slate-100">
                        <h3 className="font-bold mb-4">Istoric interacțiuni</h3>
                        {contact.interactions?.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-6">Nicio interacțiune încă.</p>
                        ) : (
                            <div className="space-y-3">
                                {contact.interactions.map(interaction => (
                                    <InteractionItem key={interaction.id} interaction={interaction} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Meetings timeline */}
                    {meetings.length > 0 && (
                        <div className="rounded-4xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📅</span>
                                    <h3 className="font-bold text-slate-800">Activitate calendar</h3>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{meetings.length}</span>
                                </div>
                                <a href="/calendar" className="text-xs font-semibold text-blue-700 hover:underline">
                                    Calendar →
                                </a>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {meetings.map(m => {
                                    const dt = new Date(m.starts_at);
                                    const isPast = dt < new Date();
                                    return (
                                        <div key={m.id} className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                                            <div className="mt-1 shrink-0">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${EVT_COLORS[m.type] ?? 'bg-slate-100 text-slate-500'}`}>
                                                    {EVT_ICONS[m.type]}
                                                </span>
                                            </div>
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
                                                       className="text-xs text-blue-600 hover:underline truncate block mt-0.5">
                                                        🏠 {m.property.title}
                                                    </a>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-300 shrink-0 mt-1">
                                                {EVT_LABELS[m.type] ?? m.type}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Contracts */}
                    {contracts.length > 0 && (
                        <div className="rounded-4xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📄</span>
                                    <h3 className="font-bold text-slate-800">Documente generate</h3>
                                </div>
                                <a href="/contracts" className="text-xs font-semibold text-blue-700 hover:underline">
                                    Toate →
                                </a>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {contracts.map(c => (
                                    <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{c.template?.name ?? '—'}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {c.property?.title
                                                    ? `${c.property.title} • `
                                                    : ''}
                                                {new Date(c.created_at).toLocaleDateString('ro')}
                                            </p>
                                        </div>
                                        {c.pdf_path && (
                                            <a
                                                href={`/storage/${c.pdf_path}`}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-xs font-semibold text-blue-700 hover:underline shrink-0 ml-4"
                                            >
                                                ↓ PDF
                                            </a>
                                        )}
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
