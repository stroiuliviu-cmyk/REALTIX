import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';

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

const LOCALES   = [{ v: 'ro', l: 'RO' }, { v: 'ru', l: 'RU' }, { v: 'en', l: 'EN' }];
const STYLES    = [
    { v: 'short',    l: 'Scurt' },
    { v: 'detailed', l: 'Detaliat' },
    { v: 'formal',   l: 'Oficial' },
    { v: 'emotional',l: 'Emoțional' },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function csrf() {
    return document.head.querySelector('meta[name="csrf-token"]')?.content ?? '';
}

async function apiFetch(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrf(),
            'Accept': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const json = await r.json();
    // Backend returns {error: "..."} on 422 with user-readable message
    if (!r.ok) throw new Error(json?.error ?? `Eroare HTTP ${r.status}`);
    return json;
}

// ── small components ─────────────────────────────────────────────────────────
function Pill({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                active
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
        >
            {children}
        </button>
    );
}

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}

// ── AI Description Panel ─────────────────────────────────────────────────────
function AiDescriptionPanel({ property }) {
    const [locale,      setLocale]      = useState('ro');
    const [style,       setStyle]       = useState('detailed');
    const [loading,     setLoading]     = useState(false);
    const [result,      setResult]      = useState(null);   // {title, description, seo_tags}
    const [editedDesc,  setEditedDesc]  = useState('');
    const [variantCount,setVariantCount]= useState(0);
    const [saving,      setSaving]      = useState(false);
    const [saved,       setSaved]       = useState(false);
    const [error,       setError]       = useState('');

    const propertyData = {
        type: property.type, transaction_type: property.transaction_type,
        city: property.city, district: property.district,
        area_total: property.area_total, rooms: property.rooms,
        floor: property.floor, floors_total: property.floors_total,
        price: property.price, currency: property.currency,
        meta: property.meta ?? {},
    };

    const generate = useCallback(async () => {
        setLoading(true); setError(''); setSaved(false);
        try {
            const data = await apiFetch('/ai/generate', { property_id: property.id, locale, style, data: propertyData });
            setResult(data);
            setEditedDesc(data.description ?? '');
            setVariantCount(c => c + 1);
        } catch (e) {
            setError(e.message || 'Eroare la generare. Verificați ANTHROPIC_API_KEY în .env.');
        } finally {
            setLoading(false);
        }
    }, [locale, style]);

    const saveDescription = useCallback(async () => {
        setSaving(true); setSaved(false);
        try {
            await apiFetch(`/properties/${property.id}/ai/save-description`, {
                locale, text: editedDesc,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e.message || 'Eroare la salvare.');
        } finally {
            setSaving(false);
        }
    }, [property.id, locale, editedDesc]);

    return (
        <div className="space-y-4">
            {/* Selectors row */}
            <div className="flex flex-wrap gap-4">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Limbă</p>
                    <div className="flex gap-1.5">
                        {LOCALES.map(o => (
                            <Pill key={o.v} active={locale === o.v} onClick={() => setLocale(o.v)}>{o.l}</Pill>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Stil</p>
                    <div className="flex flex-wrap gap-1.5">
                        {STYLES.map(o => (
                            <Pill key={o.v} active={style === o.v} onClick={() => setStyle(o.v)}>{o.l}</Pill>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={generate}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-linear-to-r from-slate-900 to-blue-700 hover:from-slate-800 hover:to-blue-600 text-white px-5 py-2.5 text-sm font-semibold shadow transition-all disabled:opacity-60"
                >
                    {loading ? <Spinner /> : <span>✨</span>}
                    {loading ? 'Se generează…' : (result ? 'Regenerează' : 'Generează descriere')}
                </button>

                {result && variantCount < 3 && (
                    <button
                        type="button"
                        onClick={generate}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                        <span>↻</span> Alt variant ({variantCount}/3)
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Result area */}
            {result && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                    {/* Generated title */}
                    {result.title && (
                        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5">
                            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">Titlu generat</p>
                            <p className="text-sm font-semibold text-slate-800">{result.title}</p>
                        </div>
                    )}

                    {/* Editable description */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                            Descriere — editabil
                        </p>
                        <textarea
                            value={editedDesc}
                            onChange={e => setEditedDesc(e.target.value)}
                            rows={6}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">{editedDesc.length} caractere</p>
                    </div>

                    {/* SEO tags */}
                    {result.seo_tags?.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">SEO Tags</p>
                            <div className="flex flex-wrap gap-1.5">
                                {result.seo_tags.map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Save button */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={saveDescription}
                            disabled={saving || !editedDesc}
                            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            {saving ? <Spinner /> : '💾'}
                            {saving ? 'Se salvează…' : `Salvează descriere (${locale.toUpperCase()})`}
                        </button>
                        {saved && <span className="text-sm text-emerald-600 font-medium">✓ Salvat!</span>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── AI Price Panel ────────────────────────────────────────────────────────────
function AiPricePanel({ property }) {
    const [loading, setLoading] = useState(false);
    const [result,  setResult]  = useState(() => {
        if (property.meta?.ai_price_min) {
            return {
                min:           property.meta.ai_price_min,
                max:           property.meta.ai_price_max,
                currency:      'EUR',
                valuation:     property.ai_valuation ?? 'average',
                reason:        property.meta.ai_price_reason ?? '',
                confidence:    property.meta.ai_confidence ?? null,
                regional_avg:  property.meta.ai_regional_avg ?? null,
                deviation_pct: property.meta.ai_deviation_pct ?? 0,
            };
        }
        return null;
    });
    const [error, setError] = useState('');

    const estimate = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await apiFetch('/ai/estimate', {
                property_id: property.id,
                data: {
                    type: property.type, transaction_type: property.transaction_type,
                    city: property.city, district: property.district,
                    area_total: property.area_total, rooms: property.rooms,
                    floor: property.floor, price: property.price, currency: property.currency,
                },
            });
            setResult(data);

            // Persist to property meta via queue job (fire & forget)
            fetch(`/properties/${property.id}/ai/price`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            }).catch(() => {});
        } catch (e) {
            setError(e.message || 'Eroare la estimare. Verificați ANTHROPIC_API_KEY în .env.');
        } finally {
            setLoading(false);
        }
    }, [property]);

    const cfg    = result ? (VALUATION_CONFIG[result.valuation] ?? VALUATION_CONFIG.average) : null;
    const devPct = result?.deviation_pct ?? 0;

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={estimate}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white px-5 py-2.5 text-sm font-semibold shadow transition-all disabled:opacity-60"
            >
                {loading ? <Spinner /> : <span>🔮</span>}
                {loading ? 'Se calculează…' : (result ? 'Recalculează prețul' : 'Estimează prețul AI')}
            </button>

            {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}

            {result && cfg && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4">
                    {/* Price range */}
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Estimare AI</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {result.min && result.max
                                    ? `€${Number(result.min).toLocaleString('ro')} – €${Number(result.max).toLocaleString('ro')}`
                                    : '—'
                                }
                            </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${cfg.bg} ${cfg.text}`}>
                            {cfg.dot} {cfg.label}
                        </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {result.regional_avg && (
                            <div className="rounded-xl bg-white border border-slate-100 p-3">
                                <p className="text-[11px] text-slate-400 mb-0.5">Medie regională</p>
                                <p className="font-bold text-slate-700">
                                    €{Number(result.regional_avg).toLocaleString('ro')}
                                </p>
                            </div>
                        )}
                        <div className="rounded-xl bg-white border border-slate-100 p-3">
                            <p className="text-[11px] text-slate-400 mb-0.5">Abatere față de piață</p>
                            <p className={`font-bold ${devPct < -5 ? 'text-emerald-600' : devPct > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                                {devPct > 0 ? '+' : ''}{devPct}%
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                    {Math.abs(devPct) <= 10 ? '(în rândul pieței)' : devPct > 10 ? '(supraestimat)' : '(oportunitate)'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Confidence bar */}
                    {result.confidence != null && (
                        <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                <span>Grad de certitudine al modelului</span>
                                <span className="font-bold text-slate-600">{result.confidence}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                                    style={{ width: `${result.confidence}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    {result.reason && (
                        <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                            <span className="font-semibold text-slate-700">Motivare: </span>{result.reason}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
const VIEWING_STATUS = {
    liked:    { l: '👍 Plăcut',     c: 'bg-emerald-100 text-emerald-700' },
    thinking: { l: '🤔 Se gândesc', c: 'bg-amber-100 text-amber-700' },
    rejected: { l: '👎 Refuz',      c: 'bg-red-100 text-red-600' },
    no_show:  { l: '🚫 N-au venit', c: 'bg-slate-100 text-slate-500' },
    pending:  { l: 'Programat',     c: 'bg-blue-100 text-blue-600' },
};

export default function Show({ property, contracts = [], viewings = [] }) {
    const { flash } = usePage().props;
    const [aiTab, setAiTab] = useState('description');

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
            <div className="max-w-5xl space-y-6">

                {(flash?.ai_queued || flash?.success) && (
                    <div className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3 text-sm text-blue-800">
                        {flash.ai_queued || flash.success}
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

                            {priceEstimate && (
                                <div className="mt-2 text-sm text-slate-500">
                                    Estimare AI: <span className="font-semibold text-slate-700">{priceEstimate}</span>
                                    {property.meta?.ai_price_reason && (
                                        <span className="text-xs ml-2 text-slate-400">({property.meta.ai_price_reason})</span>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Suprafață', value: property.area_total ? `${property.area_total} m²` : '—' },
                                    { label: 'Camere',    value: property.rooms ?? '—' },
                                    { label: 'Etaj',      value: property.floor ? `${property.floor}/${property.floors_total ?? '?'}` : '—' },
                                    { label: 'Tranzacție',value: property.transaction_type === 'sale' ? 'Vânzare' : 'Chirie' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                                        <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                        <div className="font-bold text-slate-900">{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Descriptions */}
                            {['ro', 'ru', 'en'].map(lang => {
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

                        {/* ── AI Tools Card ── */}
                        <div className="bg-white rounded-4xl shadow-xl border border-slate-100 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-2 px-8 pt-6 pb-0">
                                <span className="text-lg">✨</span>
                                <h2 className="font-bold text-slate-800 text-base">Instrumente AI</h2>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-0 mt-4 border-b border-slate-100 px-8">
                                {[
                                    { id: 'description', icon: '📝', label: 'Generare Descriere' },
                                    { id: 'price',       icon: '💰', label: 'Estimare Preț' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setAiTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                            aiTab === tab.id
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <span>{tab.icon}</span> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="p-8">
                                {aiTab === 'description' && <AiDescriptionPanel property={property} />}
                                {aiTab === 'price'       && <AiPricePanel property={property} />}
                            </div>
                        </div>
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
                            <div className="text-xs text-slate-400">{property.views_count} vizualizări</div>

                            <Link
                                href={`/properties/${property.id}/edit`}
                                className="block w-full text-center rounded-2xl bg-slate-900 py-3 text-white text-sm font-semibold hover:bg-slate-800 transition-colors mt-4"
                            >
                                ✏ Editează
                            </Link>
                            <Link
                                href={`/autopost?property_id=${property.id}`}
                                className="block w-full text-center rounded-2xl border border-blue-200 bg-blue-50 py-3 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
                            >
                                📤 Autopostare
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="block w-full text-center rounded-2xl border border-red-200 py-3 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                            >
                                Șterge
                            </button>
                        </div>

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
