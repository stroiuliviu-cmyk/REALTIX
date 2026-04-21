import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const typeColors = {
    viewing: 'bg-blue-100 text-blue-700',
    meeting: 'bg-purple-100 text-purple-700',
    call: 'bg-amber-100 text-amber-700',
    contract: 'bg-emerald-100 text-emerald-700',
    other: 'bg-slate-100 text-slate-600',
};

const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

export default function Index({ events, month, year }) {
    const [showModal, setShowModal] = useState(false);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const today = new Date();

    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('10:00');

    const { data, setData, post, processing, reset } = useForm({
        title: '', type: 'viewing', starts_at: '', ends_at: '',
        contact_id: '', property_id: '', description: '',
    });

    const eventsForDay = (day) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.starts_at.startsWith(dateStr));
    };

    const prevMonth = () => {
        const d = new Date(year, month - 2, 1);
        router.get('/calendar', { month: d.getMonth() + 1, year: d.getFullYear() });
    };

    const nextMonth = () => {
        const d = new Date(year, month, 1);
        router.get('/calendar', { month: d.getMonth() + 1, year: d.getFullYear() });
    };

    const submitEvent = (e) => {
        e.preventDefault();
        const combined = eventDate ? `${eventDate}T${eventTime || '10:00'}` : '';
        router.post('/calendar', {
            title: data.title,
            type: data.type,
            starts_at: combined,
            ends_at: data.ends_at || null,
            contact_id: data.contact_id || null,
            property_id: data.property_id || null,
            description: data.description || null,
        }, {
            onSuccess: () => {
                reset();
                setEventDate('');
                setEventTime('10:00');
                setShowModal(false);
            },
        });
    };

    return (
        <AppLayout title="Calendar">
            <Head title="Calendar" />

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6">Eveniment nou</h2>
                        <form onSubmit={submitEvent} className="space-y-4">
                            <input
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                placeholder="Titlu eveniment *"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                                required
                            />
                            <select
                                value={data.type}
                                onChange={e => setData('type', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                            >
                                <option value="viewing">Vizionare</option>
                                <option value="meeting">Întâlnire</option>
                                <option value="call">Apel</option>
                                <option value="contract">Contract</option>
                                <option value="other">Altele</option>
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Data *</label>
                                    <input
                                        type="date"
                                        value={eventDate}
                                        onChange={e => setEventDate(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Ora</label>
                                    <input
                                        type="time"
                                        value={eventTime}
                                        onChange={e => setEventTime(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={processing} className="flex-1 rounded-2xl bg-slate-900 py-3 text-white text-sm font-semibold disabled:opacity-50">
                                    {processing ? 'Se salvează...' : 'Adaugă'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm">
                                    Anulează
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar grid */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm">‹</button>
                            <h3 className="font-bold text-xl text-slate-900">{monthNames[month - 1]} {year}</h3>
                            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm">›</button>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-white text-sm hover:bg-slate-800"
                        >
                            + Eveniment
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'].map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const dayEvents = eventsForDay(day);
                            const isToday = today.getDate() === day && today.getMonth() === month - 1 && today.getFullYear() === year;
                            return (
                                <div
                                    key={day}
                                    className={`aspect-square p-1.5 flex flex-col rounded-xl border transition-colors ${
                                        isToday ? 'bg-blue-700 text-white border-blue-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <span className="font-bold text-sm">{day}</span>
                                    {dayEvents.length > 0 && (
                                        <div className={`w-2 h-2 rounded-full mt-auto ${isToday ? 'bg-white' : 'bg-emerald-500'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Today's events */}
                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100">
                    <h3 className="font-bold text-xl text-slate-900 mb-6">Evenimentele tale</h3>
                    {events.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-8">Niciun eveniment în această lună.</p>
                    ) : (
                        <div className="space-y-4">
                            {events.slice(0, 8).map(ev => (
                                <div key={ev.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-500">
                                            {new Date(ev.starts_at).toLocaleDateString('ro')} • {new Date(ev.starts_at).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColors[ev.type] ?? 'bg-slate-100'}`}>
                                            {ev.type}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                                    {ev.contact && (
                                        <p className="text-xs text-slate-500 mt-1">{ev.contact.first_name} {ev.contact.last_name}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
