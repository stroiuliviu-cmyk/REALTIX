import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// ── constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
    viewing:  'bg-blue-100 text-blue-700',
    meeting:  'bg-purple-100 text-purple-700',
    call:     'bg-amber-100 text-amber-700',
    contract: 'bg-emerald-100 text-emerald-700',
    task:     'bg-rose-100 text-rose-700',
    other:    'bg-slate-100 text-slate-600',
};

const TYPE_ICONS = {
    viewing:  '🏠',
    meeting:  '🤝',
    call:     '📞',
    contract: '📄',
    task:     '✅',
    other:    '📌',
};

const TYPE_LABELS = {
    viewing:  'Vizionare',
    meeting:  'Întâlnire',
    call:     'Apel',
    contract: 'Contract',
    task:     'Sarcină',
    other:    'Altele',
};

const STATUS_INFO = {
    liked:    { label: '👍 Plăcut',     cls: 'bg-emerald-100 text-emerald-700' },
    thinking: { label: '🤔 Se gândesc', cls: 'bg-amber-100 text-amber-700' },
    rejected: { label: '👎 Refuz',      cls: 'bg-red-100 text-red-600' },
    no_show:  { label: '🚫 N-au venit', cls: 'bg-slate-100 text-slate-500' },
    done:     { label: '✅ Realizat',   cls: 'bg-emerald-100 text-emerald-700' },
    pending:  { label: 'În așteptare',  cls: 'bg-slate-100 text-slate-500' },
};

const MONTH_NAMES = [
    'Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
    'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie',
];

const INPUT_CLS = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white';
const LABEL_CLS = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

// ── helpers ───────────────────────────────────────────────────────────────────

function localNow() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function toDateStr(d) {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function toTimeStr(d) {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ro', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(events) {
    return events.reduce((acc, ev) => {
        const day = ev.starts_at.slice(0, 10);
        (acc[day] = acc[day] || []).push(ev);
        return acc;
    }, {});
}

// ── SearchSelect ──────────────────────────────────────────────────────────────

function SearchSelect({ options, value, onChange, placeholder, renderRow, disabled }) {
    const [query, setQuery] = useState('');
    const [open, setOpen]   = useState(false);
    const selected = options.find(o => String(o.id) === String(value));

    const filtered = options.filter(o => {
        if (!query) return true;
        return renderRow(o).text.toLowerCase().includes(query.toLowerCase());
    }).slice(0, 8);

    return (
        <div className="relative">
            <input
                className={INPUT_CLS + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
                value={selected ? renderRow(selected).text : query}
                placeholder={placeholder}
                disabled={disabled}
                onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    <div
                        onMouseDown={() => { onChange(''); setQuery(''); setOpen(false); }}
                        className="px-4 py-2 text-xs text-slate-400 hover:bg-slate-50 cursor-pointer"
                    >
                        — Niciun/nicio
                    </div>
                    {filtered.map(o => {
                        const r = renderRow(o);
                        return (
                            <div
                                key={o.id}
                                onMouseDown={() => { onChange(o.id); setQuery(''); setOpen(false); }}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer"
                            >
                                <div className="text-sm font-semibold text-slate-800">{r.text}</div>
                                {r.sub && <div className="text-xs text-slate-400 mt-0.5">{r.sub}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── EventFormModal ────────────────────────────────────────────────────────────

function EventFormModal({ event, contacts, properties, allEvents, prefillDate, onClose }) {
    const isEdit = !!event?.id;

    const [title, setTitle]       = useState(event?.title ?? '');
    const [type, setType]         = useState(event?.type ?? 'viewing');
    const [evDate, setEvDate]     = useState(event ? toDateStr(event.starts_at) : (prefillDate ?? ''));
    const [startTime, setStart]   = useState(event ? toTimeStr(event.starts_at) : localNow());
    const [endTime, setEnd]       = useState(event?.ends_at ? toTimeStr(event.ends_at) : '');
    const [allDay, setAllDay]     = useState(event?.all_day ?? false);
    const [contactId, setContact] = useState(event?.contact_id ? String(event.contact_id) : '');
    const [propId, setProp]       = useState(event?.property_id ? String(event.property_id) : '');
    const [desc, setDesc]         = useState(event?.description ?? '');
    const [saving, setSaving]     = useState(false);
    const [conflict, setConflict] = useState(null);

    // Overlap detection
    useEffect(() => {
        if (!evDate || !startTime) { setConflict(null); return; }
        const starts = new Date(`${evDate}T${startTime}`);
        const newEnd = evDate && endTime
            ? new Date(`${evDate}T${endTime}`)
            : new Date(starts.getTime() + 3600000);

        const hit = allEvents.find(ev => {
            if (ev.id === event?.id) return false;
            const evStart = new Date(ev.starts_at);
            const evEnd   = ev.ends_at ? new Date(ev.ends_at) : new Date(evStart.getTime() + 3600000);
            return starts < evEnd && newEnd > evStart;
        });
        setConflict(hit ?? null);
    }, [evDate, startTime, endTime]);

    const submit = e => {
        e.preventDefault();
        setSaving(true);
        const starts_at = allDay ? `${evDate}T00:00` : `${evDate}T${startTime || '10:00'}`;
        const ends_at   = !allDay && endTime ? `${evDate}T${endTime}` : null;
        const payload   = { title, type, starts_at, ends_at, all_day: allDay,
                            contact_id: contactId || null, property_id: propId || null, description: desc || null };

        const opts = { onFinish: () => setSaving(false), onSuccess: () => onClose() };
        isEdit
            ? router.patch(route('calendar.update', event.id), payload, opts)
            : router.post(route('calendar.store'), payload, opts);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
                <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {isEdit ? 'Editează eveniment' : 'Eveniment nou'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                </div>

                <form onSubmit={submit} className="overflow-y-auto px-8 py-6 space-y-4 grow">
                    {/* Title */}
                    <div>
                        <label className={LABEL_CLS}>Titlu *</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            placeholder="ex. Vizionare apartament Botanica"
                            className={INPUT_CLS}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className={LABEL_CLS}>Tip eveniment</label>
                        <select value={type} onChange={e => setType(e.target.value)} className={INPUT_CLS}>
                            {Object.entries(TYPE_LABELS).map(([k, l]) => (
                                <option key={k} value={k}>{TYPE_ICONS[k]} {l}</option>
                            ))}
                        </select>
                    </div>

                    {/* All day toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                            onClick={() => setAllDay(!allDay)}
                            className={`w-10 h-6 rounded-full transition-colors ${allDay ? 'bg-blue-600' : 'bg-slate-200'} relative`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${allDay ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className="text-sm text-slate-600">Tot ziua</span>
                    </label>

                    {/* Date + time */}
                    <div className={`grid gap-3 ${allDay ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        <div className={allDay ? '' : 'col-span-1'}>
                            <label className={LABEL_CLS}>Data *</label>
                            <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} required className={INPUT_CLS} />
                        </div>
                        {!allDay && (
                            <>
                                <div>
                                    <label className={LABEL_CLS}>Start</label>
                                    <input type="time" value={startTime} onChange={e => setStart(e.target.value)} className={INPUT_CLS} />
                                </div>
                                <div>
                                    <label className={LABEL_CLS}>Sfârșit</label>
                                    <input type="time" value={endTime} onChange={e => setEnd(e.target.value)} className={INPUT_CLS} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Overlap warning */}
                    {conflict && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                            ⚠️ Suprapunere cu: <strong>{conflict.title}</strong> la {fmtTime(conflict.starts_at)}
                        </div>
                    )}

                    {/* Contact */}
                    <div>
                        <label className={LABEL_CLS}>
                            Client / Contact <span className="font-normal normal-case text-slate-400">(opțional)</span>
                        </label>
                        <SearchSelect
                            options={contacts}
                            value={contactId}
                            onChange={setContact}
                            placeholder="Caută după nume sau telefon…"
                            renderRow={c => ({
                                text: [c.first_name, c.last_name].filter(Boolean).join(' '),
                                sub:  c.phone,
                            })}
                        />
                    </div>

                    {/* Property — only for viewing/contract */}
                    {(type === 'viewing' || type === 'contract') && (
                        <div>
                            <label className={LABEL_CLS}>
                                Proprietate <span className="font-normal normal-case text-slate-400">(opțional)</span>
                            </label>
                            <SearchSelect
                                options={properties}
                                value={propId}
                                onChange={setProp}
                                placeholder="Caută după titlu sau adresă…"
                                renderRow={p => ({
                                    text: p.title ?? `#${p.id}`,
                                    sub:  [p.address, p.city].filter(Boolean).join(', '),
                                })}
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className={LABEL_CLS}>Note / descriere</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            placeholder="Detalii suplimentare…"
                            className={INPUT_CLS + ' resize-none'}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            Anulează
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                            {saving ? 'Se salvează…' : (isEdit ? 'Salvează' : 'Adaugă')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── EventDetailPanel ──────────────────────────────────────────────────────────

function EventDetailPanel({ event, onClose, onEdit, onDelete, onStatusUpdate }) {
    const now          = new Date();
    const isPast       = new Date(event.starts_at) < now;
    const needFeedback = event.type === 'viewing' && isPast && event.status === 'pending';
    const isTask       = event.type === 'task';
    const [confirming, setConfirming] = useState(false);

    return (
        <div className="bg-white rounded-4xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-4 gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_COLORS[event.type] ?? 'bg-slate-100'}`}>
                    {TYPE_ICONS[event.type]} {TYPE_LABELS[event.type] ?? event.type}
                </span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">{event.title}</h3>

            {/* Status badge for completed */}
            {event.status !== 'pending' && STATUS_INFO[event.status] && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mb-2 ${STATUS_INFO[event.status].cls}`}>
                    {STATUS_INFO[event.status].label}
                </span>
            )}

            {/* Date/time */}
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{fmtDate(event.starts_at)}{!event.all_day ? `, ${fmtTime(event.starts_at)}` : ''}</span>
                </div>
                {event.ends_at && !event.all_day && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs ml-6">
                        → {fmtTime(event.ends_at)}
                    </div>
                )}
                {event.contact && (
                    <div className="flex items-center gap-2">
                        <span>👤</span>
                        <a href={`/contacts/${event.contact_id}`} className="text-blue-700 hover:underline font-medium">
                            {event.contact.first_name} {event.contact.last_name ?? ''}
                        </a>
                    </div>
                )}
                {event.property && (
                    <div className="flex items-center gap-2">
                        <span>🏠</span>
                        <a href={`/properties/${event.property_id}`} className="text-blue-700 hover:underline font-medium truncate">
                            {event.property.title}
                        </a>
                    </div>
                )}
                {event.google_event_id && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>📅</span> Sincronizat cu Google
                    </div>
                )}
            </div>

            {event.description && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-2xl p-3 whitespace-pre-wrap">
                    {event.description}
                </p>
            )}

            {/* Post-viewing feedback */}
            {needFeedback && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cum a mers vizionarea?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v: 'liked',    l: '👍 Plăcut',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                            { v: 'thinking', l: '🤔 Se gândesc', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                            { v: 'rejected', l: '👎 Refuz',      cls: 'bg-red-50 text-red-600 border-red-200' },
                            { v: 'no_show',  l: '🚫 N-au venit', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
                        ].map(s => (
                            <button
                                key={s.v}
                                onClick={() => onStatusUpdate(event.id, s.v)}
                                className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${s.cls} hover:opacity-80 transition-opacity`}
                            >
                                {s.l}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Task done toggle */}
            {isTask && (
                <div className="mt-4">
                    <button
                        onClick={() => onStatusUpdate(event.id, event.status === 'done' ? 'pending' : 'done')}
                        className={`w-full rounded-2xl border py-2 text-sm font-semibold transition-colors ${
                            event.status === 'done'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {event.status === 'done' ? '✅ Realizat — Marchează ca nerealizat' : '⬜ Marchează ca realizat'}
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
                <button onClick={() => onEdit(event)}
                    className="flex-1 rounded-2xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    ✏ Editează
                </button>
                {confirming ? (
                    <button onClick={() => onDelete(event.id)}
                        className="flex-1 rounded-2xl bg-red-600 py-2 text-xs font-semibold text-white">
                        Sigur?
                    </button>
                ) : (
                    <button onClick={() => setConfirming(true)} onBlur={() => setTimeout(() => setConfirming(false), 1500)}
                        className="flex-1 rounded-2xl border border-red-100 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                        Șterge
                    </button>
                )}
            </div>
        </div>
    );
}

// ── EventCard (mini) ──────────────────────────────────────────────────────────

function EventCard({ event, onClick, compact }) {
    const statusBadge = event.status !== 'pending' ? STATUS_INFO[event.status] : null;
    return (
        <div
            onClick={onClick}
            className="p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md cursor-pointer transition-all"
        >
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${TYPE_COLORS[event.type] ?? 'bg-slate-100'}`}>
                    {TYPE_ICONS[event.type]} {compact ? '' : TYPE_LABELS[event.type]}
                </span>
                <div className="flex items-center gap-1">
                    {statusBadge && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>
                            {statusBadge.label.split(' ')[0]}
                        </span>
                    )}
                    {event.google_event_id && <span className="text-xs text-slate-300">📅</span>}
                </div>
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
            {!event.all_day && (
                <p className="text-xs text-slate-400 mt-0.5">{fmtTime(event.starts_at)}{event.ends_at ? ` → ${fmtTime(event.ends_at)}` : ''}</p>
            )}
            {event.contact && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">👤 {event.contact.first_name} {event.contact.last_name ?? ''}</p>
            )}
        </div>
    );
}

// ── MonthGrid ─────────────────────────────────────────────────────────────────

function MonthGrid({ year, month, events, selectedDay, onDayClick, onEventClick }) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const today       = new Date();

    const eventsForDay = day => {
        const d = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        return events.filter(e => e.starts_at.startsWith(d));
    };

    return (
        <div className="bg-white rounded-4xl shadow-xl border border-slate-100 p-5">
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dum','Lun','Mar','Mie','Joi','Vin','Sâm'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`pre${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayEvts = eventsForDay(day);
                    const isToday = today.getDate() === day && today.getMonth() === month - 1 && today.getFullYear() === year;
                    const isSel   = selectedDay === day;
                    return (
                        <div
                            key={day}
                            onClick={() => onDayClick(day)}
                            className={`min-h-18 p-1 rounded-xl border cursor-pointer transition-colors ${
                                isToday ? 'bg-blue-700 border-blue-700 text-white' :
                                isSel   ? 'bg-blue-50 border-blue-300' :
                                          'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                            <span className={`text-xs font-bold ${isToday ? 'text-white' : ''}`}>{day}</span>
                            <div className="mt-0.5 space-y-0.5">
                                {dayEvts.slice(0, 2).map(ev => (
                                    <div
                                        key={ev.id}
                                        onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                                        className={`text-xs px-1 py-0.5 rounded-md truncate leading-snug ${TYPE_COLORS[ev.type] ?? 'bg-slate-100 text-slate-600'}`}
                                        title={ev.title}
                                    >
                                        {TYPE_ICONS[ev.type]} {ev.title}
                                    </div>
                                ))}
                                {dayEvts.length > 2 && (
                                    <div className={`text-xs pl-1 ${isToday ? 'text-blue-200' : 'text-slate-400'}`}>
                                        +{dayEvts.length - 2}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── AgendaView ────────────────────────────────────────────────────────────────

function AgendaView({ events, onEventClick }) {
    const grouped = groupByDay(events);
    const today   = new Date().toISOString().slice(0, 10);

    return (
        <div className="bg-white rounded-4xl shadow-xl border border-slate-100 p-6 space-y-5">
            {events.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Niciun eveniment în această lună.</p>
            )}
            {Object.entries(grouped).map(([date, dayEvts]) => {
                const isPast = date < today;
                return (
                    <div key={date}>
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isPast ? 'text-slate-300' : 'text-slate-500'}`}>
                            {date === today ? '🟢 Azi — ' : ''}
                            {new Date(date + 'T12:00:00').toLocaleDateString('ro', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        <div className="space-y-2 pl-1 border-l-2 border-slate-100 ml-1">
                            {dayEvts.map(ev => (
                                <EventCard key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── EventListPanel (right sidebar) ────────────────────────────────────────────

function EventListPanel({ events, selectedDay, month, year, onEventClick, onAddClick }) {
    const displayed = selectedDay
        ? events.filter(e => e.starts_at.startsWith(
            `${year}-${String(month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
          ))
        : events.slice(0, 12);

    const heading = selectedDay
        ? `${selectedDay} ${MONTH_NAMES[month - 1]} ${year}`
        : `Toate evenimentele (${events.length})`;

    return (
        <div className="bg-white rounded-4xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">{heading}</h3>
                {selectedDay && (
                    <button
                        onClick={onAddClick}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                        + Adaugă
                    </button>
                )}
            </div>
            {displayed.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm text-slate-400">Niciun eveniment</p>
                    {selectedDay && (
                        <button onClick={onAddClick}
                            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                            + Eveniment nou
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {displayed.map(ev => (
                        <EventCard key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── GoogleSyncBanner ──────────────────────────────────────────────────────────

function GoogleSyncBanner({ connected, syncing, onSync }) {
    if (!connected) return null;
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-sm">
            <span>📅</span>
            <span className="text-blue-700 font-semibold flex-1">Google Calendar conectat</span>
            <button
                onClick={onSync}
                disabled={syncing}
                className="rounded-xl bg-blue-700 text-white px-4 py-1.5 text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
                {syncing ? '⏳ Sincronizez…' : '🔄 Sincronizează'}
            </button>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Index({ events = [], month, year, googleConnected = false, contacts = [], properties = [] }) {
    const { flash }  = usePage().props;

    const [view, setView]             = useState('month'); // 'month' | 'agenda'
    const [selectedDay, setSelDay]    = useState(null);
    const [selectedEvent, setSelEvt]  = useState(null);
    const [formEvent, setFormEvent]   = useState(null);  // null=closed, {}=new, obj=edit
    const [prefillDate, setPrefill]   = useState('');
    const [syncing, setSyncing]       = useState(false);

    const navigate = (dir) => {
        let m = month + dir;
        let y = year;
        if (m < 1)  { m = 12; y--; }
        if (m > 12) { m = 1;  y++; }
        router.get('/calendar', { month: m, year: y }, { preserveState: false });
    };

    const goToday = () => {
        const n = new Date();
        router.get('/calendar', { month: n.getMonth() + 1, year: n.getFullYear() }, { preserveState: false });
    };

    const handleSync = () => {
        setSyncing(true);
        router.post(route('google.calendar.sync'), {}, { onFinish: () => setSyncing(false) });
    };

    const handleDayClick = (day) => {
        setSelDay(day === selectedDay ? null : day);
        setSelEvt(null);
    };

    const handleEventClick = (ev) => {
        setSelEvt(ev);
        setSelDay(null);
    };

    const handleAddClick = (prefDate) => {
        setPrefill(prefDate ?? (selectedDay
            ? `${year}-${String(month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
            : ''));
        setFormEvent({});
    };

    const handleDelete = (id) => {
        router.delete(route('calendar.destroy', id), { preserveScroll: true, onSuccess: () => setSelEvt(null) });
    };

    const handleStatusUpdate = (id, status) => {
        router.patch(route('calendar.status', id), { status }, {
            preserveScroll: true,
            onSuccess: () => {
                const updated = events.find(e => e.id === id);
                if (updated) setSelEvt({ ...updated, status });
            },
        });
    };

    return (
        <AppLayout title="Calendar">
            <Head title="Calendar" />

            {formEvent !== null && (
                <EventFormModal
                    event={Object.keys(formEvent).length ? formEvent : null}
                    contacts={contacts}
                    properties={properties}
                    allEvents={events}
                    prefillDate={prefillDate}
                    onClose={() => { setFormEvent(null); setPrefill(''); }}
                />
            )}

            <div className="space-y-4">
                {/* Flash */}
                {flash?.success && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {/* Google banner */}
                <GoogleSyncBanner connected={googleConnected} syncing={syncing} onSync={handleSync} />

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">
                            ‹
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 w-44 text-center">
                            {MONTH_NAMES[month - 1]} {year}
                        </h2>
                        <button onClick={() => navigate(1)}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">
                            ›
                        </button>
                        <button onClick={goToday}
                            className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 ml-1">
                            Azi
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs">
                            {[['month','📅 Lună'],['agenda','📋 Agendă']].map(([v, l]) => (
                                <button
                                    key={v}
                                    onClick={() => { setView(v); setSelDay(null); setSelEvt(null); }}
                                    className={`px-3 py-1.5 font-semibold transition-colors ${
                                        view === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handleAddClick()}
                            className="rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                            + Eveniment
                        </button>
                    </div>
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                        {view === 'month' ? (
                            <MonthGrid
                                year={year}
                                month={month}
                                events={events}
                                selectedDay={selectedDay}
                                onDayClick={handleDayClick}
                                onEventClick={handleEventClick}
                            />
                        ) : (
                            <AgendaView events={events} onEventClick={handleEventClick} />
                        )}
                    </div>

                    <div>
                        {selectedEvent ? (
                            <EventDetailPanel
                                event={selectedEvent}
                                onClose={() => setSelEvt(null)}
                                onEdit={ev => { setFormEvent(ev); setSelEvt(null); }}
                                onDelete={handleDelete}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        ) : (
                            <EventListPanel
                                events={events}
                                selectedDay={selectedDay}
                                month={month}
                                year={year}
                                onEventClick={handleEventClick}
                                onAddClick={() => handleAddClick()}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
