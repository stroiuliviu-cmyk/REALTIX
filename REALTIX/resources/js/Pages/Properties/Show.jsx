import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const VALUATION_COLORS = {
    cheap:     'bg-emerald-100 text-emerald-700',
    average:   'bg-amber-100 text-amber-700',
    expensive: 'bg-red-100 text-red-600',
};
const VALUATION_LABELS = { cheap: '● Avantajos', average: '● Mediu', expensive: '● Scump' };
const STATUS_COLORS = {
    active: 'bg-emerald-100 text-emerald-700',
    sold:   'bg-blue-100 text-blue-700',
    rented: 'bg-purple-100 text-purple-700',
};
const STATUS_LABELS = { active: 'Activ', inactive: 'Inactiv', sold: 'Vândut', rented: 'Închiriat' };

function AiButton({ label, icon, processing, onClick }) {
    return (
        <button
            onClick={onClick}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
            <span>{icon}</span>
            {processing ? 'Se procesează...' : label}
        </button>
    );
}

export default function Show({ property }) {
    const { flash } = usePage().props;
    const [descProcessing, setDescProcessing] = useState(false);
    const [priceProcessing, setPriceProcessing] = useState(false);

    const handleDelete = () => {
        if (confirm('Sigur vrei să ștergi această proprietate?')) {
            router.delete(`/properties/${property.id}`);
        }
    };

    const generateDescription = (locale) => {
        setDescProcessing(true);
        router.post(`/properties/${property.id}/ai/description`, { locale }, {
            onFinish: () => setDescProcessing(false),
        });
    };

    const estimatePrice = () => {
        setPriceProcessing(true);
        router.post(`/properties/${property.id}/ai/price`, {}, {
            onFinish: () => setPriceProcessing(false),
        });
    };

    const priceEstimate = property.meta?.ai_price_min
        ? `€${Number(property.meta.ai_price_min).toLocaleString('ro')} – €${Number(property.meta.ai_price_max).toLocaleString('ro')}`
        : null;

    return (
        <AppLayout title={property.title}>
            <Head title={property.title} />
            <div className="max-w-4xl space-y-6">

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
                    {/* Main info */}
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
                                {property.ai_valuation && (
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${VALUATION_COLORS[property.ai_valuation]}`}>
                                        {VALUATION_LABELS[property.ai_valuation]}
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
                                    { label: 'Camere', value: property.rooms ?? '—' },
                                    { label: 'Etaj', value: property.floor ? `${property.floor}/${property.floors_total ?? '?'}` : '—' },
                                    { label: 'Tranzacție', value: property.transaction_type === 'sale' ? 'Vânzare' : 'Chirie' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                                        <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                        <div className="font-bold text-slate-900">{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* AI tools row */}
                            <div className="mt-6 pt-5 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Instrumente AI</div>
                                <div className="flex gap-3 flex-wrap">
                                    <AiButton
                                        icon="✨"
                                        label="Generează descriere RO"
                                        processing={descProcessing}
                                        onClick={() => generateDescription('ro')}
                                    />
                                    <AiButton
                                        icon="✨"
                                        label="Descriere RU"
                                        processing={descProcessing}
                                        onClick={() => generateDescription('ru')}
                                    />
                                    <AiButton
                                        icon="💰"
                                        label="Estimează prețul"
                                        processing={priceProcessing}
                                        onClick={estimatePrice}
                                    />
                                </div>
                            </div>

                            {/* Descriptions */}
                            {['ro', 'ru', 'en'].map(lang => {
                                const key = `description_${lang}`;
                                if (!property[key]) return null;
                                return (
                                    <div key={lang} className="mt-5">
                                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            Descriere
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{lang}</span>
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{property[key]}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions sidebar */}
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
                            <button
                                onClick={handleDelete}
                                className="block w-full text-center rounded-2xl border border-red-200 py-3 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                            >
                                Șterge
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
