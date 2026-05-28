import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';

const TYPE_LABELS = {
    apartment:  'Apartamente',
    house:      'Case',
    cottage:    'Vile',
    land:       'Terenuri',
    garage:     'Garaje',
    commercial: 'Comercial',
};

const TYPE_COLORS = {
    apartment:  '#3b82f6',
    house:      '#10b981',
    cottage:    '#14b8a6',
    land:       '#8b5cf6',
    garage:     '#64748b',
    commercial: '#f59e0b',
};

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

function AreaChart({ data = [], color = '#3b82f6', height = 240 }) {
    if (!data.length) {
        return (
            <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
                Nu sunt date.
            </div>
        );
    }
    const w = 600;
    const h = height;
    const padL = 32, padR = 12, padT = 12, padB = 24;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const max = Math.max(...data.map(d => d.count), 1);
    const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data.map((d, i) => {
        const x = padL + i * stepX;
        const y = padT + innerH - (d.count / max) * innerH;
        return [x, y, d];
    });
    const polyline = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const areaPath = `M${padL},${padT + innerH} L${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} L${padL + innerW},${padT + innerH} Z`;

    // Y-axis ticks: 0, mid, max.
    const ticks = [0, Math.round(max / 2), max];

    // X-axis labels: first, middle, last day (avoids overcrowding 30 ticks).
    const xLabels = [0, Math.floor(data.length / 2), data.length - 1].filter((v, i, arr) => arr.indexOf(v) === i);
    const fmtDay = (s) => {
        if (!s) return '';
        const d = new Date(s);
        return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
    };

    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
                <linearGradient id="dash-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Y grid lines + labels */}
            {ticks.map((t, i) => {
                const y = padT + innerH - (t / max) * innerH;
                return (
                    <g key={i}>
                        <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                        <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
                    </g>
                );
            })}
            {/* Area + line */}
            <path d={areaPath} fill="url(#dash-area-grad)" />
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {/* X labels */}
            {xLabels.map((i) => {
                const [x] = points[i];
                return (
                    <text key={i} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {fmtDay(data[i].day)}
                    </text>
                );
            })}
        </svg>
    );
}

function Donut({ data = [], size = 200 }) {
    const total = data.reduce((s, d) => s + d.count, 0);
    if (!total) {
        return (
            <div className="flex items-center justify-center text-sm text-slate-400" style={{ height: size }}>
                Nu sunt date.
            </div>
        );
    }
    const cx = size / 2, cy = size / 2;
    const outer = size / 2 - 4;
    const inner = outer * 0.62;

    let angle = -Math.PI / 2; // start at 12 o'clock
    const slices = data.map((d) => {
        const sweep = (d.count / total) * Math.PI * 2;
        const a0 = angle;
        const a1 = angle + sweep;
        angle = a1;
        const large = sweep > Math.PI ? 1 : 0;
        const p0 = [cx + outer * Math.cos(a0), cy + outer * Math.sin(a0)];
        const p1 = [cx + outer * Math.cos(a1), cy + outer * Math.sin(a1)];
        const p2 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
        const p3 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
        const dPath = [
            `M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`,
            `A ${outer} ${outer} 0 ${large} 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`,
            `L ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`,
            `A ${inner} ${inner} 0 ${large} 0 ${p3[0].toFixed(2)} ${p3[1].toFixed(2)}`,
            'Z',
        ].join(' ');
        return { d: dPath, color: TYPE_COLORS[d.type] ?? '#cbd5e1' };
    });

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
            {slices.map((s, i) => (
                <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2" />
            ))}
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
                {total.toLocaleString('ro')}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">
                listings
            </text>
        </svg>
    );
}

// ── Cards ───────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, href, color = '#3b82f6', sparkline }) {
    const Wrapper = href ? Link : 'div';
    return (
        <Wrapper
            href={href}
            className="rounded-2xl bg-white border border-slate-100 p-5 hover:shadow-md transition-shadow group block"
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${color}1f`, color }}
                >
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5 truncate">{value}</div>
                    {sub && <div className="text-xs text-slate-400 mt-0.5 truncate">{sub}</div>}
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
    stats, recentProperties, recentContacts, hotDeals = [], lastUpdated,
    growth = { week: 0, deals: 0 },
    scrapedStats = {},
    scrapedDaily = [],
    scrapedByType = [],
    autopostStats = {},
    sparklines = { properties: [], scraped: [] },
}) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const user = auth?.user;
    const agency = user?.agency;

    const typeLabels = {
        buyer:    t('contact_types.buyer'),
        seller:   t('contact_types.seller'),
        tenant:   t('contact_types.tenant'),
        landlord: t('contact_types.landlord'),
        developer:t('contact_types.developer'),
    };

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
    const growthColor = weekGrowth > 0 ? 'text-emerald-300' : weekGrowth < 0 ? 'text-rose-300' : 'text-blue-200';
    const growthArrow = weekGrowth > 0 ? '↑' : weekGrowth < 0 ? '↓' : '·';
    const totalTypes = scrapedByType.reduce((s, d) => s + d.count, 0);

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
                        <h1 className="text-2xl font-black text-slate-900 mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {user?.name ?? '—'}
                        </h1>
                    </div>
                    <Link
                        href="/properties/create"
                        className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        + Anunț nou
                    </Link>
                </div>

                {/* ── Hero card ── */}
                <section className="rounded-3xl bg-linear-to-br from-blue-600 via-blue-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-1">
                                Portofoliul tău
                            </div>
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className={`text-3xl font-black ${growthColor}`}>
                                    {growthArrow} {Math.abs(weekGrowth).toFixed(1)}%
                                </span>
                                <span className="text-sm text-blue-200">
                                    față de săptămâna trecută
                                </span>
                            </div>
                            {agency?.name && (
                                <div className="text-xs text-blue-300 mt-1">{agency.name}</div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link href="/statistics" className="rounded-2xl bg-white text-slate-900 px-4 py-2 text-sm font-bold hover:bg-blue-50 transition-colors">
                                    Vezi statistici
                                </Link>
                                <Link href="/web-offers" className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-bold hover:bg-white/15 transition-colors">
                                    Web Oferte
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Anunțuri active',     value: stats.active_properties ?? 0 },
                                { label: 'Clienți noi',         value: stats.buyers ?? 0 },
                                { label: 'Tranzacții în curs',  value: stats.active_deals ?? 0 },
                                { label: 'Venit lunar',         value: formatMoney(stats.monthly_revenue) },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 text-center">
                                    <div className="text-2xl font-black">{s.value}</div>
                                    <div className="text-[11px] text-blue-200 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6 stat cards with sparklines ── */}
                <section>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Indicatori cheie</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                            sub={`${stats.closed_deals ?? 0} tranzacții totale`}
                            href="/statistics" color="#f59e0b"
                        />
                        <StatCard
                            icon="📅" label="Vizionări"
                            value={Number(stats.upcoming_events ?? 0).toLocaleString('ro')}
                            sub="programate (7 zile)"
                            href="/calendar" color="#ec4899"
                        />
                        <StatCard
                            icon="🌐" label="Web Oferte"
                            value={Number(scrapedStats.total ?? 0).toLocaleString('ro')}
                            sub={`+${scrapedStats.today ?? 0} astăzi`}
                            href="/web-offers" color="#8b5cf6"
                            sparkline={sparklines.scraped}
                        />
                    </div>
                </section>

                {/* ── Charts row ── */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Anunțuri scrapate / zi</h3>
                                <p className="text-xs text-slate-400">ultimele 30 zile · sursa: 999.md</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-slate-900">
                                    {Number(scrapedStats.last_7d ?? 0).toLocaleString('ro')}
                                </div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-400">last 7d</div>
                            </div>
                        </div>
                        <AreaChart data={scrapedDaily} color="#3b82f6" height={240} />
                    </div>

                    <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Web Oferte pe tipuri</h3>
                        <div className="flex items-center justify-center">
                            <Donut data={scrapedByType} size={180} />
                        </div>
                        <div className="mt-4 space-y-1.5">
                            {scrapedByType.map(d => {
                                const pct = totalTypes > 0 ? ((d.count / totalTypes) * 100).toFixed(1) : '0.0';
                                return (
                                    <div key={d.type} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_COLORS[d.type] ?? '#cbd5e1' }} />
                                            <span className="text-slate-700">{TYPE_LABELS[d.type] ?? d.type}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-900">{d.count.toLocaleString('ro')}</span>
                                            <span className="text-slate-400 w-10 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {scrapedByType.length === 0 && (
                                <div className="text-center text-xs text-slate-400 py-2">Nu sunt date.</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── AI Hot Deals ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{t('dashboard.ai_title')}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.ai_sub')}</p>
                        </div>
                        <Link href="/web-offers" className="rounded-2xl bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
                            {t('dashboard.all_offers')}
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

                {/* ── Recent activity ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">{t('dashboard.recent_contacts')}</h3>
                            <Link href="/contacts" className="text-xs text-blue-700 font-semibold hover:underline">{t('dashboard.see_all')}</Link>
                        </div>
                        {recentContacts.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-3xl mb-2">👥</div>
                                <p className="text-sm text-slate-400">{t('dashboard.no_contacts')}</p>
                                <Link href="/contacts" className="mt-3 inline-block text-sm text-blue-700 font-semibold hover:underline">
                                    {t('dashboard.add_first_contact')}
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

                    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">{t('dashboard.recent_properties')}</h3>
                            <Link href="/properties" className="text-xs text-blue-700 font-semibold hover:underline">{t('dashboard.see_all')}</Link>
                        </div>
                        {recentProperties.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-3xl mb-2">🏠</div>
                                <p className="text-sm text-slate-400">{t('dashboard.no_properties')}</p>
                                <Link href="/properties/create" className="mt-3 inline-block text-sm text-blue-700 font-semibold hover:underline">
                                    {t('dashboard.add_first_property')}
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
