import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';

const valuationColors = {
    cheap: 'bg-emerald-100 text-emerald-700',
    average: 'bg-amber-100 text-amber-700',
    expensive: 'bg-red-100 text-red-600',
};

export default function Show({ property }) {
    const handleDelete = () => {
        if (confirm('Sigur vrei să ștergi această proprietate?')) {
            router.delete(`/properties/${property.id}`);
        }
    };

    return (
        <AppLayout title={property.title}>
            <Head title={property.title} />
            <div className="max-w-4xl space-y-6">
                {/* Media gallery */}
                <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
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
                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                                    <p className="text-slate-500 mt-1">
                                        {property.city}{property.district ? `, ${property.district}` : ''}
                                        {property.address ? ` • ${property.address}` : ''}
                                    </p>
                                </div>
                                {property.ai_valuation && (
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${valuationColors[property.ai_valuation]}`}>
                                        AI: {property.ai_valuation}
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 text-4xl font-bold text-emerald-600">
                                {property.price ? `€${Number(property.price).toLocaleString('ro')}` : 'Preț negociabil'}
                            </div>

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

                            {property.description_ro && (
                                <div className="mt-6">
                                    <h3 className="font-bold text-slate-900 mb-2">Descriere</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{property.description_ro}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions sidebar */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 space-y-3">
                            <div className="text-xs text-slate-500 mb-3">
                                Agent: <span className="font-semibold text-slate-700">{property.user?.name}</span>
                            </div>
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                property.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                property.status === 'sold' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {property.status}
                            </div>
                            <div className="text-xs text-slate-400">{property.views_count} vizualizări</div>

                            <Link
                                href={`/properties/${property.id}/edit`}
                                className="block w-full text-center rounded-2xl bg-slate-900 py-3 text-white text-sm font-semibold hover:bg-slate-800 transition-colors mt-4"
                            >
                                Editează
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
