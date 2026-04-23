import { useState, useEffect, useCallback } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── styles ─────────────────────────────────────────────────────────────────
const inputCls =
    'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white';
const selectCls = inputCls;

// ── constants ───────────────────────────────────────────────────────────────
const TYPES = [
    { value: 'apartment', label: 'Apartament', icon: '🏢' },
    { value: 'house',     label: 'Casă',       icon: '🏠' },
    { value: 'commercial',label: 'Comercial',  icon: '🏪' },
    { value: 'land',      label: 'Teren',      icon: '🌿' },
];
const TRANSACTIONS = [
    { value: 'sale',      label: 'Vânzare' },
    { value: 'rent',      label: 'Chirie' },
    { value: 'rent_short',label: 'Posut.' },
    { value: 'new_build', label: 'Construcție nouă' },
];
const CONDITIONS = [
    { value: '',                label: '— Nedefinit —' },
    { value: 'new',             label: 'Nou / fără renovare' },
    { value: 'renovated',       label: 'Cu renovare' },
    { value: 'needs_renovation',label: 'Necesită renovare' },
];
const FEATURES = [
    { key: 'furnished', label: 'Mobilat' },
    { key: 'parking',   label: 'Parcare' },
    { key: 'balcony',   label: 'Balcon / Terasă' },
    { key: 'ac',        label: 'Aer condiționat' },
    { key: 'elevator',  label: 'Lift' },
    { key: 'pets',      label: 'Animale permise' },
];
const TRACKED = ['title', 'type', 'transaction_type', 'city', 'price', 'area_total', 'rooms', 'address', 'district', 'description_ro'];

const AI_LOCALES = [{ v: 'ro', l: 'RO' }, { v: 'ru', l: 'RU' }, { v: 'en', l: 'EN' }];
const AI_STYLES  = [
    { v: 'short',    l: 'Scurt' },
    { v: 'detailed', l: 'Detaliat' },
    { v: 'formal',   l: 'Oficial' },
    { v: 'emotional',l: 'Emoțional' },
];

function csrfToken() {
    return document.head.querySelector('meta[name="csrf-token"]')?.content ?? '';
}

const EMPTY_META = {
    furnished: false, parking: false, balcony: false,
    ac: false, elevator: false, pets: false,
    condition: '', year_built: '', rental_purpose: 'long_term',
    video_url: '', contact_phone: '', contact_email: '',
};

// ── small components ─────────────────────────────────────────────────────────
function Field({ label, error, required, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function PillBtn({ active, onClick, children, small }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border font-medium transition-colors ${
                small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
            } ${
                active
                    ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
        >
            {children}
        </button>
    );
}

function Toggle({ active, onToggle, label }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
        >
            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${
                active ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
            }`}>{active ? '✓' : ''}</span>
            {label}
        </button>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-[15px]">{title}</h2>
            {children}
        </div>
    );
}

// ── completion helper ────────────────────────────────────────────────────────
function completion(data, photoCount) {
    const filled = TRACKED.filter(k => data[k] !== '' && data[k] !== null && data[k] !== undefined).length
        + (photoCount > 0 ? 1 : 0);
    const total = TRACKED.length + 1;
    return { filled, total, pct: Math.round((filled / total) * 100) };
}

// ── main component ───────────────────────────────────────────────────────────
export default function Create({ authUser = {} }) {
    const [data, setDataRaw] = useState({
        title: '', type: 'apartment', transaction_type: 'sale',
        price: '', currency: 'EUR',
        area_total: '', area_living: '',
        rooms: '', floor: '', floors_total: '',
        address: '', city: 'Chișinău', district: '',
        description_ro: '', status: 'active',
        meta: {
            ...EMPTY_META,
            contact_phone: authUser.phone ?? '',
            contact_email: authUser.email ?? '',
        },
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const [photoFiles, setPhotoFiles]     = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [coverIndex, setCoverIndex]     = useState(0);

    const [aiLocale,       setAiLocale]       = useState('ro');
    const [aiStyle,        setAiStyle]        = useState('detailed');
    const [aiDescLoading,  setAiDescLoading]  = useState(false);
    const [aiPriceLoading, setAiPriceLoading] = useState(false);
    const [aiDescResult,   setAiDescResult]   = useState(null);
    const [aiPriceResult,  setAiPriceResult]  = useState(null);
    const [aiError,        setAiError]        = useState('');
    const [aiVariant,      setAiVariant]      = useState(0);
    const [autoSaved,      setAutoSaved]      = useState(null);
    const [dragOver,       setDragOver]       = useState(false);

    const setData = (key, val) => setDataRaw(prev => ({ ...prev, [key]: val }));
    const setMeta = (key, val) => setData('meta', { ...data.meta, [key]: val });

    // ── autosave to localStorage every 30s ───────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => {
            localStorage.setItem('realtix_create_draft', JSON.stringify(data));
            setAutoSaved(new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
        }, 30_000);
        return () => clearInterval(id);
    }, [data]);

    // ── restore from localStorage on first mount ─────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem('realtix_create_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                setDataRaw(prev => ({ ...prev, ...parsed }));
            }
        } catch (_) {}
    }, []);

    // ── photo helpers ─────────────────────────────────────────────────────────
    const addPhotos = useCallback((fileList) => {
        const allowed = 15 - photoFiles.length;
        const newFiles = [...fileList].slice(0, allowed);
        setPhotoFiles(prev => [...prev, ...newFiles]);
        setPhotoPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    }, [photoFiles.length]);

    const removePhoto = useCallback((idx) => {
        URL.revokeObjectURL(photoPreviews[idx]);
        setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
        if (coverIndex >= idx && coverIndex > 0) setCoverIndex(c => c - 1);
    }, [photoPreviews, coverIndex]);

    // ── submit ────────────────────────────────────────────────────────────────
    const submit = (statusOverride, generateAi = '') => {
        setProcessing(true);
        const fd = new FormData();

        const scalar = { ...data, status: statusOverride || data.status };
        delete scalar.meta;

        Object.entries(scalar).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') fd.append(k, v);
        });

        Object.entries(data.meta).forEach(([k, v]) => {
            fd.append(`meta[${k}]`, typeof v === 'boolean' ? (v ? '1' : '0') : (v ?? ''));
        });

        photoFiles.forEach(f => fd.append('photos[]', f));
        fd.append('cover_index', coverIndex);
        if (generateAi) fd.append('generate_ai', generateAi);

        if (statusOverride !== 'draft' && generateAi === '') {
            localStorage.removeItem('realtix_create_draft');
        }

        router.post(route('properties.store'), fd, {
            forceFormData: true,
            onError: (errs) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    const aiPropertyData = {
        type: data.type, transaction_type: data.transaction_type,
        city: data.city, district: data.district,
        area_total: data.area_total, rooms: data.rooms,
        floor: data.floor, floors_total: data.floors_total,
        price: data.price, currency: data.currency,
        meta: data.meta,
    };

    const handleAiDescription = useCallback(async () => {
        if (!data.city) { setAiError('Completați cel puțin orașul pentru AI.'); return; }
        setAiDescLoading(true); setAiError('');
        try {
            const res = await fetch('/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ locale: aiLocale, style: aiStyle, data: aiPropertyData }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? `Eroare HTTP ${res.status}`);
            setAiDescResult(json);
            setAiVariant(c => c + 1);
            if (aiLocale === 'ro') setData('description_ro', json.description ?? '');
        } catch (e) {
            setAiError(e.message || 'Eroare la generare AI. Verificați cheia ANTHROPIC_API_KEY în .env.');
        } finally {
            setAiDescLoading(false);
        }
    }, [data.city, data.type, data.transaction_type, data.district, data.area_total, data.rooms, data.price, data.currency, data.meta, aiLocale, aiStyle]);

    const handleAiPrice = useCallback(async () => {
        if (!data.city) { setAiError('Completați cel puțin orașul pentru estimare.'); return; }
        setAiPriceLoading(true); setAiError('');
        try {
            const res = await fetch('/ai/estimate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ data: aiPropertyData }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? `Eroare HTTP ${res.status}`);
            setAiPriceResult(json);
        } catch (e) {
            setAiError(e.message || 'Eroare la estimare preț AI.');
        } finally {
            setAiPriceLoading(false);
        }
    }, [data.city, data.type, data.transaction_type, data.district, data.area_total, data.rooms, data.price, data.currency, data.meta]);

    const { filled, total, pct } = completion(data, photoFiles.length);
    const typeLabel = TYPES.find(t => t.value === data.type)?.label ?? '';
    const txLabel   = TRANSACTIONS.find(t => t.value === data.transaction_type)?.label ?? '';
    const isRent    = data.transaction_type === 'rent' || data.transaction_type === 'rent_short';

    return (
        <AppLayout title="Proprietate nouă">
            <Head title="Proprietate nouă" />

            {/* ── top action bar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Adaugă proprietate nouă</h1>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>
                            <span className={`font-semibold ${pct === 100 ? 'text-green-600' : 'text-blue-600'}`}>{filled}</span>
                            /{total} câmpuri completate
                        </span>
                        {autoSaved && <span className="text-slate-400">· Salvat local {autoSaved}</span>}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => submit('active')}
                        disabled={processing}
                        className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 py-2 text-sm font-semibold shadow transition-colors disabled:opacity-50"
                    >
                        {processing ? 'Se salvează…' : '✓ Salvează activ'}
                    </button>
                    <button
                        type="button"
                        onClick={() => submit('draft')}
                        disabled={processing}
                        className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                        Salvează schiță
                    </button>
                    <Link
                        href={route('properties.index')}
                        className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Anulează
                    </Link>
                </div>
            </div>

            {/* ── two-column layout ──────────────────────────────────────── */}
            <div className="flex gap-6 items-start">

                {/* ── LEFT: form ──────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-5">

                    {/* Section 1 — Basic info */}
                    <SectionCard title="Informații de bază">

                        {/* Type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Tip proprietate</label>
                            <div className="flex flex-wrap gap-2">
                                {TYPES.map(t => (
                                    <PillBtn key={t.value} active={data.type === t.value} onClick={() => setData('type', t.value)}>
                                        {t.icon} {t.label}
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        {/* Transaction type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Tip operație</label>
                            <div className="flex flex-wrap gap-2">
                                {TRANSACTIONS.map(t => (
                                    <PillBtn key={t.value} active={data.transaction_type === t.value} onClick={() => setData('transaction_type', t.value)}>
                                        {t.label}
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        {/* Rental purpose */}
                        {isRent && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Destinație închiriere</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'long_term',  label: 'Termen lung' },
                                        { value: 'short_term', label: 'Termen scurt' },
                                    ].map(o => (
                                        <PillBtn key={o.value} active={data.meta.rental_purpose === o.value} onClick={() => setMeta('rental_purpose', o.value)}>
                                            {o.label}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <Field label="Titlu anunț" required error={errors.title}>
                            <input
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className={inputCls}
                                placeholder="ex: Apartament 2 camere, Buiucani, 55 m²"
                            />
                        </Field>

                        {/* City / District */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Oraș" required error={errors.city}>
                                <input value={data.city} onChange={e => setData('city', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Sector / District" error={errors.district}>
                                <input value={data.district} onChange={e => setData('district', e.target.value)} className={inputCls} placeholder="ex: Buiucani" />
                            </Field>
                        </div>

                        {/* Address */}
                        <Field label="Adresă" error={errors.address}>
                            <input
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                className={inputCls}
                                placeholder="Str. Independenței 12, ap. 34"
                            />
                        </Field>

                        {/* Area */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Suprafață totală (m²)" error={errors.area_total}>
                                <input type="number" min="0" step="0.1" value={data.area_total} onChange={e => setData('area_total', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Suprafață locativă (m²)" error={errors.area_living}>
                                <input type="number" min="0" step="0.1" value={data.area_living} onChange={e => setData('area_living', e.target.value)} className={inputCls} />
                            </Field>
                        </div>

                        {/* Rooms */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Număr camere</label>
                            <div className="flex flex-wrap gap-2">
                                {['1','2','3','4','5','5+'].map(r => (
                                    <PillBtn key={r} small active={String(data.rooms) === (r === '5+' ? '5' : r)} onClick={() => setData('rooms', r === '5+' ? 5 : parseInt(r))}>
                                        {r}
                                    </PillBtn>
                                ))}
                                <input
                                    type="number"
                                    min="0"
                                    value={data.rooms}
                                    onChange={e => setData('rooms', e.target.value)}
                                    className="w-20 rounded-xl border border-slate-200 px-3 py-1 text-sm text-center focus:outline-none focus:border-blue-600"
                                    placeholder="nr."
                                />
                            </div>
                        </div>

                        {/* Floor */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Etaj" error={errors.floor}>
                                <input type="number" value={data.floor} onChange={e => setData('floor', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Total etaje clădire" error={errors.floors_total}>
                                <input type="number" min="1" value={data.floors_total} onChange={e => setData('floors_total', e.target.value)} className={inputCls} />
                            </Field>
                        </div>

                        {/* Price */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Field label="Preț" error={errors.price}>
                                    <input type="number" min="0" value={data.price} onChange={e => setData('price', e.target.value)} className={inputCls} placeholder="0" />
                                </Field>
                            </div>
                            <div className="w-28">
                                <Field label="Valută">
                                    <select value={data.currency} onChange={e => setData('currency', e.target.value)} className={selectCls}>
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="MDL">MDL lei</option>
                                    </select>
                                </Field>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Telefon contact">
                                <input value={data.meta.contact_phone} onChange={e => setMeta('contact_phone', e.target.value)} className={inputCls} placeholder="+373 ..." />
                            </Field>
                            <Field label="Email contact">
                                <input type="email" value={data.meta.contact_email} onChange={e => setMeta('contact_email', e.target.value)} className={inputCls} />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Section 2 — Extra characteristics */}
                    <SectionCard title="Caracteristici suplimentare">
                        <div className="flex flex-wrap gap-2">
                            {FEATURES.map(f => (
                                <Toggle key={f.key} active={!!data.meta[f.key]} onToggle={() => setMeta(f.key, !data.meta[f.key])} label={f.label} />
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Stare proprietate">
                                <select value={data.meta.condition} onChange={e => setMeta('condition', e.target.value)} className={selectCls}>
                                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </Field>
                            <Field label="An construcție">
                                <input
                                    type="number" min="1900" max={new Date().getFullYear()}
                                    value={data.meta.year_built} onChange={e => setMeta('year_built', e.target.value)}
                                    className={inputCls} placeholder="ex: 2012"
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Section 3 — Description + AI */}
                    <SectionCard title="Descriere">
                        <textarea
                            value={data.description_ro}
                            onChange={e => setData('description_ro', e.target.value)}
                            rows={5}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-600 resize-none"
                            placeholder="Descriere proprietate în română…"
                        />

                        {/* AI Tools inline */}
                        <div className="border border-blue-100 rounded-2xl bg-blue-50/40 p-4 space-y-3">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                                <span>✨</span> Instrumente AI
                            </p>

                            {/* Selectors */}
                            <div className="flex flex-wrap gap-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Limbă</p>
                                    <div className="flex gap-1">
                                        {AI_LOCALES.map(o => (
                                            <button
                                                key={o.v} type="button"
                                                onClick={() => setAiLocale(o.v)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                    aiLocale === o.v
                                                        ? 'bg-blue-700 text-white border-blue-700'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                                                }`}
                                            >{o.l}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Stil</p>
                                    <div className="flex flex-wrap gap-1">
                                        {AI_STYLES.map(o => (
                                            <button
                                                key={o.v} type="button"
                                                onClick={() => setAiStyle(o.v)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                    aiStyle === o.v
                                                        ? 'bg-blue-700 text-white border-blue-700'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                                                }`}
                                            >{o.l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {aiError && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleAiDescription}
                                    disabled={aiDescLoading || aiPriceLoading}
                                    className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {aiDescLoading
                                        ? <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Se generează…</>
                                        : <><span>✨</span> Generează descriere</>
                                    }
                                </button>
                                {aiDescResult && aiVariant < 3 && (
                                    <button
                                        type="button"
                                        onClick={handleAiDescription}
                                        disabled={aiDescLoading}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                                    >
                                        ↻ Alt variant ({aiVariant}/3)
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAiPrice}
                                    disabled={aiDescLoading || aiPriceLoading}
                                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors disabled:opacity-50"
                                >
                                    {aiPriceLoading
                                        ? <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Se calculează…</>
                                        : <><span>🔮</span> Estimare preț</>
                                    }
                                </button>
                            </div>

                            {/* Description result */}
                            {aiDescResult && (
                                <div className="space-y-2 border-t border-blue-100 pt-3">
                                    {aiDescResult.title && (
                                        <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-0.5">Titlu generat</p>
                                            <p className="text-sm font-semibold text-slate-800">{aiDescResult.title}</p>
                                        </div>
                                    )}
                                    {aiDescResult.seo_tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {aiDescResult.seo_tags.map((t, i) => (
                                                <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">#{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[11px] text-slate-500">
                                        Descrierea a fost aplicată în câmpul de mai sus. Poți edita liber.
                                    </p>
                                </div>
                            )}

                            {/* Price estimation result */}
                            {aiPriceResult && (
                                <div className="border-t border-blue-100 pt-3 space-y-2">
                                    <div className="rounded-xl bg-white border border-slate-100 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Estimare AI</p>
                                                <p className="text-xl font-bold text-slate-900">
                                                    {aiPriceResult.min && aiPriceResult.max
                                                        ? `€${Number(aiPriceResult.min).toLocaleString('ro')} – €${Number(aiPriceResult.max).toLocaleString('ro')}`
                                                        : '—'}
                                                </p>
                                            </div>
                                            {aiPriceResult.valuation && (
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                    aiPriceResult.valuation === 'cheap'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : aiPriceResult.valuation === 'expensive'
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {aiPriceResult.valuation === 'cheap' ? '● Avantajos' : aiPriceResult.valuation === 'expensive' ? '● Ridicat' : '● La piață'}
                                                </span>
                                            )}
                                        </div>
                                        {aiPriceResult.regional_avg && (
                                            <p className="text-xs text-slate-500">
                                                Medie regională: <span className="font-semibold text-slate-700">€{Number(aiPriceResult.regional_avg).toLocaleString('ro')}</span>
                                                {aiPriceResult.deviation_pct !== 0 && (
                                                    <span className={`ml-2 font-semibold ${aiPriceResult.deviation_pct < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        ({aiPriceResult.deviation_pct > 0 ? '+' : ''}{aiPriceResult.deviation_pct}%)
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                        {aiPriceResult.confidence != null && (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                                    <span>Certitudine model</span>
                                                    <span className="font-bold">{aiPriceResult.confidence}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${aiPriceResult.confidence}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        {aiPriceResult.reason && (
                                            <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">{aiPriceResult.reason}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Section 4 — Photos */}
                    <SectionCard title={`Fotografii (${photoFiles.length}/15)`}>
                        {photoFiles.length < 15 && (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); addPhotos(e.dataTransfer.files); }}
                                onClick={() => document.getElementById('photo-input').click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                    dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <div className="text-4xl mb-2">📷</div>
                                <p className="text-sm text-slate-500">
                                    Trageți fotografii aici sau <span className="text-blue-600 font-medium">selectați fișiere</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Mai poți adăuga {15 - photoFiles.length} foto · max 5 MB/foto · JPG, PNG, WebP
                                </p>
                                <input id="photo-input" type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(e.target.files)} />
                            </div>
                        )}

                        {photoPreviews.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                {photoPreviews.map((src, idx) => (
                                    <div key={idx} className="relative group aspect-square">
                                        <img
                                            src={src} alt=""
                                            className={`w-full h-full object-cover rounded-xl border-2 transition-colors ${
                                                coverIndex === idx ? 'border-blue-500' : 'border-transparent'
                                            }`}
                                        />
                                        {coverIndex === idx && (
                                            <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                Cover
                                            </span>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                            {coverIndex !== idx && (
                                                <button type="button" onClick={() => setCoverIndex(idx)} className="bg-white/90 text-[10px] font-semibold px-2 py-1 rounded-lg">
                                                    Cover
                                                </button>
                                            )}
                                            <button type="button" onClick={() => removePhoto(idx)} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-lg">
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Field label="Video (YouTube URL — opțional)">
                            <input
                                type="url"
                                value={data.meta.video_url}
                                onChange={e => setMeta('video_url', e.target.value)}
                                className={inputCls}
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </Field>
                    </SectionCard>

                    {/* Bottom action bar (repeat for convenience) */}
                    <div className="flex flex-wrap gap-3 pt-2 pb-8">
                        <button type="button" onClick={() => submit('active')} disabled={processing} className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 text-sm font-semibold shadow transition-colors disabled:opacity-50">
                            {processing ? 'Se salvează…' : '✓ Salvează și publică'}
                        </button>
                        <button type="button" onClick={() => submit('draft')} disabled={processing} className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 text-sm font-semibold transition-colors">
                            Salvează schiță
                        </button>
                        <Link href={route('properties.index')} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                            Anulează
                        </Link>
                    </div>
                </div>

                {/* ── RIGHT: sticky live preview ───────────────────────── */}
                <div className="w-72 shrink-0 sticky top-24 hidden xl:block">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Cover photo */}
                        <div className="h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                            {photoPreviews[coverIndex]
                                ? <img src={photoPreviews[coverIndex]} alt="" className="w-full h-full object-cover" />
                                : <span className="text-5xl opacity-30">🏠</span>
                            }
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1">
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">{typeLabel}</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">{txLabel}</span>
                                {data.rooms ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">{data.rooms} cam.</span> : null}
                            </div>

                            {/* Title */}
                            <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
                                {data.title || <span className="text-slate-300 italic font-normal">Titlul apare aici…</span>}
                            </p>

                            {/* Price */}
                            {data.price
                                ? <p className="text-blue-700 font-bold text-lg leading-none">
                                    {Number(data.price).toLocaleString('ro-RO')}
                                    <span className="text-sm font-medium ml-1">{data.currency}</span>
                                  </p>
                                : <p className="text-slate-300 text-sm italic">Preț…</p>
                            }

                            {/* Location */}
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <span>📍</span>
                                {[data.district, data.city].filter(Boolean).join(', ') || <span className="italic">Locație…</span>}
                            </p>

                            {/* Area */}
                            {data.area_total && (
                                <p className="text-xs text-slate-500">
                                    {data.area_total} m² total
                                    {data.area_living ? ` · ${data.area_living} m² locativă` : ''}
                                    {data.floor ? ` · et. ${data.floor}${data.floors_total ? `/${data.floors_total}` : ''}` : ''}
                                </p>
                            )}

                            {/* Feature chips */}
                            {FEATURES.some(f => data.meta[f.key]) && (
                                <div className="flex flex-wrap gap-1">
                                    {FEATURES.filter(f => data.meta[f.key]).map(f => (
                                        <span key={f.key} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-100">
                                            {f.label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Description snippet */}
                            {data.description_ro && (
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 border-t border-slate-50 pt-2">
                                    {data.description_ro}
                                </p>
                            )}

                            {/* Completion bar */}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Completat</span>
                                    <span className={`font-semibold ${pct === 100 ? 'text-green-600' : 'text-slate-600'}`}>{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Condition + year quick info */}
                    {(data.meta.condition || data.meta.year_built) && (
                        <div className="mt-3 bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-xs text-slate-500 flex gap-3">
                            {data.meta.condition && <span>Stare: <b className="text-slate-700">{CONDITIONS.find(c => c.value === data.meta.condition)?.label}</b></span>}
                            {data.meta.year_built && <span>An: <b className="text-slate-700">{data.meta.year_built}</b></span>}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
