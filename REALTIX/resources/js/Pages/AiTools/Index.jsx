import { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── constants ────────────────────────────────────────────────────────────────
const TYPES = [
    { v: 'apartment', l: 'Apartament', icon: '🏢' },
    { v: 'house',     l: 'Casă',       icon: '🏠' },
    { v: 'commercial',l: 'Comercial',  icon: '🏪' },
    { v: 'land',      l: 'Teren',      icon: '🌿' },
];
const TRANSACTIONS = [
    { v: 'sale',      l: 'Vânzare' },
    { v: 'rent',      l: 'Chirie' },
    { v: 'rent_short',l: 'Chirie scurtă' },
    { v: 'new_build', l: 'Construcție nouă' },
];
const CONDITIONS = [
    { v: '',                l: '— Nedefinit —' },
    { v: 'new',             l: 'Nou / fără renovare' },
    { v: 'renovated',       l: 'Cu renovare' },
    { v: 'needs_renovation',l: 'Necesită renovare' },
];
const FEATURES = [
    { k: 'furnished', l: 'Mobilat' },
    { k: 'parking',   l: 'Parcare' },
    { k: 'balcony',   l: 'Balcon' },
    { k: 'ac',        l: 'Aer condiționat' },
    { k: 'elevator',  l: 'Lift' },
];
const LOCALES = [{ v: 'ro', l: 'RO — Română' }, { v: 'ru', l: 'RU — Rusă' }, { v: 'en', l: 'EN — Engleză' }];
const STYLES  = [
    { v: 'short',    l: '⚡ Scurt',    desc: '80-100 cuvinte' },
    { v: 'detailed', l: '📋 Detaliat', desc: '150-200 cuvinte' },
    { v: 'formal',   l: '🏛 Oficial',  desc: 'Ton profesional' },
    { v: 'emotional',l: '💫 Emoțional',desc: 'Ton aspirațional' },
];
const VALUATION_CFG = {
    cheap:     { label: 'Avantajos',  bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    average:   { label: 'La piață',   bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-400' },
    expensive: { label: 'Ridicat',    bg: 'bg-red-100',     text: 'text-red-600',     bar: 'bg-red-500' },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function csrf() {
    return document.head.querySelector('meta[name="csrf-token"]')?.content ?? '';
}

async function aiPost(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error ?? `Eroare HTTP ${r.status}`);
    return json;
}

// ── small components ─────────────────────────────────────────────────────────
function Pill({ active, onClick, children, small }) {
    return (
        <button type="button" onClick={onClick}
            className={`rounded-full border font-medium transition-colors ${small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${
                active
                    ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}>
            {children}
        </button>
    );
}

function Toggle({ active, onToggle, label }) {
    return (
        <button type="button" onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}>
            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${
                active ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
            }`}>{active ? '✓' : ''}</span>
            {label}
        </button>
    );
}

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inp = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';

// ── main ──────────────────────────────────────────────────────────────────────
export default function AiToolsIndex() {
    // Form state
    const [form, setForm] = useState({
        type: 'apartment', transaction_type: 'sale',
        city: 'Chișinău', district: '', price: '', currency: 'EUR',
        area_total: '', rooms: '', floor: '', floors_total: '',
        meta: { condition: '', furnished: false, parking: false, balcony: false, ac: false, elevator: false },
    });
    const setF  = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const setMeta = (k, v) => setForm(p => ({ ...p, meta: { ...p.meta, [k]: v } }));

    // AI state
    const [tab,           setTab]          = useState('description');
    const [locale,        setLocale]       = useState('ro');
    const [style,         setStyle]        = useState('detailed');
    const [descLoading,   setDescLoading]  = useState(false);
    const [priceLoading,  setPriceLoading] = useState(false);
    const [descResult,    setDescResult]   = useState(null);
    const [priceResult,   setPriceResult]  = useState(null);
    const [editedDesc,    setEditedDesc]   = useState('');
    const [variantCount,  setVariantCount] = useState(0);
    const [error,         setError]        = useState('');
    const [copied,        setCopied]       = useState(false);

    const propertyData = {
        type: form.type, transaction_type: form.transaction_type,
        city: form.city, district: form.district,
        area_total: form.area_total, rooms: form.rooms,
        floor: form.floor, floors_total: form.floors_total,
        price: form.price, currency: form.currency,
        meta: form.meta,
    };

    const generateDescription = useCallback(async () => {
        if (!form.city) { setError('Completează cel puțin orașul.'); return; }
        setDescLoading(true); setError('');
        try {
            const data = await aiPost('/ai/generate', { locale, style, data: propertyData });
            setDescResult(data);
            setEditedDesc(data.description ?? '');
            setVariantCount(c => c + 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setDescLoading(false);
        }
    }, [form, locale, style]);

    const estimatePrice = useCallback(async () => {
        if (!form.city) { setError('Completează cel puțin orașul.'); return; }
        setPriceLoading(true); setError('');
        try {
            const data = await aiPost('/ai/estimate', { data: propertyData });
            setPriceResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setPriceLoading(false);
        }
    }, [form]);

    const copyText = useCallback(() => {
        if (!editedDesc) return;
        navigator.clipboard.writeText(editedDesc);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [editedDesc]);

    const devPct = priceResult?.deviation_pct ?? 0;
    const valCfg = priceResult ? (VALUATION_CFG[priceResult.valuation] ?? VALUATION_CFG.average) : null;

    return (
        <AppLayout title="Instrumente AI">
            <Head title="Instrumente AI" />

            <div className="max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span>✨</span> Instrumente AI
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Completează datele proprietății și generează descrieri sau estimează prețul instant.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

                    {/* ── LEFT: Property data form ── */}
                    <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide text-slate-400">Date proprietate</h2>

                        {/* Type */}
                        <Field label="Tip proprietate">
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {TYPES.map(t => (
                                    <Pill key={t.v} small active={form.type === t.v} onClick={() => setF('type', t.v)}>
                                        {t.icon} {t.l}
                                    </Pill>
                                ))}
                            </div>
                        </Field>

                        {/* Transaction */}
                        <Field label="Tip tranzacție">
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {TRANSACTIONS.map(t => (
                                    <Pill key={t.v} small active={form.transaction_type === t.v} onClick={() => setF('transaction_type', t.v)}>
                                        {t.l}
                                    </Pill>
                                ))}
                            </div>
                        </Field>

                        {/* City / District */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Oraș *">
                                <input value={form.city} onChange={e => setF('city', e.target.value)} className={inp} placeholder="Chișinău" />
                            </Field>
                            <Field label="Sector">
                                <input value={form.district} onChange={e => setF('district', e.target.value)} className={inp} placeholder="Buiucani" />
                            </Field>
                        </div>

                        {/* Area / Rooms */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Suprafață (m²)">
                                <input type="number" min="0" value={form.area_total} onChange={e => setF('area_total', e.target.value)} className={inp} placeholder="55" />
                            </Field>
                            <Field label="Camere">
                                <input type="number" min="0" value={form.rooms} onChange={e => setF('rooms', e.target.value)} className={inp} placeholder="2" />
                            </Field>
                        </div>

                        {/* Floor */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Etaj">
                                <input type="number" value={form.floor} onChange={e => setF('floor', e.target.value)} className={inp} placeholder="4" />
                            </Field>
                            <Field label="Total etaje">
                                <input type="number" value={form.floors_total} onChange={e => setF('floors_total', e.target.value)} className={inp} placeholder="9" />
                            </Field>
                        </div>

                        {/* Price */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Field label="Preț">
                                    <input type="number" min="0" value={form.price} onChange={e => setF('price', e.target.value)} className={inp} placeholder="65000" />
                                </Field>
                            </div>
                            <div className="w-24">
                                <Field label="Valută">
                                    <select value={form.currency} onChange={e => setF('currency', e.target.value)} className={inp}>
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="MDL">MDL</option>
                                    </select>
                                </Field>
                            </div>
                        </div>

                        {/* Condition */}
                        <Field label="Stare">
                            <select value={form.meta.condition} onChange={e => setMeta('condition', e.target.value)} className={inp}>
                                {CONDITIONS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                            </select>
                        </Field>

                        {/* Features */}
                        <Field label="Dotări">
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {FEATURES.map(f => (
                                    <Toggle key={f.k} active={!!form.meta[f.k]} onToggle={() => setMeta(f.k, !form.meta[f.k])} label={f.l} />
                                ))}
                            </div>
                        </Field>
                    </div>

                    {/* ── RIGHT: AI panel ── */}
                    <div className="xl:col-span-3 space-y-4">

                        {/* Error banner */}
                        {error && (
                            <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700 flex items-start gap-2">
                                <span className="mt-0.5">⚠</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex border-b border-slate-100">
                                {[
                                    { id: 'description', icon: '📝', label: 'Generare Descriere' },
                                    { id: 'price',       icon: '💰', label: 'Estimare Preț' },
                                ].map(t => (
                                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                            tab === t.id
                                                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}>
                                        <span>{t.icon}</span>{t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 space-y-5">

                                {/* ── DESCRIPTION TAB ── */}
                                {tab === 'description' && (
                                    <>
                                        {/* Limba */}
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Limbă output</p>
                                            <div className="flex gap-2">
                                                {LOCALES.map(o => (
                                                    <button key={o.v} type="button" onClick={() => setLocale(o.v)}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                                            locale === o.v
                                                                ? 'bg-blue-700 text-white border-blue-700'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                                        }`}>
                                                        {o.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Stil */}
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Stil</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {STYLES.map(o => (
                                                    <button key={o.v} type="button" onClick={() => setStyle(o.v)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors text-left ${
                                                            style === o.v
                                                                ? 'bg-blue-700 text-white border-blue-700'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                                        }`}>
                                                        <span>{o.l}</span>
                                                        <span className={`text-[10px] font-normal ${style === o.v ? 'text-blue-200' : 'text-slate-400'}`}>{o.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Generate button */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <button type="button" onClick={generateDescription} disabled={descLoading}
                                                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-slate-900 to-blue-700 hover:from-slate-800 hover:to-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow transition-all disabled:opacity-60">
                                                {descLoading ? <Spinner /> : <span>✨</span>}
                                                {descLoading ? 'Se generează…' : (descResult ? 'Regenerează' : 'Generează descriere')}
                                            </button>
                                            {descResult && variantCount < 3 && (
                                                <button type="button" onClick={generateDescription} disabled={descLoading}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50">
                                                    ↻ Alt variant ({variantCount}/3)
                                                </button>
                                            )}
                                        </div>

                                        {/* Result */}
                                        {descResult && (
                                            <div className="space-y-4 border-t border-slate-100 pt-5">
                                                {/* Title */}
                                                {descResult.title && (
                                                    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Titlu generat</p>
                                                        <p className="text-sm font-semibold text-slate-800">{descResult.title}</p>
                                                    </div>
                                                )}

                                                {/* Editable description */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Descriere — editabil</p>
                                                        <button type="button" onClick={copyText}
                                                            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                                                            {copied ? '✓ Copiat!' : '📋 Copiază'}
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={editedDesc}
                                                        onChange={e => setEditedDesc(e.target.value)}
                                                        rows={7}
                                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                                    />
                                                    <p className="text-[11px] text-slate-400 mt-1">{editedDesc.length} caractere</p>
                                                </div>

                                                {/* SEO Tags */}
                                                {descResult.seo_tags?.length > 0 && (
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">SEO Tags</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {descResult.seo_tags.map((tag, i) => (
                                                                <span key={i} onClick={() => { navigator.clipboard.writeText(tag); }}
                                                                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                                                                    title="Click pentru a copia">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1">Click pe tag pentru a copia</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── PRICE TAB ── */}
                                {tab === 'price' && (
                                    <>
                                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 space-y-1">
                                            <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">AI analizează:</p>
                                            <ul className="text-xs space-y-0.5 text-slate-500">
                                                <li>• Tip proprietate, locație și suprafață</li>
                                                <li>• Prețurile medii din zona selectată</li>
                                                <li>• Abaterea față de piața curentă din Moldova</li>
                                            </ul>
                                        </div>

                                        <button type="button" onClick={estimatePrice} disabled={priceLoading}
                                            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow transition-all disabled:opacity-60">
                                            {priceLoading ? <Spinner /> : <span>🔮</span>}
                                            {priceLoading ? 'Se calculează…' : (priceResult ? 'Recalculează' : 'Estimează prețul')}
                                        </button>

                                        {priceResult && valCfg && (
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4 border-t border-slate-100 pt-5">
                                                {/* Price range + badge */}
                                                <div className="flex items-end justify-between gap-3">
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Estimare AI</p>
                                                        <p className="text-3xl font-bold text-slate-900">
                                                            {priceResult.min && priceResult.max
                                                                ? `€${Number(priceResult.min).toLocaleString('ro')} – €${Number(priceResult.max).toLocaleString('ro')}`
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                    <span className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${valCfg.bg} ${valCfg.text}`}>
                                                        ● {valCfg.label}
                                                    </span>
                                                </div>

                                                {/* Stats grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {priceResult.regional_avg && (
                                                        <div className="rounded-xl bg-white border border-slate-100 p-3">
                                                            <p className="text-[11px] text-slate-400 mb-0.5">Medie regională</p>
                                                            <p className="font-bold text-slate-700">€{Number(priceResult.regional_avg).toLocaleString('ro')}</p>
                                                        </div>
                                                    )}
                                                    <div className="rounded-xl bg-white border border-slate-100 p-3">
                                                        <p className="text-[11px] text-slate-400 mb-0.5">Abatere față de piață</p>
                                                        <p className={`font-bold ${devPct < -5 ? 'text-emerald-600' : devPct > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                                                            {devPct > 0 ? '+' : ''}{devPct}%
                                                            <span className="text-[10px] font-normal text-slate-400 ml-1 block">
                                                                {Math.abs(devPct) <= 10 ? 'în rândul pieței' : devPct > 10 ? 'supraestimat' : 'oportunitate'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Confidence bar */}
                                                {priceResult.confidence != null && (
                                                    <div>
                                                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                                            <span>Grad de certitudine al modelului</span>
                                                            <span className="font-bold text-slate-600">{priceResult.confidence}%</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-700 ${valCfg.bar}`}
                                                                style={{ width: `${priceResult.confidence}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Reason */}
                                                {priceResult.reason && (
                                                    <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                                                        <span className="font-semibold text-slate-700">Motivare: </span>{priceResult.reason}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tip card */}
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 px-5 py-4 text-sm text-blue-700">
                            <p className="font-semibold mb-1">💡 Sfat</p>
                            <p className="text-xs leading-relaxed text-blue-600">
                                Cu cât completezi mai multe câmpuri (suprafață, etaj, dotări), cu atât descrierea și estimarea vor fi mai precise.
                                Poți copia textul generat direct în anunț.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
