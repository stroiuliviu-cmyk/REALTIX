import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

const valuationColors = {
    cheap:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    average:   'bg-amber-100 text-amber-700 border-amber-200',
    expensive: 'bg-red-100 text-red-700 border-red-200',
};
const valuationLabels = { cheap: '● Avantajos', average: '● Mediu', expensive: '● Scump' };

export default function Index({ listings = [] }) {
    return (
        <AppLayout title="Web Oferte">
            <Head title="Web Oferte" />
            <div className="space-y-6">
                {/* Filters bar */}
                <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input placeholder="Caută adresă, cuvinte cheie..." className="col-span-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700" />
                        <select className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm">
                            <option value="">Toate sursele</option>
                            <option value="999md">999.md</option>
                            <option value="imobiliare">Imobiliare.md</option>
                        </select>
                        <select className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm">
                            <option value="">Tip proprietar</option>
                            <option value="owner">Proprietar</option>
                            <option value="agency">Agenție</option>
                        </select>
                    </div>
                </div>

                {listings.length === 0 ? (
                    <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-16 text-center">
                        <div className="text-5xl mb-4">🌐</div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Nicio ofertă web încă</h2>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                            Scraper-ul REALTIX va colecta automat anunțuri de pe 999.md și alte surse. Configurează-l din Setări → Integrări.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {listings.map(l => (
                            <div key={l.id} className="rounded-4xl bg-white border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow group">
                                <div className="h-44 bg-slate-100 relative overflow-hidden">
                                    {l.images?.[0] ? (
                                        <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🏠</div>
                                    )}
                                    {l.ai_valuation && (
                                        <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border ${valuationColors[l.ai_valuation] ?? valuationColors.average}`}>
                                            {valuationLabels[l.ai_valuation]}
                                        </span>
                                    )}
                                    <span className="absolute top-3 left-3 bg-white/90 text-xs font-bold px-2.5 py-1 rounded-full text-slate-700">
                                        {l.source}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="font-bold text-slate-900 line-clamp-1">{l.title}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{l.city}{l.district ? ` • ${l.district}` : ''}</div>
                                    <div className="mt-3 flex items-end justify-between">
                                        <div className="text-xl font-black text-slate-900">
                                            {l.price ? `€${Number(l.price).toLocaleString('ro')}` : '—'}
                                        </div>
                                        {l.area && <div className="text-xs text-slate-400">{l.area} m²</div>}
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <a href={l.external_url} target="_blank" rel="noopener" className="flex-1 text-center rounded-2xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                            Sursă ↗
                                        </a>
                                        <button className="flex-1 rounded-2xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                                            + Adaugă la anunțuri
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
