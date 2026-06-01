import { useState, useCallback } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Combobox from '@/Components/Combobox';
import { MOLDOVA_LOCALITIES, CHISINAU_DISTRICTS } from '@/Constants/moldova';
import { TYPE_OPTIONS, TRANSACTION_OPTIONS, areaUnit } from '@/lib/propertyLabels';
import {
    Building, Building2, Home, House, Trees, Car, Store,
    Sparkles, RotateCw, Brain, AlertTriangle, Camera, X as XIcon,
    Check, MapPin, ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';

const AI_STYLE_LABELS = { detailed: 'Detaliat', short: 'Scurt', formal: 'Oficial', emotional: 'Emoțional' };

// ── styles ─────────────────────────────────────────────────────────────────
// text-slate-900 explicit so dark-mode override (#f1f5f9) kicks in for input
// values; placeholders inherit the dark .dark input::placeholder rule.
const inputCls =
    'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white';
const selectCls = inputCls;

// ── constants ───────────────────────────────────────────────────────────────
// Labels centralized in @/lib/propertyLabels. Icons mapped to Lucide
// components (rendered inline as <Icon />, not used as strings).
const TYPE_ICONS = { apartment: Building2, house: Home, cottage: House, land: Trees, garage: Car, commercial: Store };
const CONDITIONS = [
    { value: '',                label: '— Nedefinit —' },
    { value: 'new',             label: 'Nou / fără renovare' },
    { value: 'renovated',       label: 'Cu renovare' },
    { value: 'needs_renovation',label: 'Necesită renovare' },
];
const STATUSES = [
    { value: 'active',   label: 'Activ' },
    { value: 'inactive', label: 'Inactiv' },
    { value: 'sold',     label: 'Vândut' },
    { value: 'rented',   label: 'Închiriat' },
    { value: 'draft',    label: 'Schiță' },
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

// Per-type field visibility — matches PropertyController validation `required_if` rules.
// Suprafața totală e mereu vizibilă (orice tip o are).
const SHOW_LIVING_AREA_TYPES  = new Set(['apartment', 'house', 'cottage', 'commercial']);
const SHOW_ROOMS_TYPES        = new Set(['apartment', 'house', 'cottage']);
const SHOW_FLOOR_TYPES        = new Set(['apartment', 'house', 'cottage', 'garage', 'commercial']);
const SHOW_FLOORS_TOTAL_TYPES = new Set(['apartment', 'house', 'cottage', 'commercial']);

const AI_LOCALES = [{ v: 'ro', l: 'RO' }, { v: 'ru', l: 'RU' }];
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

// ── helpers ─────────────────────────────────────────────────────────────────
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
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${
                small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
            } ${
                active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
        >
            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${
                active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
            }`}>{active ? '✓' : ''}</span>
            {label}
        </button>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-900 text-[15px]">{title}</h2>
            {children}
        </div>
    );
}

function completion(data, totalPhotos) {
    const filled = TRACKED.filter(k => data[k] !== '' && data[k] !== null && data[k] !== undefined).length
        + (totalPhotos > 0 ? 1 : 0);
    const total = TRACKED.length + 1;
    return { filled, total, pct: Math.round((filled / total) * 100) };
}

// Extract a YouTube video ID from common URL formats:
//   https://youtu.be/<ID>           https://www.youtube.com/watch?v=<ID>
//   https://www.youtube.com/embed/<ID>   https://www.youtube.com/shorts/<ID>
function youtubeId(url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
}

function YoutubeEmbed({ url }) {
    const id = youtubeId(url);
    if (!id) return null;
    return (
        <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title="YouTube preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            />
        </div>
    );
}

// ── main component ──────────────────────────────────────────────────────────
export default function Edit({ property }) {
    const existing = property.media ?? [];
    const existingCover = existing.find(m => m.is_cover);

    const [data, setDataRaw] = useState({
        title: property.title ?? '',
        type: property.type ?? 'apartment',
        transaction_type: property.transaction_type ?? 'sale',
        price: property.price ?? '',
        currency: property.currency ?? 'EUR',
        area_total: property.area_total ?? '',
        area_living: property.area_living ?? '',
        rooms: property.rooms ?? '',
        floor: property.floor ?? '',
        floors_total: property.floors_total ?? '',
        address: property.address ?? '',
        city: property.city ?? 'Chișinău',
        district: property.district ?? '',
        description_ro: property.description_ro ?? '',
        description_ru: property.description_ru ?? '',
        status: property.status ?? 'active',
        meta: {
            ...EMPTY_META,
            ...(property.meta ?? {}),
            contact_phone: property.meta?.contact_phone ?? '',
            contact_email: property.meta?.contact_email ?? '',
        },
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    // Existing photos that user kept (id, url, is_cover)
    const [existingMedia, setExistingMedia] = useState(
        existing.map(m => ({ id: m.id, url: `/storage/${m.path}`, is_cover: !!m.is_cover }))
    );
    const [deletedMediaIds, setDeletedMediaIds] = useState([]);

    // New photos uploaded in this session
    const [photoFiles, setPhotoFiles]     = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);

    // Cover: either existing media id (preferred) or new-photo index
    const [coverMediaId, setCoverMediaId] = useState(existingCover?.id ?? null);
    const [coverNewIdx, setCoverNewIdx]   = useState(null);

    const [aiLocale,       setAiLocale]       = useState('ro');
    const [aiStyle,        setAiStyle]        = useState('detailed');
    const [aiDescLoading,  setAiDescLoading]  = useState(false);
    const [aiPriceLoading, setAiPriceLoading] = useState(false);
    const [aiDescResult,   setAiDescResult]   = useState(null);
    const [aiPriceResult,  setAiPriceResult]  = useState(null);
    const [aiError,        setAiError]        = useState('');
    const [aiVariant,      setAiVariant]      = useState(0);
    const [dragOver,       setDragOver]       = useState(false);

    // AI description history per language (RO/RU independent). Each entry:
    // { text: string, label: 'Original' | 'AI <Stil>' }. Index marks which
    // entry is currently displayed; -1 means "no history yet for this lang"
    // and the textarea shows whatever the user typed manually.
    const [descHistory, setDescHistory] = useState({ ro: [], ru: [] });
    const [descIndex,   setDescIndex]   = useState({ ro: -1, ru: -1 });

    const setData = (key, val) => setDataRaw(prev => ({ ...prev, [key]: val }));
    const setMeta = (key, val) => setData('meta', { ...data.meta, [key]: val });

    // Reset hidden fields when type changes so we don't ship stale orphan data
    // (e.g. an apartment edited into a "Teren" — rooms/floor/etc must drop).
    const changeType = (newType) => setDataRaw(prev => ({
        ...prev,
        type: newType,
        ...(SHOW_LIVING_AREA_TYPES.has(newType)  ? {} : { area_living: '' }),
        ...(SHOW_ROOMS_TYPES.has(newType)        ? {} : { rooms: '' }),
        ...(SHOW_FLOOR_TYPES.has(newType)        ? {} : { floor: '' }),
        ...(SHOW_FLOORS_TOTAL_TYPES.has(newType) ? {} : { floors_total: '' }),
    }));

    const showLivingArea  = SHOW_LIVING_AREA_TYPES.has(data.type);
    const showRooms       = SHOW_ROOMS_TYPES.has(data.type);
    const showFloor       = SHOW_FLOOR_TYPES.has(data.type);
    const showFloorsTotal = SHOW_FLOORS_TOTAL_TYPES.has(data.type);

    const totalPhotos = existingMedia.length + photoFiles.length;
    const allowedSlots = Math.max(0, 15 - totalPhotos);

    // ── photo helpers ─────────────────────────────────────────────────────────
    const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_PHOTO_BYTES     = 5 * 1024 * 1024;
    const [photoError, setPhotoError] = useState('');

    const addPhotos = useCallback((fileList) => {
        const rejected = [];
        const accepted = [];
        for (const f of fileList) {
            if (!ALLOWED_PHOTO_TYPES.includes(f.type)) {
                rejected.push(`${f.name}: tip nepermis (doar JPG, PNG, WebP)`);
                continue;
            }
            if (f.size > MAX_PHOTO_BYTES) {
                rejected.push(`${f.name}: depășește 5 MB`);
                continue;
            }
            accepted.push(f);
        }
        const newFiles = accepted.slice(0, allowedSlots);
        const overflow = accepted.length - newFiles.length;
        setPhotoFiles(prev => [...prev, ...newFiles]);
        setPhotoPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);

        const errs = [...rejected];
        if (overflow > 0) errs.push(`${overflow} foto peste limita de 15`);
        setPhotoError(errs.length ? errs.join(' · ') : '');
    }, [allowedSlots]);

    const removeNewPhoto = useCallback((idx) => {
        URL.revokeObjectURL(photoPreviews[idx]);
        setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
        if (coverNewIdx === idx) setCoverNewIdx(null);
        else if (coverNewIdx > idx) setCoverNewIdx(c => c - 1);
    }, [photoPreviews, coverNewIdx]);

    const removeExistingPhoto = (id) => {
        setExistingMedia(prev => prev.filter(m => m.id !== id));
        setDeletedMediaIds(prev => [...prev, id]);
        if (coverMediaId === id) setCoverMediaId(null);
    };

    const setExistingCover = (id) => { setCoverMediaId(id); setCoverNewIdx(null); };
    const setNewCover = (idx) => { setCoverNewIdx(idx); setCoverMediaId(null); };

    // ── submit ────────────────────────────────────────────────────────────────
    const submit = (statusOverride) => {
        setProcessing(true);
        const fd = new FormData();
        fd.append('_method', 'PUT');

        const scalar = { ...data, status: statusOverride || data.status };
        delete scalar.meta;
        Object.entries(scalar).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') fd.append(k, v);
        });
        Object.entries(data.meta).forEach(([k, v]) => {
            fd.append(`meta[${k}]`, typeof v === 'boolean' ? (v ? '1' : '0') : (v ?? ''));
        });

        photoFiles.forEach(f => fd.append('photos[]', f));
        deletedMediaIds.forEach(id => fd.append('deleted_media_ids[]', id));

        if (coverMediaId) fd.append('cover_media_id', coverMediaId);
        else if (coverNewIdx !== null) fd.append('cover_index', coverNewIdx);

        router.post(`/properties/${property.id}`, fd, {
            forceFormData: true,
            onError: (errs) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    const aiPropertyData = {
        type: data.type, transaction_type: data.transaction_type,
        title: data.title,
        city: data.city, district: data.district, address: data.address,
        area_total: data.area_total, area_living: data.area_living, rooms: data.rooms,
        floor: data.floor, floors_total: data.floors_total,
        price: data.price, currency: data.currency,
        description_ro: data.description_ro,
        description_ru: data.description_ru,
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

            const lang  = aiLocale;
            const field = lang === 'ro' ? 'description_ro' : 'description_ru';
            const aiText = json.description ?? '';
            const currentText = data[field] ?? '';

            // Push into per-language history. Snapshot the pre-AI text as
            // "Original" on the FIRST generation for this language (skip if
            // current text is empty — no point saving "" as the original).
            setDescHistory(h => {
                const existing = h[lang];
                const seed = existing.length === 0 && currentText.trim()
                    ? [{ text: currentText, label: 'Original' }]
                    : existing;
                const styleLabel = AI_STYLE_LABELS[aiStyle] ?? 'AI';
                const newArr = [...seed, { text: aiText, label: `AI ${styleLabel}` }];
                setDescIndex(i => ({ ...i, [lang]: newArr.length - 1 }));
                return { ...h, [lang]: newArr };
            });

            setAiDescResult(json);
            setAiVariant(c => c + 1);
            setData(field, aiText);
        } catch (e) {
            setAiError(e.message || 'Eroare la generare AI. Verificați cheia ANTHROPIC_API_KEY în .env.');
        } finally {
            setAiDescLoading(false);
        }
    }, [data.city, data.type, data.transaction_type, data.district, data.area_total, data.rooms, data.price, data.currency, data.description_ro, data.description_ru, data.meta, aiLocale, aiStyle]);

    const navigateDesc = (dir) => {
        const lang = aiLocale;
        const arr  = descHistory[lang];
        const newIdx = descIndex[lang] + dir;
        if (newIdx < 0 || newIdx >= arr.length) return;
        setDescIndex(i => ({ ...i, [lang]: newIdx }));
        setData(lang === 'ro' ? 'description_ro' : 'description_ru', arr[newIdx].text);
    };

    const restoreOriginal = () => {
        const lang = aiLocale;
        const arr  = descHistory[lang];
        const idx  = arr.findIndex(v => v.label === 'Original');
        if (idx < 0) return;
        setDescIndex(i => ({ ...i, [lang]: idx }));
        setData(lang === 'ro' ? 'description_ro' : 'description_ru', arr[idx].text);
    };

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
    }, [data.city, data.type, data.transaction_type, data.district, data.area_total, data.rooms, data.price, data.currency, data.description_ro, data.description_ru, data.meta]);

    const { filled, total, pct } = completion(data, totalPhotos);
    const typeLabel = TYPE_OPTIONS.find(t => t.value === data.type)?.label ?? '';
    const txLabel   = TRANSACTION_OPTIONS.find(t => t.value === data.transaction_type)?.label ?? '';
    const isRent    = data.transaction_type === 'rent' || data.transaction_type === 'inchiriere_zilnica';
    const isChisinau = (data.city ?? '').trim().toLowerCase().startsWith('chișinău')
                    || (data.city ?? '').trim().toLowerCase().startsWith('chisinau');
    const districtOptions = isChisinau ? CHISINAU_DISTRICTS : [];

    return (
        <AppLayout title="Editează proprietate">
            <Head title="Editează proprietate" />

            {/* ── top action bar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Editează proprietate #{property.id}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{filled}</span>
                        /{total} câmpuri completate
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => submit('active')}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                        {processing ? 'Se salvează…' : <><Check className="w-4 h-4" strokeWidth={2.5} /> Salvează modificările</>}
                    </button>
                    <button
                        type="button"
                        onClick={() => submit('draft')}
                        disabled={processing}
                        className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                        Salvează ca schiță
                    </button>
                    <Link
                        href={`/properties/${property.id}`}
                        className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Anulează
                    </Link>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* ── LEFT: form ──────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-5">

                    {/* Section 1 — Basic info */}
                    <SectionCard title="Informații de bază">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Tip proprietate</label>
                            <div className="flex flex-wrap gap-2">
                                {TYPE_OPTIONS.map(t => {
                                    const Icon = TYPE_ICONS[t.value] ?? Building2;
                                    return (
                                        <PillBtn key={t.value} active={data.type === t.value} onClick={() => changeType(t.value)}>
                                            <Icon className="w-4 h-4" />
                                            {t.label}
                                        </PillBtn>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Tip operație</label>
                            <div className="flex flex-wrap gap-2">
                                {TRANSACTION_OPTIONS.map(t => (
                                    <PillBtn key={t.value} active={data.transaction_type === t.value} onClick={() => setData('transaction_type', t.value)}>
                                        {t.label}
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        <Field label="Titlu anunț" required error={errors.title}>
                            <input
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className={inputCls}
                                placeholder="ex: Apartament 2 camere, Buiucani, 55 m²"
                            />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Raion" required error={errors.city}>
                                <Combobox
                                    value={data.city}
                                    onChange={v => setData('city', v)}
                                    options={MOLDOVA_LOCALITIES}
                                    placeholder="Ex: Chișinău"
                                />
                            </Field>
                            <Field label="Sector / District" error={errors.district}>
                                <Combobox
                                    value={data.district}
                                    onChange={v => setData('district', v)}
                                    options={districtOptions}
                                    placeholder={isChisinau ? 'Ex: Botanica' : 'Ex: Centru'}
                                />
                            </Field>
                        </div>

                        <Field label="Adresă" error={errors.address}>
                            <input
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                className={inputCls}
                                placeholder="Str. Independenței 12, ap. 34"
                            />
                        </Field>

                        {/* Area — totală e mereu vizibilă; locativă doar pentru tipuri locuibile */}
                        <div className={showLivingArea ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
                            <Field label="Suprafață totală (m²)" error={errors.area_total}>
                                <input type="number" min="0" step="0.1" value={data.area_total} onChange={e => setData('area_total', e.target.value)} className={inputCls} />
                            </Field>
                            {showLivingArea && (
                                <Field label="Suprafață locativă (m²)" error={errors.area_living}>
                                    <input type="number" min="0" step="0.1" value={data.area_living} onChange={e => setData('area_living', e.target.value)} className={inputCls} />
                                </Field>
                            )}
                        </div>

                        {/* Rooms — doar pentru spații de locuit */}
                        {showRooms && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Număr camere</label>
                                <div className="flex flex-wrap gap-2">
                                    {['1','2','3','4','5','5+'].map(r => (
                                        <PillBtn key={r} small active={String(data.rooms) === (r === '5+' ? '5' : r)} onClick={() => setData('rooms', r === '5+' ? 5 : parseInt(r))}>
                                            {r}
                                        </PillBtn>
                                    ))}
                                    <input
                                        type="number" min="0"
                                        value={data.rooms}
                                        onChange={e => setData('rooms', e.target.value)}
                                        className="w-20 rounded-xl border border-slate-200 px-3 py-1 text-sm text-center focus:outline-none focus:border-blue-600"
                                        placeholder="nr."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Floor — orice tip cu structură de niveluri */}
                        {(showFloor || showFloorsTotal) && (
                            <div className={showFloor && showFloorsTotal ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
                                {showFloor && (
                                    <Field label="Etaj" error={errors.floor}>
                                        <input type="number" value={data.floor} onChange={e => setData('floor', e.target.value)} className={inputCls} />
                                    </Field>
                                )}
                                {showFloorsTotal && (
                                    <Field label="Total etaje clădire" error={errors.floors_total}>
                                        <input type="number" min="1" value={data.floors_total} onChange={e => setData('floors_total', e.target.value)} className={inputCls} />
                                    </Field>
                                )}
                            </div>
                        )}

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
                            <div className="w-32">
                                <Field label="Status">
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className={selectCls}>
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        {/* Toggle RO/RU above textarea — drives which description field is shown/edited */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase">Limbă:</span>
                            <div className="flex gap-1">
                                {AI_LOCALES.map(o => (
                                    <button
                                        key={o.v}
                                        type="button"
                                        onClick={() => setAiLocale(o.v)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                            aiLocale === o.v
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {o.l}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-400 ml-2">
                                {aiLocale === 'ro' ? 'Editezi descrierea română' : 'Editezi descrierea rusă'}
                            </span>
                        </div>

                        <textarea
                            value={aiLocale === 'ro' ? data.description_ro : data.description_ru}
                            onChange={e => setData(
                                aiLocale === 'ro' ? 'description_ro' : 'description_ru',
                                e.target.value
                            )}
                            rows={5}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 resize-none bg-white"
                            placeholder={aiLocale === 'ro' ? 'Descriere proprietate în română…' : 'Описание недвижимости на русском…'}
                        />

                        {/* History controls — visible only when there are ≥2 versions for the active language */}
                        {descHistory[aiLocale].length > 1 && (
                            <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => navigateDesc(-1)}
                                    disabled={descIndex[aiLocale] <= 0}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                                </button>
                                <span className="text-slate-500 font-medium">
                                    {descHistory[aiLocale][descIndex[aiLocale]]?.label} ({descIndex[aiLocale] + 1}/{descHistory[aiLocale].length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigateDesc(1)}
                                    disabled={descIndex[aiLocale] >= descHistory[aiLocale].length - 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Următor <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                {descHistory[aiLocale].some(v => v.label === 'Original') && (
                                    <button
                                        type="button"
                                        onClick={restoreOriginal}
                                        className="inline-flex items-center gap-1 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 font-semibold transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Revino la original
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="border border-slate-200/70 rounded-xl bg-slate-50/60 p-4 space-y-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Instrumente AI
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Stil</p>
                                    <div className="flex flex-wrap gap-1">
                                        {AI_STYLES.map(o => (
                                            <button
                                                key={o.v} type="button"
                                                onClick={() => setAiStyle(o.v)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                    aiStyle === o.v
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >{o.l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {aiError && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {aiError}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 items-center">
                                <button
                                    type="button"
                                    onClick={handleAiDescription}
                                    disabled={aiDescLoading || aiPriceLoading || aiVariant >= 3}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {aiDescLoading ? 'Se generează…' : <><Sparkles className="w-4 h-4" /> Generează descriere</>}
                                </button>
                                {aiDescResult && aiVariant < 3 && (
                                    <button type="button" onClick={handleAiDescription} disabled={aiDescLoading} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                                        <RotateCw className="w-3.5 h-3.5" />
                                        Alt variant ({aiVariant}/3)
                                    </button>
                                )}
                                {aiVariant >= 3 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Limită atinsă (3/3 generări).
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAiPrice}
                                    disabled={aiDescLoading || aiPriceLoading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {aiPriceLoading ? 'Se calculează…' : <><Brain className="w-4 h-4" /> Estimare preț</>}
                                </button>
                            </div>

                            {aiDescResult && (
                                <div className="space-y-2 border-t border-blue-100 pt-3">
                                    {aiDescResult.title && (
                                        <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-0.5">Titlu generat</p>
                                            <p className="text-sm font-semibold text-slate-800">{aiDescResult.title}</p>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-slate-500">Descrierea a fost aplicată în câmpul de mai sus.</p>
                                </div>
                            )}

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
                                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                                                    aiPriceResult.valuation === 'cheap'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : aiPriceResult.valuation === 'expensive'
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    {aiPriceResult.valuation === 'cheap' ? 'Avantajos' : aiPriceResult.valuation === 'expensive' ? 'Ridicat' : 'La piață'}
                                                </span>
                                            )}
                                        </div>
                                        {aiPriceResult.reason && (
                                            <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">{aiPriceResult.reason}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Section 4 — Photos (existing + new) */}
                    <SectionCard title={`Fotografii (${totalPhotos}/15)`}>
                        {/* Existing photos */}
                        {existingMedia.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2">Fotografii existente</p>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {existingMedia.map(m => (
                                        <div key={m.id} className="relative group aspect-square">
                                            <img
                                                src={m.url}
                                                alt=""
                                                className={`w-full h-full object-cover rounded-xl border-2 transition-colors ${
                                                    coverMediaId === m.id ? 'border-blue-500' : 'border-transparent'
                                                }`}
                                            />
                                            {coverMediaId === m.id && (
                                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Cover</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                {coverMediaId !== m.id && (
                                                    <button type="button" onClick={() => setExistingCover(m.id)} className="bg-white/90 text-[10px] font-semibold px-2 py-1 rounded-lg">Cover</button>
                                                )}
                                                <button type="button" onClick={() => removeExistingPhoto(m.id)} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg" aria-label="Șterge foto"><XIcon className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Drop zone for new uploads */}
                        {allowedSlots > 0 && (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); addPhotos(e.dataTransfer.files); }}
                                onClick={() => document.getElementById('photo-input-edit').click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                    dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" strokeWidth={1.5} />
                                <p className="text-sm text-slate-500">
                                    Trageți fotografii aici sau <span className="text-blue-600 font-medium">selectați fișiere</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Mai poți adăuga {allowedSlots} foto · max 5 MB/foto · JPG, PNG, WebP
                                </p>
                                <input id="photo-input-edit" type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => addPhotos(e.target.files)} />
                            </div>
                        )}

                        {photoError && (
                            <p className="text-xs text-rose-600 mt-2">{photoError}</p>
                        )}

                        {/* New photos preview */}
                        {photoPreviews.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2">Fotografii noi</p>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {photoPreviews.map((src, idx) => (
                                        <div key={idx} className="relative group aspect-square">
                                            <img
                                                src={src}
                                                alt=""
                                                className={`w-full h-full object-cover rounded-xl border-2 transition-colors ${
                                                    coverNewIdx === idx ? 'border-blue-500' : 'border-transparent'
                                                }`}
                                            />
                                            {coverNewIdx === idx && (
                                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Cover</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                {coverNewIdx !== idx && (
                                                    <button type="button" onClick={() => setNewCover(idx)} className="bg-white/90 text-[10px] font-semibold px-2 py-1 rounded-lg">Cover</button>
                                                )}
                                                <button type="button" onClick={() => removeNewPhoto(idx)} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg" aria-label="Șterge foto"><XIcon className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                            <YoutubeEmbed url={data.meta.video_url} />
                        </Field>
                    </SectionCard>

                    {/* Bottom action bar */}
                    <div className="flex flex-wrap gap-3 pt-2 pb-8">
                        <button
                            type="button"
                            onClick={() => submit('active')}
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Se salvează…' : <><Check className="w-4 h-4" strokeWidth={2.5} /> Salvează modificările</>}
                        </button>
                        <Link
                            href={`/properties/${property.id}`}
                            className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Anulează
                        </Link>
                    </div>
                </div>

                {/* ── RIGHT: sticky live preview ───────────────────────── */}
                <div className="w-72 shrink-0 sticky top-24 hidden xl:block">
                    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
                        <div className="h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                            {(() => {
                                const coverExisting = existingMedia.find(m => m.id === coverMediaId);
                                const coverNew     = coverNewIdx !== null ? photoPreviews[coverNewIdx] : null;
                                const src          = coverExisting?.url ?? coverNew ?? existingMedia[0]?.url ?? photoPreviews[0] ?? null;
                                return src
                                    ? <img src={src} alt="" className="w-full h-full object-cover" />
                                    : <Building className="w-12 h-12 text-slate-300" strokeWidth={1.5} />;
                            })()}
                        </div>

                        <div className="p-4 space-y-3">
                            <div className="flex flex-wrap gap-1">
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[11px] font-semibold">{typeLabel}</span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">{txLabel}</span>
                                {data.rooms ? <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">{data.rooms} cam.</span> : null}
                            </div>

                            <p className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                                {data.title || <span className="text-slate-300 italic font-normal">Titlul apare aici…</span>}
                            </p>

                            {data.price
                                ? <p className="text-slate-900 font-bold text-lg leading-none tabular-nums">
                                    {Number(data.price).toLocaleString('ro-RO')}
                                    <span className="text-sm font-medium ml-1">{data.currency}</span>
                                  </p>
                                : <p className="text-slate-300 text-sm italic">Preț…</p>
                            }

                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {[data.district, data.city].filter(Boolean).join(', ') || <span className="italic">Locație…</span>}
                            </p>

                            {data.area_total && (
                                <p className="text-xs text-slate-500">
                                    {data.area_total} {areaUnit(data.type)} total
                                    {data.area_living ? ` · ${data.area_living} ${areaUnit(data.type)} locativă` : ''}
                                    {data.floor ? ` · et. ${data.floor}${data.floors_total ? `/${data.floors_total}` : ''}` : ''}
                                </p>
                            )}

                            {FEATURES.some(f => data.meta[f.key]) && (
                                <div className="flex flex-wrap gap-1">
                                    {FEATURES.filter(f => data.meta[f.key]).map(f => (
                                        <span key={f.key} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                            {f.label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {data.description_ro && (
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 border-t border-slate-100 pt-2">
                                    {data.description_ro}
                                </p>
                            )}

                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Completat</span>
                                    <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
