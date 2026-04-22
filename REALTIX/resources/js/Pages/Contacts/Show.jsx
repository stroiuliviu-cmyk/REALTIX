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

function DateTimeField({ value, onChange }) {
    const [dateVal, setDateVal] = useState(() => value ? value.split('T')[0] : '');
    const [timeVal, setTimeVal] = useState(() => value ? (value.split('T')[1] ?? '') : '');
    const [dateFocused, setDateFocused] = useState(false);
    const [timeFocused, setTimeFocused] = useState(false);
    const dateRef = useRef(null);
    const timeRef = useRef(null);

    useEffect(() => {
        if (!value) { setDateVal(''); setTimeVal(''); }
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

export default function Show({ contact }) {
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
                    <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
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
                        <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
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
                    <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
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
                    <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
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
                </div>
            </div>
        </AppLayout>
    );
}
