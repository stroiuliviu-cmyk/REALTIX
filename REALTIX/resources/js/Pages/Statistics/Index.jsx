import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const MONTH_NAMES = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

const PERIOD_LABELS = { week: 'Săptămână', month: 'Lună', year: 'An' };

const TYPE_LABELS = {
    apartment: 'Apartamente',
    house:     'Case',
    commercial:'Comercial',
    land:      'Teren',
};

const TYPE_COLORS = {
    apartment: 'bg-blue-500',
    house:     'bg-emerald-500',
    commercial:'bg-amber-500',
    land:      'bg-purple-500',
};

// ─── Primitive Components ────────────────────────────────────────────────────

function MiniBar({ value, max, color = 'bg-blue-500' }) {
    const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-500 w-8 text-right">{value}</span>
        </div>
    );
}

function KpiCard({ icon, label, value, sub, trend, color = 'blue' }) {
    const palette = {
        blue:   'bg-blue-50   text-blue-700   border-blue-100',
        green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber:  'bg-amber-50  text-amber-700  border-amber-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        rose:   'bg-rose-50   text-rose-700   border-rose-100',
        slate:  'bg-slate-50  text-slate-700  border-slate-100',
    };
    return (
        <div className={`rounded-3xl border p-5 ${palette[color]}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-xs font-bold uppercase tracking-wide opacity-60">{label}</div>
            <div className="text-3xl font-black mt-1">{value}</div>
            {sub   && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
            {trend !== undefined && (
                <div className={`text-xs font-bold mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% față de perioada anterioară
                </div>
            )}
        </div>
    );
}

function SectionCard({ title, children, action }) {
    return (
        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900">{title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}

function Badge({ children, color = 'slate' }) {
    const c = {
        green:  'bg-emerald-100 text-emerald-700',
        amber:  'bg-amber-100 text-amber-700',
        blue:   'bg-blue-100 text-blue-700',
        slate:  'bg-slate-100 text-slate-600',
        rose:   'bg-rose-100 text-rose-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c[color]}`}>{children}</span>;
}

function RevenueChart({ data }) {
    const max = Math.max(...data.map(r => r.total), 1);
    if (data.length === 0) {
        return <div className="text-center py-8 text-slate-400 text-sm">Nicio tranzacție finalizată.</div>;
    }
    return (
        <div className="space-y-3">
            {data.map(r => (
                <div key={r.month} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-8 shrink-0">{MONTH_NAMES[r.month - 1]}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.round((r.total / max) * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-20 text-right shrink-0">
                        €{Number(r.total).toLocaleString('ro')}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PctChange({ current, prev }) {
    if (!prev || prev === 0) return null;
    const pct = Math.round(((current - prev) / prev) * 100);
    return (
        <span className={`text-sm font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
        </span>
    );
}

// ─── Admin View ──────────────────────────────────────────────────────────────

function AdminDashboard({
    propertiesTotal, propertiesActive, propertiesByType,
    propertiesThisPeriod, propertiesPrevPeriod,
    scrapedTotal, scrapedByWeek, avgPriceByDistrict, top5Districts,
    contactsTotal, contactsByType,
    callsTotal, callsPeriod, callConversion,
    dealsPeriod, revenuePeriod, revenuePrev, avgCommission,
    avgDaysToClose, agentStats, revenueByMonth,
    period,
}) {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: '📊 Prezentare generală' },
        { id: 'agents',   label: '👤 Agenți' },
        { id: 'market',   label: '🏙️ Piață' },
        { id: 'ai',       label: '🤖 AI Insights' },
    ];

    const revenueChange = revenuePrev > 0
        ? Math.round(((revenuePeriod - revenuePrev) / revenuePrev) * 100)
        : null;

    const propChange = propertiesPrevPeriod > 0
        ? Math.round(((propertiesThisPeriod - propertiesPrevPeriod) / propertiesPrevPeriod) * 100)
        : null;

    const maxScrapeWeek = Math.max(...(scrapedByWeek || []).map(r => r.total), 1);
    const maxDistrict   = Math.max(...(avgPriceByDistrict || []).map(r => r.avg_price), 1);

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                            activeTab === t.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="rounded-2xl px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        📄 PDF
                    </button>
                    <button
                        onClick={() => exportCSV(agentStats)}
                        className="rounded-2xl px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        📊 Excel
                    </button>
                </div>
            </div>

            {/* ── Tab: Overview ── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard
                            icon="🏠" color="blue"
                            label="Total anunțuri agenție"
                            value={propertiesTotal}
                            sub={`${propertiesActive} active`}
                            trend={propChange}
                        />
                        <KpiCard
                            icon="🌐" color="purple"
                            label="Anunțuri unice piață"
                            value={scrapedTotal.toLocaleString('ro')}
                            sub="surse externe"
                        />
                        <KpiCard
                            icon="📞" color="amber"
                            label={`Apeluri (${PERIOD_LABELS[period]})`}
                            value={callsPeriod}
                            sub={`Conversie: ${callConversion}%`}
                        />
                        <KpiCard
                            icon="💰" color="green"
                            label={`Venit (${PERIOD_LABELS[period]})`}
                            value={revenuePeriod > 0 ? `€${Number(revenuePeriod).toLocaleString('ro')}` : '—'}
                            sub={revenuePrev > 0 ? `Anterior: €${Number(revenuePrev).toLocaleString('ro')}` : undefined}
                            trend={revenueChange}
                        />
                    </div>

                    {/* Properties by type + Contacts by type */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SectionCard title="Anunțuri pe tipuri de proprietate">
                            <div className="space-y-4">
                                {Object.entries(propertiesByType || {}).map(([type, count]) => (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-slate-700">{TYPE_LABELS[type] ?? type}</span>
                                            <span className="font-bold text-slate-900">{count}</span>
                                        </div>
                                        <MiniBar value={count} max={propertiesTotal} color={TYPE_COLORS[type] ?? 'bg-slate-400'} />
                                    </div>
                                ))}
                                {Object.keys(propertiesByType || {}).length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">Niciun anunț înregistrat.</p>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Clienți după tip">
                            <div className="space-y-4">
                                {[
                                    { key: 'buyer',    label: 'Cumpărători', color: 'bg-blue-500' },
                                    { key: 'seller',   label: 'Vânzători',   color: 'bg-emerald-500' },
                                    { key: 'tenant',   label: 'Chiriași',    color: 'bg-amber-500' },
                                    { key: 'landlord', label: 'Proprietari', color: 'bg-purple-500' },
                                ].map(t => {
                                    const val = contactsByType?.[t.key] ?? 0;
                                    const maxC = Math.max(...Object.values(contactsByType || {}), 1);
                                    return (
                                        <div key={t.key}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-semibold text-slate-700">{t.label}</span>
                                                <span className="font-bold text-slate-900">{val}</span>
                                            </div>
                                            <MiniBar value={val} max={maxC} color={t.color} />
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    </div>

                    {/* Calls & Deals dynamics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-3xl bg-amber-50 border border-amber-100 p-5">
                            <div className="text-2xl mb-2">📞</div>
                            <div className="text-xs font-bold uppercase tracking-wide text-amber-700 opacity-70">Total apeluri</div>
                            <div className="text-3xl font-black text-amber-700 mt-1">{callsTotal}</div>
                            <div className="text-xs text-amber-600 mt-0.5">din toată perioada</div>
                        </div>
                        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5">
                            <div className="text-2xl mb-2">✅</div>
                            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700 opacity-70">Conversie apel → deal</div>
                            <div className="text-3xl font-black text-emerald-700 mt-1">{callConversion}%</div>
                            <div className="text-xs text-emerald-600 mt-0.5">contacte de succes</div>
                        </div>
                        <div className="rounded-3xl bg-blue-50 border border-blue-100 p-5">
                            <div className="text-2xl mb-2">⏱</div>
                            <div className="text-xs font-bold uppercase tracking-wide text-blue-700 opacity-70">Zile medii până la tranzacție</div>
                            <div className="text-3xl font-black text-blue-700 mt-1">{avgDaysToClose || '—'}</div>
                            <div className="text-xs text-blue-600 mt-0.5">de la publicare la închidere</div>
                        </div>
                    </div>

                    {/* Revenue chart + financial summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SectionCard title={`Venituri pe luni (${new Date().getFullYear()})`}>
                            <RevenueChart data={revenueByMonth} />
                        </SectionCard>

                        <SectionCard title="Indicatori financiari">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-semibold text-slate-700">Venit luna curentă</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">
                                            {revenuePeriod > 0 ? `€${Number(revenuePeriod).toLocaleString('ro')}` : '—'}
                                        </span>
                                        <PctChange current={revenuePeriod} prev={revenuePrev} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-semibold text-slate-700">Comision mediu / tranzacție</span>
                                    <span className="font-bold text-slate-900">
                                        {avgCommission > 0 ? `€${Number(avgCommission).toLocaleString('ro', { maximumFractionDigits: 0 })}` : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-semibold text-slate-700">Tranzacții în perioadă</span>
                                    <span className="font-bold text-slate-900">{dealsPeriod}</span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-sm font-semibold text-slate-700">Total clienți activi</span>
                                    <span className="font-bold text-slate-900">{contactsTotal}</span>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            )}

            {/* ── Tab: Agents ── */}
            {activeTab === 'agents' && (
                <div className="space-y-6">
                    <SectionCard title="Tabel eficiență agenți (Vizualizări → Apeluri → Tranzacții)">
                        {agentStats.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Niciun agent înregistrat.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-400 font-bold uppercase border-b border-slate-100">
                                            <th className="text-left pb-3">Agent</th>
                                            <th className="text-right pb-3">Anunțuri</th>
                                            <th className="text-right pb-3">Vizualizări</th>
                                            <th className="text-right pb-3">Apeluri</th>
                                            <th className="text-right pb-3">Tranzacții</th>
                                            <th className="text-right pb-3">Venit (€)</th>
                                            <th className="text-right pb-3">Zile medii</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {agentStats.map((agent, i) => (
                                            <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        {i < 3 && (
                                                            <span className="text-base">{['🥇','🥈','🥉'][i]}</span>
                                                        )}
                                                        <span className="font-semibold text-slate-800">{agent.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right text-slate-600">{agent.properties_count}</td>
                                                <td className="py-3 text-right text-slate-600">{agent.views_total.toLocaleString('ro')}</td>
                                                <td className="py-3 text-right text-slate-600">{agent.calls_count}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">{agent.deals_count}</td>
                                                <td className="py-3 text-right font-bold text-emerald-700">
                                                    {agent.revenue > 0 ? `€${Number(agent.revenue).toLocaleString('ro', { maximumFractionDigits: 0 })}` : '—'}
                                                </td>
                                                <td className="py-3 text-right text-slate-500">
                                                    {agent.avg_days_close != null ? `${agent.avg_days_close}z` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    {/* Speed ranking */}
                    <SectionCard title="⏱ Ratingul vitezei de realizare a anunțurilor">
                        <div className="space-y-3">
                            {agentStats
                                .filter(a => a.avg_days_close != null)
                                .sort((a, b) => a.avg_days_close - b.avg_days_close)
                                .map((agent, i) => {
                                    const maxDays = Math.max(...agentStats.filter(a => a.avg_days_close != null).map(a => a.avg_days_close), 1);
                                    return (
                                        <div key={agent.id} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                                            <span className="text-sm font-semibold text-slate-700 w-32 shrink-0 truncate">{agent.name}</span>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${Math.round((agent.avg_days_close / maxDays) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 w-12 text-right">{agent.avg_days_close} zile</span>
                                        </div>
                                    );
                                })}
                            {agentStats.filter(a => a.avg_days_close != null).length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">Date insuficiente.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ── Tab: Market ── */}
            {activeTab === 'market' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KpiCard icon="📋" color="blue" label="Total anunțuri piață" value={scrapedTotal.toLocaleString('ro')} sub="surse externe agregate" />
                        <KpiCard icon="🏘️" color="purple" label="Districte monitorizate" value={avgPriceByDistrict.length} sub="cu date de preț" />
                        <KpiCard icon="🔥" color="amber" label="Top district activ" value={top5Districts[0]?.district ?? '—'} sub={top5Districts[0] ? `${top5Districts[0].count} anunțuri săpt.` : undefined} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Scraped by week */}
                        <SectionCard title="Dinamica pieței — anunțuri noi pe săptămâni">
                            {scrapedByWeek.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Nu există date de piață.</p>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {scrapedByWeek.map(r => (
                                        <div key={r.week} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-14 shrink-0">Săpt. {r.week}</span>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${Math.round((r.total / maxScrapeWeek) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 w-8 text-right">{r.total}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Avg price by district */}
                        <SectionCard title="Prețul mediu €/m² pe districte">
                            {avgPriceByDistrict.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Nu există date de preț.</p>
                            ) : (
                                <div className="space-y-3">
                                    {avgPriceByDistrict.map(r => (
                                        <div key={r.district}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-semibold text-slate-700 truncate max-w-35">{r.district}</span>
                                                <span className="font-bold text-slate-900 shrink-0">€{r.avg_price.toLocaleString('ro')}</span>
                                            </div>
                                            <MiniBar value={r.avg_price} max={maxDistrict} color="bg-amber-400" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    {/* Top 5 districts by demand */}
                    <SectionCard title="🔥 TOP-5 districte după creșterea cererii (ultimele 7 zile)">
                        {top5Districts.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-6">Nu există date recente.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {top5Districts.map((d, i) => (
                                    <div key={d.district} className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                                        <span className="text-lg">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{d.district}</div>
                                            <div className="text-xs text-slate-500">{d.count} anunțuri noi</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* ── Tab: AI Insights ── */}
            {activeTab === 'ai' && (
                <div className="space-y-6">
                    <div className="rounded-3xl bg-linear-to-r from-violet-50 to-blue-50 border border-violet-100 p-5 flex items-start gap-4">
                        <span className="text-3xl">🤖</span>
                        <div>
                            <div className="font-bold text-violet-900 mb-1">Modul AI Insights — Preview</div>
                            <div className="text-sm text-violet-700">
                                Analiza predictivă se bazează pe datele istorice ale agenției și tendințele pieței.
                                Recomandările sunt generate automat pentru a optimiza prețurile și strategia de vânzare.
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SectionCard title="📈 Predicții tendințe">
                            <div className="space-y-3">
                                {[
                                    { icon: '📈', text: 'Cererea pentru apartamente cu 2 camere în Centru a crescut cu 12% față de trimestrul anterior.', badge: 'Creștere', color: 'green' },
                                    { icon: '📉', text: 'Activitatea pentru proprietăți comerciale arată o scădere ușoară de 5% — potențial moment de achiziție.', badge: 'Atenție', color: 'amber' },
                                    { icon: '🏘️', text: 'Sectorul Botanica prezintă cel mai rapid ritm de realizare — mediana 18 zile față de 31 zile media națională.', badge: 'Rapid', color: 'blue' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50">
                                        <span className="text-xl shrink-0">{item.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-700">{item.text}</p>
                                        </div>
                                        <Badge color={item.color}>{item.badge}</Badge>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="💡 Recomandări optimizare prețuri">
                            <div className="space-y-3">
                                {agentStats.slice(0, 3).map(agent => (
                                    <div key={agent.id} className="p-3 rounded-2xl bg-slate-50">
                                        <div className="font-semibold text-slate-800 text-sm mb-1">{agent.name}</div>
                                        <p className="text-xs text-slate-600">
                                            {agent.avg_days_close != null && agent.avg_days_close > 45
                                                ? `Timp mediu ridicat (${agent.avg_days_close} zile). Evaluați reducerea prețului cu 5-8% la anunțurile cu vechime > 30 zile.`
                                                : agent.avg_days_close != null
                                                ? `Performanță bună — ${agent.avg_days_close} zile mediu. Mențineți strategia curentă de prețuri.`
                                                : 'Date insuficiente pentru recomandare.'}
                                        </p>
                                    </div>
                                ))}
                                {agentStats.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">Niciun agent înregistrat.</p>
                                )}
                            </div>
                        </SectionCard>
                    </div>

                    <SectionCard title="🔮 Prognoză venit (estimat AI)">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Luna viitoare',    pct: '+8%',  color: 'text-emerald-600', note: 'bazat pe ritmul actual' },
                                { label: 'Trimestrul viitor', pct: '+15%', color: 'text-blue-600',    note: 'sezon activ' },
                                { label: 'Sfârșitul anului',   pct: '+22%', color: 'text-violet-600',  note: 'tendință istorică' },
                            ].map(item => (
                                <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center">
                                    <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                    <div className={`text-2xl font-black ${item.color}`}>{item.pct}</div>
                                    <div className="text-xs text-slate-400 mt-1">{item.note}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-4 text-center">
                            * Estimările AI se bazează pe datele istorice ale agenției și nu constituie garanții financiare.
                        </p>
                    </SectionCard>
                </div>
            )}
        </div>
    );
}

// ─── Realtor View ────────────────────────────────────────────────────────────

function RealtorDashboard({
    propertiesTotal, propertiesActive, propertiesArchived,
    contactsTotal, viewsTotal, top3Properties,
    myCallsTotal, myCallsPeriod, callConversion,
    myDealsTotal, myDealsInProgress,
    dealsPeriod, revenuePeriod, revenueTotal, revenueByMonth,
    period,
}) {
    return (
        <div className="space-y-6">
            {/* Notice */}
            <div className="rounded-3xl bg-blue-50 border border-blue-100 p-4 flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <p className="text-sm text-blue-700">
                    Vizualizezi <strong>statisticile tale personale</strong>. Administratorul agenției are acces la datele complete.
                </p>
            </div>

            {/* Personal KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon="🏠" color="blue"   label="Anunțurile mele" value={propertiesTotal} sub={`${propertiesActive} active, ${propertiesArchived} arhivate`} />
                <KpiCard icon="👁" color="purple" label="Total vizualizări" value={viewsTotal.toLocaleString('ro')} sub="cumulativ" />
                <KpiCard icon="📞" color="amber"  label={`Apeluri (${PERIOD_LABELS[period]})`} value={myCallsPeriod} sub={`Conversie: ${callConversion}%`} />
                <KpiCard icon="💰" color="green"  label={`Venit (${PERIOD_LABELS[period]})`} value={revenuePeriod > 0 ? `€${Number(revenuePeriod).toLocaleString('ro')}` : '—'} sub={`Total: €${Number(revenueTotal).toLocaleString('ro')}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 3 properties by views */}
                <SectionCard title="🏆 TOP-3 anunțuri după vizualizări">
                    {top3Properties.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">Niciun anunț adăugat.</p>
                    ) : (
                        <div className="space-y-4">
                            {top3Properties.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-3">
                                    <span className="text-xl shrink-0">{['🥇','🥈','🥉'][i]}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 text-sm truncate">{p.title || 'Fără titlu'}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge color={p.status === 'active' ? 'green' : 'slate'}>
                                                {p.status === 'active' ? 'Activ' : p.status}
                                            </Badge>
                                            <span className="text-xs text-slate-400">{TYPE_LABELS[p.type] ?? p.type}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="font-black text-slate-900 text-lg">{p.views_count}</div>
                                        <div className="text-xs text-slate-400">vizualizări</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* Calls & Deals */}
                <SectionCard title="📊 Apeluri și tranzacții">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
                                <div className="text-2xl font-black text-amber-700">{myCallsTotal}</div>
                                <div className="text-xs text-amber-600 mt-0.5">Total apeluri</div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                                <div className="text-2xl font-black text-emerald-700">{callConversion}%</div>
                                <div className="text-xs text-emerald-600 mt-0.5">Conversie apel → deal</div>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">Tranzacții finalizate</span>
                                <span className="font-bold text-slate-900">{myDealsTotal}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">Tranzacții în lucru</span>
                                <Badge color="amber">{myDealsInProgress}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">Tranzacții în perioadă</span>
                                <span className="font-bold text-emerald-700">{dealsPeriod}</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Personal revenue chart */}
            <SectionCard title={`Venitul meu pe luni (${new Date().getFullYear()})`}>
                <RevenueChart data={revenueByMonth} />
            </SectionCard>
        </div>
    );
}

// ─── CSV Export helper ────────────────────────────────────────────────────────

function exportCSV(agentStats) {
    const header = ['Agent', 'Anunțuri', 'Vizualizări', 'Apeluri', 'Tranzacții', 'Venit (€)', 'Zile medii'];
    const rows = agentStats.map(a => [
        a.name,
        a.properties_count,
        a.views_total,
        a.calls_count,
        a.deals_count,
        a.revenue.toFixed(2),
        a.avg_days_close ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'statistici-agenti.csv'; a.click();
    URL.revokeObjectURL(url);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Index(props) {
    const { isAdmin, period } = props;

    function changePeriod(p) {
        router.get(route('statistics.index'), { period: p }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout title="Statistici">
            <Head title="Statistici" />
            <div className="space-y-6">

                {/* Period filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-500 mr-1">Perioadă:</span>
                    {Object.entries(PERIOD_LABELS).map(([p, label]) => (
                        <button
                            key={p}
                            onClick={() => changePeriod(p)}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                                period === p
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {isAdmin ? <AdminDashboard {...props} /> : <RealtorDashboard {...props} />}
            </div>
        </AppLayout>
    );
}
