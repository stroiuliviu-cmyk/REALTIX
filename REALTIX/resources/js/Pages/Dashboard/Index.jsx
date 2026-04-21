import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';

function StatsCard({ title, value, sub }) {
    return (
        <div className="rounded-3xl bg-white/10 p-5 border border-white/10 backdrop-blur">
            <div className="text-sm text-blue-100">{title}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
            {sub && <div className="text-xs text-blue-200 mt-1">{sub}</div>}
        </div>
    );
}

function PropertyCard({ property }) {
    const cover = property.cover_media;
    return (
        <div className="overflow-hidden rounded-3xl bg-white shadow hover:shadow-xl transition-shadow border border-slate-100">
            <div className="h-44 bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                {cover ? (
                    <img src={`/storage/${cover.thumb_path || cover.path}`} alt={property.title} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-3xl">🏠</span>
                )}
            </div>
            <div className="p-5">
                <div className="text-lg font-bold line-clamp-1">{property.title}</div>
                <div className="mt-1 text-sm text-slate-500">
                    {property.city}{property.district ? ` • ${property.district}` : ''}{property.area_total ? ` • ${property.area_total} m²` : ''}{property.rooms ? ` • ${property.rooms} cam.` : ''}
                </div>
                <div className="mt-4 text-3xl font-bold text-emerald-600">
                    {property.price ? `€${Number(property.price).toLocaleString('ro')}` : 'Preț negociabil'}
                </div>
                <Link
                    href={`/properties/${property.id}`}
                    className="mt-4 block w-full rounded-2xl bg-slate-900 py-3 text-white hover:bg-slate-800 transition-colors text-center text-sm font-semibold"
                >
                    Vezi detalii
                </Link>
            </div>
        </div>
    );
}

export default function Index({ stats, recentProperties, recentContacts }) {
    const filters = ['Oraș', 'Tip', 'Camere', 'Preț', 'Suprafață'];

    return (
        <AppLayout>
            <Head title="Panou principal" />
            <div className="space-y-6">
                {/* Hero banner */}
                <section className="rounded-3xl bg-blue-700 p-10 text-white shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="text-sm uppercase opacity-80 tracking-widest">REALTIX PLATFORM</div>
                            <h1 className="mt-2 text-4xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Construiește agenția imobiliară a viitorului
                            </h1>
                            <p className="mt-3 text-blue-100">Lead-uri, proprietăți, automatizare și AI într-o platformă SaaS vândabilă regional.</p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link href="/properties/create" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100 transition-colors text-sm">
                                    Adaugă proprietate
                                </Link>
                                <Link href="/contacts" className="rounded-full border border-white px-6 py-3 hover:bg-white/10 transition-colors text-sm">
                                    Gestionează CRM
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatsCard title="Total anunțuri" value={stats.properties} />
                            <StatsCard title="Clienți activi" value={stats.contacts} />
                            <StatsCard
                                title="Venit lunar"
                                value={stats.monthly_revenue > 0 ? `€${Number(stats.monthly_revenue).toLocaleString('ro')}` : '—'}
                            />
                            <StatsCard title="Tranzacții finalizate" value={stats.closed_deals} />
                        </div>
                    </div>
                </section>

                {/* Quick search */}
                <section className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
                    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold">Căutare inteligentă</h2>
                        <Link href="/properties" className="rounded-2xl bg-slate-900 px-5 py-2 text-white hover:bg-slate-800 transition-colors text-sm font-semibold">
                            Toate proprietățile
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {filters.map((item) => (
                            <input key={item} placeholder={item} className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm" />
                        ))}
                    </div>
                </section>

                {/* Recent properties */}
                {recentProperties.length > 0 && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {recentProperties.map(property => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </section>
                )}

                {/* CRM + AI */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
                        <h3 className="mb-4 font-bold">Flux clienți recenți</h3>
                        {recentContacts.length === 0 ? (
                            <div className="text-slate-400 text-sm py-4 text-center">
                                Niciun client încă.{' '}
                                <Link href="/contacts" className="text-blue-700 hover:underline">Adaugă primul client</Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentContacts.map(contact => (
                                    <div key={contact.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                        <span className="font-semibold text-slate-700">
                                            {contact.first_name} {contact.last_name}
                                        </span>
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                                            contact.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                            contact.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {contact.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link href="/contacts" className="mt-4 block text-sm font-semibold text-blue-700 hover:underline">
                            Vezi tot CRM-ul →
                        </Link>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100 flex flex-col justify-between">
                        <div>
                            <h3 className="mb-4 font-bold">Asistent AI</h3>
                            <textarea
                                className="h-32 w-full rounded-2xl border border-slate-200 p-4 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 resize-none text-sm"
                                placeholder="Generează descriere anunț sau estimează valoarea proprietății..."
                            />
                        </div>
                        <Link
                            href="/ai"
                            className="mt-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 px-5 py-3 text-white shadow-lg hover:shadow-xl transition-shadow text-center text-sm font-semibold"
                        >
                            Rulează AI
                        </Link>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
