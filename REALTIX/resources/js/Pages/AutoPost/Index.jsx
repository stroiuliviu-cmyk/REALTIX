import { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── constants ────────────────────────────────────────────────────────────────
const PLATFORM_META = {
    '999md':         { label: '999.md',        icon: '🏠', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    'facebook':      { label: 'Facebook',       icon: '📘', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'olx':           { label: 'OLX',            icon: '🛒', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    'imobiliare_md': { label: 'Imobiliare.md',  icon: '🏡', color: 'bg-green-100 text-green-700 border-green-200' },
};

const STATUS_CFG = {
    pending:   { label: 'Așteptare aprobare', bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '⏳' },
    approved:  { label: 'Aprobat',            bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
    rejected:  { label: 'Respins',            bg: 'bg-red-100',     text: 'text-red-600',     icon: '✕' },
    posted:    { label: 'Publicat',           bg: 'bg-blue-100',    text: 'text-blue-700',    icon: '🌐' },
    scheduled: { label: 'Programat',          bg: 'bg-purple-100',  text: 'text-purple-700',  icon: '🕐' },
    failed:    { label: 'Eroare',             bg: 'bg-red-100',     text: 'text-red-600',     icon: '⚠' },
    removed:   { label: 'Retras',             bg: 'bg-slate-100',   text: 'text-slate-500',   icon: '🗑' },
};

// ── small components ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span>{cfg.icon}</span>{cfg.label}
        </span>
    );
}

function PlatformChip({ platform }) {
    const m = PLATFORM_META[platform] ?? { label: platform, icon: '🌐', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${m.color}`}>
            {m.icon} {m.label}
        </span>
    );
}

// ── New request modal ─────────────────────────────────────────────────────────
function NewRequestModal({ properties, platforms, onClose }) {
    const [propertyId, setPropertyId] = useState('');
    const [selected,   setSelected]   = useState(['999md']);
    const [watermark,  setWatermark]  = useState(true);
    const [processing, setProcessing] = useState(false);
    const { errors } = usePage().props;

    const togglePlatform = p => setSelected(s => s.includes(p) ? s.filter(x => x !== p) : [...s, p]);

    const submit = () => {
        if (!propertyId || !selected.length) return;
        setProcessing(true);
        router.post('/autopost', { property_id: propertyId, platforms: selected, watermark }, {
            onFinish: () => { setProcessing(false); onClose(); },
        });
    };

    const property = properties.find(p => p.id === parseInt(propertyId));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 text-lg">📤 Cerere publicare nouă</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
                </div>
                <div className="p-6 space-y-5">
                    {/* Property */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Proprietate *</label>
                        <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                            <option value="">— Selectează —</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.title} — {p.city}{p.price ? ` — €${Number(p.price).toLocaleString('ro')}` : ''}
                                </option>
                            ))}
                        </select>
                        {properties.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">Nu ai proprietăți active. Adaugă una mai întâi.</p>
                        )}
                    </div>

                    {/* Property preview */}
                    {property && (
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 flex gap-3 items-center">
                            <span className="text-2xl">🏠</span>
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">{property.title}</p>
                                <p className="text-xs text-slate-500">{property.city}{property.price ? ` · €${Number(property.price).toLocaleString('ro')}` : ''}</p>
                            </div>
                        </div>
                    )}

                    {/* Platforms */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Platforme *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {platforms.map(p => {
                                const m = PLATFORM_META[p];
                                const active = selected.includes(p);
                                return (
                                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors text-left ${
                                            active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}>
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                                            active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                                        }`}>{active ? '✓' : ''}</span>
                                        {m.icon} {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Watermark toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <button type="button" onClick={() => setWatermark(w => !w)}
                            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${watermark ? 'bg-blue-600' : 'bg-slate-200'}`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${watermark ? 'left-5' : 'left-1'}`} />
                        </button>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Aplică watermark pe fotografii</p>
                            <p className="text-xs text-slate-400">Adaugă logo-ul agenției pe fiecare foto</p>
                        </div>
                    </label>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button onClick={submit} disabled={processing || !propertyId || !selected.length}
                        className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50">
                        {processing ? 'Se trimite…' : '📤 Trimite spre aprobare'}
                    </button>
                    <button onClick={onClose}
                        className="px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors">
                        Anulează
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ requestId, onClose }) {
    const [note, setNote]       = useState('');
    const [processing, setProc] = useState(false);

    const submit = () => {
        if (!note.trim()) return;
        setProc(true);
        router.post(`/autopost/${requestId}/reject`, { note }, {
            onFinish: () => { setProc(false); onClose(); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">✕ Respinge cererea</h3>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                        Observație pentru agent *
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                        placeholder="ex: Fotografii de calitate slabă, te rog reîncarcă..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none" />
                </div>
                <div className="flex gap-3">
                    <button onClick={submit} disabled={processing || !note.trim()}
                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
                        {processing ? 'Se trimite…' : 'Respinge'}
                    </button>
                    <button onClick={onClose}
                        className="px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors">
                        Înapoi
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Approve modal ──────────────────────────────────────────────────────────────
function ApproveModal({ req, allPlatforms, onClose }) {
    const [platforms,   setPlatforms]   = useState(req.platforms ?? []);
    const [scheduledAt, setScheduledAt] = useState('');
    const [processing,  setProc]        = useState(false);

    const toggle = p => setPlatforms(s => s.includes(p) ? s.filter(x => x !== p) : [...s, p]);

    const submit = () => {
        setProc(true);
        router.post(`/autopost/${req.id}/approve`, {
            platforms,
            scheduled_at: scheduledAt || null,
        }, { onFinish: () => { setProc(false); onClose(); } });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <h3 className="font-bold text-slate-900 text-lg">✓ Aprobă publicarea</h3>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-800 text-sm">{req.property?.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{req.property?.city} · Agent: {req.user?.name}</p>
                </div>

                {/* Platforms */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Platforme</label>
                    <div className="grid grid-cols-2 gap-2">
                        {allPlatforms.map(p => {
                            const m = PLATFORM_META[p];
                            const active = platforms.includes(p);
                            return (
                                <button key={p} type="button" onClick={() => toggle(p)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                        active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                                    }`}>
                                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                                        active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                                    }`}>{active ? '✓' : ''}</span>
                                    {m.icon} {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Scheduler */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                        🕐 Programează publicarea (opțional)
                    </label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    <p className="text-[11px] text-slate-400 mt-1">Lasă gol pentru publicare imediată</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={submit} disabled={processing || !platforms.length}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
                        {processing ? 'Se procesează…' : (scheduledAt ? '🕐 Programează' : '✓ Aprobă și publică')}
                    </button>
                    <button onClick={onClose}
                        className="px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors">
                        Anulează
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Request card ──────────────────────────────────────────────────────────────
function RequestCard({ req, isAdmin, platforms, onApprove, onReject }) {
    const [cancelling, setCancelling] = useState(false);
    const [removing,   setRemoving]   = useState(false);

    const cancel = () => {
        if (!confirm('Anulezi această cerere?')) return;
        setCancelling(true);
        router.delete(`/autopost/${req.id}`, { onFinish: () => setCancelling(false) });
    };

    const removeAll = () => {
        if (!confirm('Retragi anunțul de pe toate platformele?')) return;
        setRemoving(true);
        router.post(`/autopost/${req.id}/remove`, {}, { onFinish: () => setRemoving(false) });
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {req.property?.cover
                        ? <img src={`/storage/${req.property.cover}`} className="w-12 h-12 rounded-xl object-cover shrink-0" alt="" />
                        : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">🏠</div>
                    }
                    <div>
                        <p className="font-semibold text-slate-900 text-sm">{req.property?.title ?? '—'}</p>
                        <p className="text-xs text-slate-400">
                            {req.property?.city}
                            {req.property?.price ? ` · €${Number(req.property.price).toLocaleString('ro')}` : ''}
                            {isAdmin && req.user ? ` · ${req.user.name}` : ''}
                        </p>
                    </div>
                </div>
                <StatusBadge status={req.status} />
            </div>

            {/* Platforms + meta chips */}
            <div className="flex flex-wrap gap-1.5">
                {req.platforms?.map(p => <PlatformChip key={p} platform={p} />)}
                {req.watermark && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        💧 Watermark
                    </span>
                )}
                {req.scheduled_at && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                        🕐 {new Date(req.scheduled_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Platform results log */}
            {Object.keys(req.platform_results ?? {}).length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
                    {Object.entries(req.platform_results).map(([platform, result]) => {
                        const m = PLATFORM_META[platform] ?? { label: platform, icon: '🌐' };
                        return (
                            <div key={platform} className="flex items-center gap-2 text-xs">
                                <span className="shrink-0">{m.icon} {m.label}</span>
                                {result.status === 'posted' && (
                                    <a href={result.url} target="_blank" rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate">↗ Vezi anunț</a>
                                )}
                                {result.status === 'failed' && <span className="text-red-500">⚠ {result.error}</span>}
                                {result.status === 'removed' && <span className="text-slate-400">retras</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Admin note (rejection reason) */}
            {req.admin_note && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">
                    <span className="font-bold">Observație: </span>{req.admin_note}
                </div>
            )}

            {/* Timestamps */}
            <p className="text-[11px] text-slate-400">
                Cerut: {new Date(req.created_at).toLocaleDateString('ro-RO')}
                {req.posted_at ? ` · Publicat: ${new Date(req.posted_at).toLocaleDateString('ro-RO')}` : ''}
            </p>

            {/* Actions */}
            {(isAdmin && (req.status === 'pending' || req.status === 'posted')) || (!isAdmin && req.status === 'pending') ? (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    {isAdmin && req.status === 'pending' && (
                        <>
                            <button onClick={() => onApprove(req)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold transition-colors">
                                ✓ Aprobă
                            </button>
                            <button onClick={() => onReject(req.id)}
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 text-xs font-semibold transition-colors">
                                ✕ Respinge
                            </button>
                        </>
                    )}
                    {isAdmin && req.status === 'posted' && (
                        <button onClick={removeAll} disabled={removing}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50">
                            🗑 {removing ? 'Se retrage…' : 'Retrage de pretutindeni'}
                        </button>
                    )}
                    {!isAdmin && req.status === 'pending' && (
                        <button onClick={cancel} disabled={cancelling}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50">
                            {cancelling ? 'Se anulează…' : '× Anulează cererea'}
                        </button>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AutoPostIndex({ requests = [], properties = [], isAdmin = false, pendingCount = 0, platforms = [] }) {
    const { flash }                    = usePage().props;
    const [showForm,     setShowForm]  = useState(false);
    const [rejectId,     setRejectId]  = useState(null);
    const [approveReq,   setApprove]   = useState(null);
    const [statusFilter, setFilter]    = useState('all');

    const statusCounts = requests.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
    const pending      = requests.filter(r => r.status === 'pending');
    const filtered     = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);

    return (
        <AppLayout title="Autopostare">
            <Head title="Autopostare" />

            {flash?.success && (
                <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800">
                    ✓ {flash.success}
                </div>
            )}

            {showForm   && <NewRequestModal properties={properties} platforms={platforms} onClose={() => setShowForm(false)} />}
            {rejectId   && <RejectModal requestId={rejectId} onClose={() => setRejectId(null)} />}
            {approveReq && <ApproveModal req={approveReq} allPlatforms={platforms} onClose={() => setApprove(null)} />}

            <div className="max-w-5xl space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            📤 Autopostare
                            {pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                                    {pendingCount}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Publică anunțuri pe platforme externe cu aprobare prealabilă din partea adminului.
                        </p>
                    </div>
                    {!isAdmin && (
                        <button onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-sm font-semibold shadow transition-colors">
                            + Cerere nouă
                        </button>
                    )}
                </div>

                {/* Admin pending queue */}
                {isAdmin && pending.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {pending.length}
                            </span>
                            Cereri care așteaptă aprobare
                        </h2>
                        {pending.map(r => (
                            <RequestCard key={r.id} req={r} isAdmin platforms={platforms}
                                onApprove={setApprove} onReject={setRejectId} />
                        ))}
                    </div>
                )}

                {/* Stats */}
                {requests.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { k: 'pending',   l: 'În așteptare', c: 'text-amber-600' },
                            { k: 'posted',    l: 'Publicate',    c: 'text-blue-600' },
                            { k: 'rejected',  l: 'Respinse',     c: 'text-red-600' },
                            { k: 'scheduled', l: 'Programate',   c: 'text-purple-600' },
                        ].map(s => (
                            <div key={s.k} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                                <p className={`text-2xl font-bold ${s.c}`}>{statusCounts[s.k] ?? 0}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                {requests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {[
                            { v: 'all',       l: 'Toate' },
                            { v: 'pending',   l: 'Așteptare' },
                            { v: 'posted',    l: 'Publicate' },
                            { v: 'scheduled', l: 'Programate' },
                            { v: 'rejected',  l: 'Respinse' },
                        ].map(f => (
                            <button key={f.v} onClick={() => setFilter(f.v)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                    statusFilter === f.v
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}>
                                {f.l}{f.v !== 'all' && statusCounts[f.v] ? ` (${statusCounts[f.v]})` : ''}
                            </button>
                        ))}
                    </div>
                )}

                {/* List */}
                {filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map(r => (
                            <RequestCard key={r.id} req={r} isAdmin={isAdmin} platforms={platforms}
                                onApprove={setApprove} onReject={setRejectId} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-4xl border border-slate-100 shadow-xl p-16 text-center">
                        <div className="text-5xl mb-4">📤</div>
                        <p className="font-bold text-slate-700 mb-2">Nicio cerere de publicare</p>
                        <p className="text-sm text-slate-400 mb-6">
                            {!isAdmin ? 'Selectează o proprietate activă și trimite spre aprobare.' : 'Nu există cereri momentan.'}
                        </p>
                        {!isAdmin && (
                            <button onClick={() => setShowForm(true)}
                                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-sm font-semibold shadow transition-colors">
                                + Cerere nouă
                            </button>
                        )}
                    </div>
                )}

                {/* Platform cards */}
                <div>
                    <h2 className="font-bold text-slate-700 text-sm mb-3">Platforme disponibile</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(PLATFORM_META).map(([key, m]) => (
                            <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                                <div className="text-3xl mb-1.5">{m.icon}</div>
                                <p className="font-semibold text-slate-700 text-sm">{m.label}</p>
                                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
                                    Disponibil
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
