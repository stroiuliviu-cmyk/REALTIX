import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';
import Badge from '@/Components/ui/Badge';
import { areaUnit } from '@/lib/propertyLabels';
import {
    AlertTriangle, ArrowRight, BarChart3, Banknote, Building,
    CalendarCheck, Clock, Globe, MapPin, RefreshCw, Sparkles,
    TrendingDown, TrendingUp, Users,
} from 'lucide-react';

// ─── Stat tile (enterprise) ──────────────────────────────────────────────────
// Vertical layout: icon + optional trend badge on row 1 (justify-between),
// then label / value / sub stacked below. Trend prop shape:
// { dir: 'up' | 'down', value: '+6' } — pass nothing to skip the badge.
function StatCard({ Icon, label, value, sub, href, trend }) {
    const Wrapper = href ? Link : 'div';
    const TrendIcon = trend?.dir === 'down' ? TrendingDown : TrendingUp;
    const trendColor = trend?.dir === 'down' ? 'text-slate-400' : 'text-emerald-600';

    return (
        <Wrapper
            href={href}
            className="block rounded-xl bg-white border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:border-slate-300/70 transition-all duration-200"
        >
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4.75 h-4.75" strokeWidth={2} />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold inline-flex items-center gap-0.5 shrink-0 tabular-nums ${trendColor}`}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        {trend.value}
                    </span>
                )}
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1.5 text-[28px] leading-none font-bold text-slate-900 tabular-nums">{value}</div>
            {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
        </Wrapper>
    );
}

function resolveImg(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `/storage/${path}`;
}

// ─── AI deal card (enterprise) ───────────────────────────────────────────────
// rounded-xl, building placeholder (no emoji), enterprise "Recomandat AI"
// badge on slate-900/85, valuation tag uses the design-system Badge primitive.
function AiDealCard({ listing, t }) {
    const VALUATION_LABEL = {
        cheap:     t('dashboard.valuation_cheap'),
        average:   t('dashboard.valuation_average'),
        expensive: t('dashboard.valuation_expensive'),
    };
    const tone  = listing.ai_valuation ?? 'average';
    const label = VALUATION_LABEL[tone] ?? VALUATION_LABEL.average;
    const img   = resolveImg(listing.images?.[0]);

    return (
        <div className="rounded-xl bg-white border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-300/70 transition-all duration-200 group">
            <div className="h-40 bg-slate-100 overflow-hidden relative">
                {img ? (
                    <img
                        src={img}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                    </div>
                )}
                {/* "Recomandat AI" pill — enterprise replacement for the old
                    emerald "Potrivit" tag. Sits top-left. */}
                <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-900/85 text-white backdrop-blur-sm">
                    Recomandat AI
                </span>
                {/* Valuation tag uses the design-system Badge primitive so
                    tone styling stays consistent with the rest of the app. */}
                <span className="absolute top-3 right-3">
                    <Badge tone={tone}>{label}</Badge>
                </span>
            </div>
            <div className="p-4">
                <div className="text-sm font-semibold text-slate-900 line-clamp-1">{listing.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                        {listing.city ?? ''}{listing.district ? ` • ${listing.district}` : ''}
                    </span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                    <div>
                        <div className="text-lg font-bold text-slate-900 tabular-nums">
                            {listing.price ? `€${Number(listing.price).toLocaleString('ro')}` : '—'}
                        </div>
                        {listing.area && <div className="text-xs text-slate-400">{listing.area} {areaUnit(listing.type)}</div>}
                    </div>
                    {listing.external_url ? (
                        <a
                            href={listing.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                            {t('common.details')}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    ) : (
                        <Link
                            href="/web-offers"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                            {t('common.details')}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

const formatMoney = (n) => (n > 0 ? `€${Number(n).toLocaleString('ro')}` : '—');

export default function Index({
    stats, hotDeals = [], lastUpdated,
    scrapedStats = {}, trends = {},
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
                tone:  'red',
                Icon:  AlertTriangle,
                title: 'Trial-ul a expirat',
                msg:   'Activează un abonament pentru a continua să folosești toate funcțiile.',
                cta:   'Vezi planuri',
            };
        }
        if (agency.on_trial && agency.trial_days_left !== null && agency.trial_days_left <= 7) {
            return {
                tone:  'amber',
                Icon:  Clock,
                title: `Trial: ${agency.trial_days_left} ${agency.trial_days_left === 1 ? 'zi rămasă' : 'zile rămase'}`,
                msg:   'Adaugă o metodă de plată ca să continui după trial fără întrerupere.',
                cta:   'Activează abonament',
            };
        }
        return null;
    })();

    // Trial banner palette by tone. Surface tints are slate-aware (theme.css
    // remaps amber-50 / red-50 to muted dark variants automatically).
    const TRIAL_PALETTE = {
        red:   {
            surface:  'bg-red-50 border-red-200 text-red-900',
            iconBg:   'bg-red-100 text-red-600',
            cta:      'bg-red-600 hover:bg-red-700',
        },
        amber: {
            surface:  'bg-amber-50 border-amber-200 text-amber-900',
            iconBg:   'bg-amber-100 text-amber-600',
            cta:      'bg-amber-600 hover:bg-amber-700',
        },
    };

    // Hero mini-stats — small icons match the StatCard icon family below so
    // the visual rhythm carries over. Lucide on white/5, text-blue-400 for
    // sober dark-hero contrast.
    const heroMiniStats = [
        { Icon: Building,  label: 'Anunțuri active',    value: Number(stats.active_properties ?? 0).toLocaleString('ro') },
        { Icon: Users,     label: 'Clienți noi',        value: Number(stats.buyers ?? 0).toLocaleString('ro') },
        { Icon: RefreshCw, label: 'Tranzacții în curs', value: Number(stats.active_deals ?? 0).toLocaleString('ro') },
        { Icon: Banknote,  label: 'Venit lunar',        value: formatMoney(stats.monthly_revenue) },
    ];

    return (
        <AppLayout>
            <Head title={t('dashboard.page_title')} />
            <div className="space-y-6">

                {trialBanner && (() => {
                    const palette = TRIAL_PALETTE[trialBanner.tone];
                    const Icon = trialBanner.Icon;
                    return (
                        <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap ${palette.surface}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${palette.iconBg}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold">{trialBanner.title}</div>
                                    <div className="text-sm opacity-80">{trialBanner.msg}</div>
                                </div>
                            </div>
                            <Link
                                href="/subscription"
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${palette.cta}`}
                            >
                                {trialBanner.cta}
                            </Link>
                        </div>
                    );
                })()}

                {/* ── Hero card — sober navy gradient, skyline whisper, welcome
                       eyebrow + name in Montserrat, agency line with Building
                       glyph, single CTA. Mini-stats stack on the right. ── */}
                <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 to-[#172a52] p-5 sm:p-6 text-white shadow-xl">
                    <svg
                        className="absolute right-12 top-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.06] pointer-events-none hidden md:block"
                        viewBox="0 0 120 100"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.2"
                        aria-hidden="true"
                    >
                        <rect x="10" y="45" width="16" height="50" />
                        <rect x="29" y="25" width="18" height="70" />
                        <rect x="50" y="38" width="14" height="57" />
                        <rect x="67" y="15" width="20" height="80" />
                        <rect x="90" y="50" width="15" height="45" />
                        <line x1="13" y1="52" x2="23" y2="52" /><line x1="13" y1="60" x2="23" y2="60" />
                        <line x1="13" y1="68" x2="23" y2="68" /><line x1="13" y1="76" x2="23" y2="76" />
                        <line x1="32" y1="32" x2="44" y2="32" /><line x1="32" y1="40" x2="44" y2="40" />
                        <line x1="32" y1="48" x2="44" y2="48" /><line x1="32" y1="56" x2="44" y2="56" />
                        <line x1="32" y1="64" x2="44" y2="64" /><line x1="32" y1="72" x2="44" y2="72" />
                        <line x1="53" y1="44" x2="61" y2="44" /><line x1="53" y1="52" x2="61" y2="52" />
                        <line x1="53" y1="60" x2="61" y2="60" /><line x1="53" y1="68" x2="61" y2="68" />
                        <line x1="70" y1="22" x2="84" y2="22" /><line x1="70" y1="30" x2="84" y2="30" />
                        <line x1="70" y1="38" x2="84" y2="38" /><line x1="70" y1="46" x2="84" y2="46" />
                        <line x1="70" y1="54" x2="84" y2="54" /><line x1="70" y1="62" x2="84" y2="62" />
                        <line x1="70" y1="70" x2="84" y2="70" />
                        <line x1="93" y1="57" x2="102" y2="57" /><line x1="93" y1="65" x2="102" y2="65" />
                        <line x1="93" y1="73" x2="102" y2="73" />
                    </svg>

                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                                {t('dashboard.welcome_back')}
                            </div>
                            <h1
                                className="text-2xl sm:text-3xl font-bold text-white mt-0.5"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                                {user?.name ?? '—'}
                            </h1>
                            {agency?.name && (
                                <div className="text-sm text-blue-200 mt-1 flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{agency.name}</span>
                                </div>
                            )}
                            <div className="mt-4">
                                <Link
                                    href="/statistics"
                                    className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-50 transition-colors"
                                >
                                    <BarChart3 className="w-4 h-4" strokeWidth={2.25} />
                                    Vezi statistici
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {heroMiniStats.map(({ Icon, label, value }) => (
                                <div key={label} className="rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm p-3 relative">
                                    <span className="absolute top-1.5 right-2.5 text-white/30 text-sm">›</span>
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-1.5">
                                        <Icon className="w-4 h-4 text-blue-400" strokeWidth={2} />
                                    </div>
                                    <div className="text-lg font-bold tabular-nums text-white leading-tight">{value}</div>
                                    <div className="text-[11px] text-blue-200">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6 stat cards (2/3 grid). Neutral slate icon tiles per the
                       enterprise system; trend badges available via the
                       optional `trend` prop once the controller ships deltas. */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Indicatori cheie</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatCard
                            Icon={Building} label="Imobiliare"
                            value={Number(stats.properties ?? 0).toLocaleString('ro')}
                            sub={`${stats.active_properties ?? 0} active`}
                            href="/properties"
                            trend={trends.properties}
                        />
                        <StatCard
                            Icon={Users} label="Clienți CRM"
                            value={Number(stats.contacts ?? 0).toLocaleString('ro')}
                            sub={`${stats.buyers ?? 0} cumpărători`}
                            href="/contacts"
                            trend={trends.contacts}
                        />
                        <StatCard
                            Icon={RefreshCw} label="Tranzacții / lună"
                            value={Number(stats.deals_month ?? 0).toLocaleString('ro')}
                            sub={`${stats.active_deals ?? 0} în curs`}
                            href="/deals"
                            trend={trends.deals_month}
                        />
                        <StatCard
                            Icon={Banknote} label="Venit / lună"
                            value={formatMoney(stats.monthly_revenue)}
                            sub="comision"
                            href="/statistics"
                        />
                        <StatCard
                            Icon={CalendarCheck} label="Vizionări"
                            value={Number(stats.upcoming_events ?? 0).toLocaleString('ro')}
                            sub="programate"
                            href="/calendar"
                            trend={trends.upcoming_events}
                        />
                        <StatCard
                            Icon={Globe} label="Web Oferte"
                            value={Number(scrapedStats.total ?? 0).toLocaleString('ro')}
                            sub={`+${Number(scrapedStats.last_7d ?? 0).toLocaleString('ro')} săpt`}
                            href="/web-offers"
                            trend={trends.web_offers}
                        />
                    </div>
                </section>

                {/* ── AI Hot Deals ── */}
                <section>
                    <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                Oferte recomandate de AI
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Oportunități cu potențial ridicat pentru portofoliul tău
                            </p>
                        </div>
                        <Link
                            href="/web-offers"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                            Vezi toate ofertele
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {hotDeals.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {hotDeals.slice(0, 6).map(deal => (
                                <AiDealCard key={deal.id} listing={deal} t={t} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white border border-slate-200/70 p-12 text-center shadow-sm">
                            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                            <div className="font-semibold text-slate-700 mb-1">{t('dashboard.no_web_title')}</div>
                            <p className="text-sm text-slate-400 mb-4">{t('dashboard.no_web_sub')}</p>
                            <Link
                                href="/web-offers"
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-white text-sm font-semibold transition-colors"
                            >
                                {t('dashboard.explore_web')}
                                <ArrowRight className="w-4 h-4" />
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
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t('dashboard.refresh')}
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
