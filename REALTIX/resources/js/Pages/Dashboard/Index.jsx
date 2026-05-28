import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';

// ── Inline SVG primitives (no recharts dependency) ─────────────────────────
function Sparkline({ data = [], color = '#3b82f6', height = 36 }) {
    if (!data.length) {
        return <div className="text-[10px] text-slate-300">—</div>;
    }
    const w = 120;
    const h = height;
    const max = Math.max(...data, 1);
    const stepX = data.length > 1 ? w / (data.length - 1) : w;
    const points = data.map((v, i) => {
        const x = i * stepX;
        const y = h - (v / max) * (h - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const areaPath = `M0,${h} L${points.replaceAll(' ', ' L')} L${w},${h} Z`;
    const gradId = `spark-${color.replace('#', '')}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

// ── Cards ───────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, href, color = '#3b82f6', sparkline }) {
    const Wrapper = href ? Link : 'div';
    return (
        <Wrapper
            href={href}
            className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group block"
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${color}1f`, color }}
                >
                    {icon}
                </div>
                <div className="flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="text-3xl font-black text-slate-900 mt-0.5 tabular-nums">{value}</div>
                    {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
                </div>
            </div>
            {sparkline && sparkline.length > 0 && (
                <div className="mt-3 -mx-1">
                    <Sparkline data={sparkline} color={color} height={36} />
                </div>
            )}
        </Wrapper>
    );
}

function resolveImg(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `/storage/${path}`;
}

function AiDealCard({ listing, t }) {
    const badge = {
        cheap:     { label: t('dashboard.valuation_cheap'),    cls: 'bg-emerald-100 text-emerald-700' },
        average:   { label: t('dashboard.valuation_average'),  cls: 'bg-amber-100 text-amber-700' },
        expensive: { label: t('dashboard.valuation_expensive'), cls: 'bg-red-100 text-red-700' },
    };
    const b = badge[listing.ai_valuation] ?? badge.average;
    const img = resolveImg(listing.images?.[0]);

    return (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="h-40 bg-slate-100 overflow-hidden relative">
                {img ? (
                    <img src={img} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">🏠</div>
                )}
                <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow">
                    Potrivit
                </span>
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
                    {listing.external_url ? (
                        <a href={listing.external_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 hover:underline">
                            {t('common.details')}
                        </a>
                    ) : (
                        <Link href="/web-offers" className="text-xs font-semibold text-blue-700 hover:underline">{t('common.details')}</Link>
                    )}
                </div>
            </div>
        </div>
    );
}

const formatMoney = (n) => (n > 0 ? `€${Number(n).toLocaleString('ro')}` : '—');

export default function Index({
    stats, hotDeals = [], lastUpdated,
    growth = { week: 0, deals: 0 },
    scrapedStats = {},
    sparklines = { properties: [], scraped: [] },
}) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const user = auth?.user;
    const agency = user?.agency;

    const trialBanner = (() => {
        if (!agency) return null;
        if (user?.is_super_admin) return null;
        if (agency.subscription_active === false) {
            return {
                tone: 'red',
                title: 'Trial-ul a expirat',
                msg: 'Activează un abonament pentru a continua să folosești toate funcțiile.',
                cta: 'Vezi planuri',
            };
        }
        if (agency.on_trial && agency.trial_days_left !== null && agency.trial_days_left <= 7) {
            return {
                tone: 'amber',
                title: `Trial: ${agency.trial_days_left} ${agency.trial_days_left === 1 ? 'zi rămasă' : 'zile rămase'}`,
                msg: 'Adaugă o metodă de plată ca să continui după trial fără întrerupere.',
                cta: 'Activează abonament',
            };
        }
        return null;
    })();

    const weekGrowth = Number(growth.week ?? 0);
    const isGrowth = weekGrowth >= 0;
    const growthHeadline = isGrowth ? 'În creștere' : 'În scădere';
    const growthArrow = isGrowth ? '↑' : '↓';
    const growthColor = isGrowth ? 'text-emerald-400' : 'text-red-400';

    return (
        <AppLayout>
            <Head title={t('dashboard.page_title')} />
            <div className="space-y-6">

                {trialBanner && (
                    <div className={`rounded-3xl border p-5 flex items-center justify-between gap-4 flex-wrap ${
                        trialBanner.tone === 'red'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{trialBanner.tone === 'red' ? '⚠️' : '⏳'}</span>
                            <div>
                                <div className="font-bold">{trialBanner.title}</div>
                                <div className="text-sm opacity-80">{trialBanner.msg}</div>
                            </div>
                        </div>
                        <Link href="/subscription" className={`rounded-2xl px-4 py-2 text-sm font-bold text-white ${
                            trialBanner.tone === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}>
                            {trialBanner.cta}
                        </Link>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex items-end justify-between flex-wrap gap-3">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            {t('dashboard.welcome_back')}
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            <span>{user?.name ?? '—'}</span>
                            <span aria-hidden="true">👋</span>
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Iată ce se întâmplă cu afacerea ta astăzi.
                        </p>
                    </div>
                    <Link
                        href="/properties/create"
                        className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        + Anunț nou
                    </Link>
                </div>

                {/* ── Hero card (dark navy mockup + building watermark) ── */}
                <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-xl">
                    {/* Subtle building silhouette behind content — pointer-events-none
                        so links/buttons stay clickable through it. */}
                    <svg
                        className="absolute right-8 top-1/2 -translate-y-1/2 w-64 h-64 opacity-[0.07] pointer-events-none hidden md:block"
                        viewBox="0 0 100 100"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        aria-hidden="true"
                    >
                        <rect x="20" y="30" width="18" height="60" />
                        <rect x="42" y="15" width="20" height="75" />
                        <rect x="66" y="40" width="16" height="50" />
                        <line x1="24" y1="38" x2="34" y2="38" /><line x1="24" y1="46" x2="34" y2="46" />
                        <line x1="24" y1="54" x2="34" y2="54" /><line x1="24" y1="62" x2="34" y2="62" />
                        <line x1="47" y1="24" x2="57" y2="24" /><line x1="47" y1="32" x2="57" y2="32" />
                        <line x1="47" y1="40" x2="57" y2="40" /><line x1="47" y1="48" x2="57" y2="48" />
                        <line x1="47" y1="56" x2="57" y2="56" /><line x1="47" y1="64" x2="57" y2="64" />
                        <line x1="70" y1="48" x2="78" y2="48" /><line x1="70" y1="56" x2="78" y2="56" />
                        <line x1="70" y1="64" x2="78" y2="64" />
                    </svg>

                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3">
                                Performanța afacerii tale
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <h2 className="text-5xl font-black text-white">{growthHeadline}</h2>
                                <span className={`text-2xl font-black tabular-nums ${growthColor}`}>
                                    {growthArrow} {Math.abs(weekGrowth).toFixed(1)}%
                                </span>
                            </div>
                            <div className="text-sm text-blue-200 mt-2">
                                față de săptămâna trecută
                            </div>
                            {agency?.name && (
                                <div className="text-xs text-blue-300 mt-2">{agency.name}</div>
                            )}
                            <div className="mt-5 flex flex-wrap gap-2">
                                <Link href="/statistics" className="rounded-xl bg-white text-blue-900 px-4 py-2 text-sm font-bold shadow hover:bg-blue-50 transition-colors">
                                    Vezi statistici
                                </Link>
                                <Link href="/statistics" className="rounded-xl border border-white/25 bg-white/10 text-white px-4 py-2 text-sm font-bold hover:bg-white/20 transition-colors">
                                    Rapoarte detaliate
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: '🏠', label: 'Anunțuri active',    value: Number(stats.active_properties ?? 0).toLocaleString('ro') },
                                { icon: '👥', label: 'Clienți noi',        value: Number(stats.buyers ?? 0).toLocaleString('ro') },
                                { icon: '🔄', label: 'Tranzacții în curs', value: Number(stats.active_deals ?? 0).toLocaleString('ro') },
                                { icon: '💳', label: 'Venit lunar',        value: formatMoney(stats.monthly_revenue) },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4 relative">
                                    <span className="absolute top-2 right-3 text-blue-300/40">›</span>
                                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-3">
                                        {s.icon}
                                    </div>
                                    <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                                    <div className="text-xs text-blue-200 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6 stat cards with sparklines. 2/3/6 responsive grid:
                       text never clips on smaller breakpoints; on xl all six
                       sit in one row matching the mockup. ── */}
                <section>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Indicatori cheie</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard
                            icon="🏠" label="Anunțurile mele"
                            value={Number(stats.properties ?? 0).toLocaleString('ro')}
                            sub={`${stats.active_properties ?? 0} active`}
                            href="/properties" color="#3b82f6"
                            sparkline={sparklines.properties}
                        />
                        <StatCard
                            icon="👥" label="Clienți CRM"
                            value={Number(stats.contacts ?? 0).toLocaleString('ro')}
                            sub={`${stats.buyers ?? 0} cumpărători`}
                            href="/contacts" color="#10b981"
                        />
                        <StatCard
                            icon="🤝" label="Tranzacții / lună"
                            value={Number(stats.deals_month ?? 0).toLocaleString('ro')}
                            sub={`${stats.active_deals ?? 0} în curs`}
                            href="/deals" color="#14b8a6"
                        />
                        <StatCard
                            icon="💰" label="Venit / lună"
                            value={formatMoney(stats.monthly_revenue)}
                            sub="comision"
                            href="/statistics" color="#f59e0b"
                        />
                        <StatCard
                            icon="📅" label="Vizionări"
                            value={Number(stats.upcoming_events ?? 0).toLocaleString('ro')}
                            sub="programate"
                            href="/calendar" color="#ec4899"
                        />
                        <StatCard
                            icon="🌐" label="Web Oferte"
                            value={Number(scrapedStats.total ?? 0).toLocaleString('ro')}
                            sub={`+${Number(scrapedStats.last_7d ?? 0).toLocaleString('ro')} săpt`}
                            href="/web-offers" color="#8b5cf6"
                            sparkline={sparklines.scraped}
                        />
                    </div>
                </section>

                {/* ── AI Hot Deals ── */}
                <section>
                    <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span aria-hidden="true">✨</span>
                                Oferte recomandate de AI
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Oportunități cu potențial ridicat pentru portofoliul tău
                            </p>
                        </div>
                        <Link
                            href="/web-offers"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Vezi toate ofertele →
                        </Link>
                    </div>

                    {hotDeals.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {hotDeals.slice(0, 6).map(deal => (
                                <AiDealCard key={deal.id} listing={deal} t={t} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center">
                            <div className="text-4xl mb-3">✨</div>
                            <div className="font-bold text-slate-700 mb-1">{t('dashboard.no_web_title')}</div>
                            <p className="text-sm text-slate-400 mb-4">{t('dashboard.no_web_sub')}</p>
                            <Link href="/web-offers" className="inline-block rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold">
                                {t('dashboard.explore_web')}
                            </Link>
                        </div>
                    )}
                </section>

                {/* Bottom status bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
                    <span>
                        {t('dashboard.last_updated')} {lastUpdated ?? new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                        <span>↻</span> {t('dashboard.refresh')}
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
