import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router } from '@inertiajs/react';

function StatusDot({ ok }) {
    return <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />;
}

function Card({ title, icon, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <span>{icon}</span>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            </div>
            <div className="p-5 space-y-2 text-sm">{children}</div>
        </div>
    );
}

function Row({ label, value, ok = null }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="flex items-center gap-2 font-mono text-xs text-slate-800 font-semibold">
                {ok !== null && <StatusDot ok={ok} />}
                {value ?? '—'}
            </span>
        </div>
    );
}

export default function Index({ platform, integrations, plans }) {
    const toggleMaintenance = () => {
        const action = platform.maintenance ? 'dezactivezi' : 'ACTIVEZI';
        if (!confirm(`Sigur ${action} maintenance mode?`)) return;
        router.post(route('super-admin.settings.maintenance'), {}, { preserveScroll: true });
    };

    const clearCache = () => {
        if (!confirm('Șterg cache + config + views + routes?')) return;
        router.post(route('super-admin.settings.cache.clear'), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Platform Settings" breadcrumb="Super Admin · Configuration">
            <Head title="Settings — Super Admin" />

            <div className="space-y-5">
                {/* Critical actions */}
                <div className={`rounded-xl border-2 p-5 ${platform.maintenance ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Maintenance mode</div>
                            <div className="text-xl font-black text-slate-900 mt-1">
                                {platform.maintenance ? '🔴 OFFLINE — utilizatorii nu pot accesa' : '🟢 ONLINE — accesibil tuturor'}
                            </div>
                        </div>
                        <button
                            onClick={toggleMaintenance}
                            className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-colors ${
                                platform.maintenance
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                        >
                            {platform.maintenance ? '↻ Reactivează' : '⏸ Pune offline'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-slate-900">Cache & config</div>
                        <div className="text-xs text-slate-500 mt-0.5">Șterge cache aplicație, config, views, route după modificări de cod sau .env.</div>
                    </div>
                    <button onClick={clearCache} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-bold hover:bg-slate-700">
                        🗑 Clear all
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card title="Application" icon="🚀">
                        <Row label="App name" value={platform.app_name} />
                        <Row label="Environment" value={platform.app_env} ok={platform.app_env !== 'production' || !platform.app_debug} />
                        <Row label="Debug" value={platform.app_debug ? 'ON' : 'OFF'} ok={!platform.app_debug || platform.app_env !== 'production'} />
                        <Row label="URL" value={platform.app_url} />
                        <Row label="Timezone" value={platform.timezone} />
                        <Row label="Locale" value={platform.locale} />
                    </Card>

                    <Card title="Stripe" icon="💳">
                        <Row label="Publishable key" value={integrations.stripe.key_set ? integrations.stripe.key_hint : 'NOT SET'} ok={integrations.stripe.key_set} />
                        <Row label="Secret key" value={integrations.stripe.secret_set ? '***SET***' : 'NOT SET'} ok={integrations.stripe.secret_set} />
                        <Row label="Webhook secret" value={integrations.stripe.webhook_set ? '***SET***' : 'NOT SET (dev OK)'} ok={integrations.stripe.webhook_set} />
                        <Row label="Solo price" value={plans.starter_price_id ? '✓' : '✕'} ok={!!plans.starter_price_id} />
                        <Row label="Team price" value={plans.medium_price_id ? '✓' : '✕'} ok={!!plans.medium_price_id} />
                        <Row label="Growth price" value={plans.pro_price_id ? '✓' : '✕'} ok={!!plans.pro_price_id} />
                        <Row label="Extra-seat price" value={plans.extra_seat_id ? '✓' : '✕'} ok={!!plans.extra_seat_id} />
                    </Card>

                    <Card title="Mail" icon="✉️">
                        <Row label="Driver" value={integrations.mail.mailer} />
                        <Row label="SMTP host" value={integrations.mail.host ?? 'not set'} ok={!!integrations.mail.host} />
                        <Row label="Port" value={integrations.mail.port} />
                        <Row label="From" value={integrations.mail.from} />
                        <Row label="Configured" value={integrations.mail.configured ? 'YES' : 'NO'} ok={integrations.mail.configured} />
                    </Card>

                    <Card title="Infrastructure" icon="🛠">
                        <Row label="Database" value={integrations.database.driver} />
                        <Row label="Cache" value={integrations.cache.driver} />
                        <Row label="Queue" value={integrations.queue.driver} />
                        <Row label="Session" value={integrations.session.driver} />
                    </Card>
                </div>

                <div className="rounded-xl border border-slate-200 bg-amber-50 p-4 text-xs text-slate-700">
                    <strong>Notă:</strong> Setările sensibile (Stripe keys, SMTP, etc.) se modifică prin <code>.env</code> + <code>php artisan config:clear</code>. Edit UI direct .env nu e expus din motive de securitate. Pentru config persistent recomand <code>spatie/laravel-settings</code>.
                </div>
            </div>
        </SuperAdminLayout>
    );
}
