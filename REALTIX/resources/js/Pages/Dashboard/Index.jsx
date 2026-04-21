import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';

const typeLabels = { buyer: 'Cumpărători', seller: 'Vânzători', tenant: 'Chiriași', landlord: 'Proprietari' };
const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

function StatCard({ icon, title, value, sub, href, color = 'blue' }) {
    const colors = {
        blue:   'from-blue-50 to-blue-100/50 border-blue-200/60',
        green:  'from-emerald-50 to-emerald-100/50 border-emerald-200/60',
        amber:  'from-amber-50 to-amber-100/50 border-amber-200/60',
        purple: 'from-purple-50 to-purple-100/50 border-purple-200/60',
        rose:   'from-rose-50 to-rose-100/50 border-rose-200/60',
        slate:  'from-slate-50 to-slate-100/50 border-slate-200/60',
    };
    const Wrapper = href ? Link : 'div';
    return (
        <Wrapper
            href={href}
            className={`rounded-3xl bg-linear-to-br ${colors[color]} border p-5 hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer group`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</div>
                    <div className="mt-1 text-3xl font-black text-slate-900">{value}</div>
                    {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
                </div>
                {href && <span className="text-slate-300 group-hover:text-slate-500 transition-colors text-xl mt-1">›</span>}
            </div>
        </Wrapper>
    );
}

function AiDealCard({ listing }) {
    const badge = {
        cheap:      { label: 'Avantajos', cls: 'bg-emerald-100 text-emerald-700' },
        average:    { label: 'Mediu',     cls: 'bg-amber-100 text-amber-700' },
        expensive:  { label: 'Scump',     cls: 'bg-red-100 text-red-700' },
    };
    const b = badge[listing.ai_valuation] ?? badge.average;

    return (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="h-40 bg-slate-100 overflow-hidden relative">
                {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">🏠</div>
                )}
                <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${b.cls}`}>{b.label}</span>
            </div>
            <div className="p-4">
                <div className="text-sm font-bold text-slate-900 line-clamp-1">{listing.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{listing.city ?? ''}{listing.district ? ` • ${listing.district}` : ''}</div>
                <div className="mt-2 flex items-end justify-between">
                    <div>
                        <div className="text-lg font-black text-slate-900">{listing.price ? `€${Number(listing.price).toLocaleString('ro')}` : '—'}</div>
                        {listing.area && <div className="text-xs text-slate-400">{listing.area} m²</div>}
                    </div>
                    <Link href={`/web-offers`} className="text-xs font-semibold text-blue-700 hover:underline">Detalii →</Link>
                </div>
            </div>
        </div>
    );
}

export default function Index({ stats, recentProperties, recentContacts, hotDeals = [], lastUpdated }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const agency = user?.agency;

    const planLabel  = { starter: 'Starter',  medium: 'Medium', pro: 'Pro' }[agency?.subscription_plan] ?? agency?.subscription_plan ?? '—';
    const planEnds   = agency?.subscription_ends_at
        ? new Date(agency.subscription_ends_at).toLocaleDateString('ro', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <AppLayout>
            <Head title="Panou principal" />
            <div className="space-y-6">

                {/* ─── Block 1: Welcome + Plan status ─── */}
                <section className="rounded-4xl bg-linear-to-br from-blue-700 via-blue-800 to-slate-900 p-8 text-white shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-1">Bun venit înapoi</div>
                            <h1 className="text-3xl font-black" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                {user?.name}
                            </h1>
                            {agency && (
                                <div className="text-blue-200 mt-1 text-sm">{agency.name}</div>
                            )}
                            <div className="mt-3 flex items-center gap-3 flex-wrap">
                                <span className="bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                                    Plan: {planLabel}
                                </span>
                                {planEnds && (
                                    <span className="text-xs text-blue-300">activ până la {planEnds}</span>
                                )}
                                <Link href="/subscription" className="bg-white text-slate-900 rounded-full px-4 py-1.5 text-xs font-bold hover:bg-blue-50 transition-colors">
                                    Actualizează planul
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 min-w-65">
                            {[
                                { label: 'Anunțuri', value: stats.properties },
                                { label: 'Clienți',  value: stats.contacts },
                                { label: 'Tranzacții', value: stats.closed_deals },
                                { label: 'Venit lunar', value: stats.monthly_revenue > 0 ? `€${Number(stats.monthly_revenue).toLocaleString('ro')}` : '—' },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl bg-white/10 border border-white/10 p-4 text-center">
                                    <div className="text-2xl font-black">{s.value}</div>
                                    <div className="text-xs text-blue-200 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Block 2: Stats cards ─── */}
                <section>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Statistici principale</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard
                            icon="🏠" title="Anunțuri în bază"
                            value={stats.properties}
                            sub={`${stats.active_properties ?? 0} active`}
                            href="/properties" color="blue"
                        />
                        <StatCard
                            icon="👥" title="Clienți"
                            value={stats.contacts}
                            sub={`${stats.buyers ?? 0} cumpărători`}
                            href="/contacts" color="purple"
                        />
                        <StatCard
                            icon="🤝" title="Tranzacții / lună"
                            value={stats.deals_month ?? 0}
                            href="/deals" color="green"
                        />
                        <StatCard
                            icon="💰" title="Venit / lună"
                            value={stats.monthly_revenue > 0 ? `€${Number(stats.monthly_revenue).toLocaleString('ro')}` : '—'}
                            href="/statistics" color="amber"
                        />
                        <StatCard
                            icon="📅" title="Vizionări"
                            value={stats.upcoming_events ?? 0}
                            sub="programate"
                            href="/calendar" color="rose"
                        />
                        <StatCard
                            icon="👁" title="Vizualizări"
                            value={stats.views_count ?? 0}
                            href="/statistics" color="slate"
                        />
                    </div>
                </section>

                {/* ─── Block 3: AI Hot Deals ─── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Oferte recomandate de AI</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Cele mai avantajoase oferte după evaluarea AI</p>
                        </div>
                        <Link href="/web-offers" className="rounded-2xl bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
                            Toate ofertele →
                        </Link>
                    </div>

                    {hotDeals.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {hotDeals.slice(0, 6).map(deal => (
                                <AiDealCard key={deal.id} listing={deal} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-4xl bg-white border border-slate-100 p-12 text-center">
                            <div className="text-4xl mb-3">✨</div>
                            <div className="font-bold text-slate-700 mb-1">Niciun anunț Web încă</div>
                            <p className="text-sm text-slate-400 mb-4">Scraper-ul va popula automat oferte avantajoase din 999.md</p>
                            <Link href="/web-offers" className="inline-block rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold">
                                Explorează Web Oferte
                            </Link>
                        </div>
                    )}
                </section>

                {/* ─── Recent activity ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Recent contacts */}
                    <div className="rounded-4xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Clienți recenți</h3>
                            <Link href="/contacts" className="text-xs text-blue-700 font-semibold hover:underline">Vezi tot →</Link>
                        </div>
                        {recentContacts.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-3xl mb-2">👥</div>
                                <p className="text-sm text-slate-400">Niciun client încă</p>
                                <Link href="/contacts" className="mt-3 inline-block text-sm text-blue-700 font-semibold hover:underline">
                                    Adaugă primul client
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentContacts.slice(0, 5).map(contact => (
                                    <Link
                                        key={contact.id}
                                        href={`/contacts/${contact.id}`}
                                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-slate-200 hover:bg-white transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                {contact.first_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{contact.first_name} {contact.last_name}</div>
                                                <div className="text-xs text-slate-400">{typeLabels[contact.type] ?? contact.type}</div>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            contact.status === 'active'  ? 'bg-emerald-100 text-emerald-700' :
                                            contact.status === 'lead'    ? 'bg-amber-100 text-amber-700' :
                                            contact.status === 'closed'  ? 'bg-slate-100 text-slate-500' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {contact.status}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent properties */}
                    <div className="rounded-4xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Anunțuri recente</h3>
                            <Link href="/properties" className="text-xs text-blue-700 font-semibold hover:underline">Vezi tot →</Link>
                        </div>
                        {recentProperties.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-3xl mb-2">🏠</div>
                                <p className="text-sm text-slate-400">Niciun anunț încă</p>
                                <Link href="/properties/create" className="mt-3 inline-block text-sm text-blue-700 font-semibold hover:underline">
                                    Adaugă primul anunț
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentProperties.slice(0, 5).map(p => (
                                    <Link
                                        key={p.id}
                                        href={`/properties/${p.id}`}
                                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-slate-200 hover:bg-white transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                                            {p.cover_media ? (
                                                <img src={`/storage/${p.cover_media.thumb_path || p.cover_media.path}`} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-slate-800 truncate">{p.title}</div>
                                            <div className="text-xs text-slate-400">{p.city}{p.rooms ? ` • ${p.rooms} cam.` : ''}{p.area_total ? ` • ${p.area_total} m²` : ''}</div>
                                        </div>
                                        <div className="text-sm font-bold text-emerald-600 shrink-0">
                                            {p.price ? `€${Number(p.price).toLocaleString('ro')}` : '—'}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom status bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
                    <span>
                        Ultima actualizare: {lastUpdated ?? new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                        <span>↻</span> Actualizează
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
