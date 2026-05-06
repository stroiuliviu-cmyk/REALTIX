import { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';

function ProfileDropdown({ user }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-2"
            >
                {user?.avatar_path ? (
                    <img src={`/storage/${user.avatar_path}`} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                )}
                <span className="text-sm font-semibold text-slate-700 hidden sm:block max-w-30 truncate">{user?.name}</span>
                <svg className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <div className="text-sm font-bold text-slate-900 truncate">{user?.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                    </div>

                    {/* Multi-agency switcher: shown only when user is linked to 2+ agencies */}
                    {user?.linked_agencies?.length > 1 && (
                        <div className="border-b border-slate-100 mb-1 pb-1">
                            <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Schimbă agenția
                            </div>
                            {user.linked_agencies.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => {
                                        if (a.is_active) return;
                                        router.post(`/agency/switch/${a.id}`, {}, {
                                            onSuccess: () => { setOpen(false); router.reload(); },
                                        });
                                    }}
                                    disabled={a.is_active}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                        a.is_active
                                            ? 'bg-blue-50 text-blue-700 cursor-default font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                                    }`}
                                >
                                    {a.logo_path ? (
                                        <img src={`/storage/${a.logo_path}`} alt={a.name} className="w-6 h-6 rounded-md object-cover shrink-0" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs shrink-0">🏢</div>
                                    )}
                                    <span className="flex-1 truncate text-left">{a.name}</span>
                                    {a.is_active && <span className="text-blue-600">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>👤</span> {t('profile.my_profile')}
                    </Link>
                    <Link href="/settings?tab=notifications" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🔔</span> {t('profile.notifications')}
                    </Link>
                    <Link href="/subscription" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>💳</span> {t('profile.subscription')}
                    </Link>
                    <a href="mailto:support@realtix.md" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>❓</span> {t('profile.support')}
                    </a>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <span>🚪</span> {t('profile.logout')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AppLayout({ children, title }) {
    const { auth, flash, locale } = usePage().props;
    const { t } = useTranslation();
    const user = auth?.user;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const sidebarItems = [
        { key: 'properties',  label: t('nav.my_listings'),  href: '/properties',        icon: '🏠' },
        { key: 'web-offers',  label: t('nav.web_offers'),   href: '/web-offers',        icon: '🌐' },
        { key: 'create',      label: t('nav.add_listing'),  href: '/properties/create', icon: '➕' },
        { key: 'ai',          label: t('nav.ai_tools'),     href: '/ai',                icon: '✨' },
        { key: 'autopost',    label: t('nav.autopost'),     href: '/autopost',          icon: '📤' },
        { key: 'contracts',   label: t('nav.contracts'),    href: '/contracts',         icon: '📄' },
        { key: 'calendar',    label: t('nav.calendar'),     href: '/calendar',          icon: '📅' },
        { key: 'contacts',    label: t('nav.crm_clients'),  href: '/contacts',          icon: '👥' },
    ];

    const headerNavItems = [
        { label: t('nav.dashboard'),    href: '/dashboard' },
        { label: t('nav.statistics'),   href: '/statistics' },
        { label: t('nav.subscription'), href: '/subscription' },
        ...(user?.is_super_admin ? [{ label: 'Admin', href: '/admin', highlight: true }] : []),
    ];

    const activeKey = sidebarItems.find(item =>
        item.href !== '/properties/create'
            ? currentPath.startsWith(item.href) && item.href !== '/properties' || currentPath === item.href
            : currentPath === item.href
    )?.key
        ?? (currentPath === '/properties' || currentPath.startsWith('/properties/') ? 'properties' : null)
        ?? 'dashboard';

    const switchLanguage = (lang) => {
        router.post(`/language/${lang}`, {}, { preserveState: true });
    };

    const planLabel = user?.agency?.subscription_plan
        ? { starter: 'Starter', medium: 'Medium', pro: 'Pro' }[user.agency.subscription_plan] ?? user.agency.subscription_plan
        : '—';

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50 text-slate-900 font-[Inter,sans-serif]">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
                        <div className="text-2xl font-black tracking-widest text-blue-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            REALTIX
                        </div>
                        {user?.agency && (
                            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-200 pl-3">
                                {user.agency.logo_path && (
                                    <img
                                        src={`/storage/${user.agency.logo_path}`}
                                        alt={user.agency.name}
                                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm"
                                    />
                                )}
                                <div className="leading-tight">
                                    <div className="font-semibold text-slate-600">{user.agency.name}</div>
                                    <div className="text-slate-400">{planLabel}</div>
                                </div>
                            </div>
                        )}
                    </Link>

                    {/* Center nav */}
                    <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
                        {headerNavItems.map(item => {
                            const isActive = currentPath.startsWith(item.href) || currentPath === item.href;
                            if (item.highlight) {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-4 py-2 rounded-xl transition-colors font-semibold ${
                                            isActive
                                                ? 'bg-rose-600 text-white'
                                                : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        }`}
                                    >
                                        🛡 {item.label}
                                    </Link>
                                );
                            }
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 rounded-xl transition-colors ${
                                        isActive
                                            ? 'bg-slate-100 text-slate-900 font-semibold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Language switcher */}
                        {(() => {
                            const langs = ['ro', 'ru', 'en'];
                            const activeIndex = langs.indexOf(locale);
                            return (
                                <div className="hidden sm:flex relative text-xs font-bold bg-slate-100 rounded-xl p-1">
                                    <span
                                        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
                                        style={{
                                            width: 'calc((100% - 8px) / 3)',
                                            left: '4px',
                                            transform: `translateX(calc(${activeIndex} * 100%))`,
                                            transition: 'transform 0.2s ease',
                                        }}
                                    />
                                    {langs.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => switchLanguage(lang)}
                                            className={`relative z-10 flex-1 px-2.5 py-1 rounded-lg uppercase transition-colors duration-200 ${locale === lang ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Quick add */}
                        <Link
                            href="/properties/create"
                            className="hidden md:flex items-center gap-1.5 rounded-xl bg-linear-to-r from-slate-900 to-blue-700 px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            <span className="text-base">+</span> {t('nav.new_listing')}
                        </Link>

                        <ProfileDropdown user={user} />
                    </div>
                </div>
            </header>

            {/* Flash messages */}
            {(flash?.success || flash?.error || flash?.warning) && (
                <div className="mx-auto max-w-screen-2xl px-6 pt-3">
                    {flash?.success && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-emerald-700 text-sm font-medium flex items-center gap-2">
                            <span>✓</span> {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-red-700 text-sm font-medium flex items-center gap-2">
                            <span>✕</span> {flash.error}
                        </div>
                    )}
                    {flash?.warning && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3 text-amber-700 text-sm font-medium flex items-center gap-2">
                            <span>⚠</span> {flash.warning}
                        </div>
                    )}
                </div>
            )}

            {/* Main layout */}
            <div className="mx-auto max-w-screen-2xl flex gap-0 p-4 sm:p-6 items-start">
                {/* Sidebar */}
                <aside className="w-14 lg:w-56 shrink-0 rounded-4xl bg-white/90 p-3 shadow-xl border border-slate-100/80 backdrop-blur-xl sticky top-24 self-start mr-5">
                    <div className="hidden lg:block mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 px-3">
                        {t('nav.navigate')}
                    </div>
                    <div className="space-y-1">
                        {sidebarItems.map((item) => {
                            const isActive = item.href === '/properties/create'
                                ? currentPath === item.href
                                : currentPath.startsWith(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    title={item.label}
                                    className={`flex items-center gap-3 text-sm font-semibold transition-all duration-150 rounded-2xl p-3 ${
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >
                                    <span className="text-base shrink-0">{item.icon}</span>
                                    <span className="hidden lg:block leading-tight">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                        <Link
                            href="/settings"
                            title={t('nav.settings')}
                            className={`flex items-center gap-3 text-sm font-semibold transition-all duration-150 rounded-2xl p-3 ${
                                currentPath.startsWith('/settings') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span className="text-base shrink-0">⚙️</span>
                            <span className="hidden lg:block">{t('nav.settings')}</span>
                        </Link>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0 min-h-150">
                    {title && (
                        <h1 className="text-2xl font-bold text-slate-900 mb-5">{title}</h1>
                    )}

                    {/* Admin sub-nav (visible only on /admin/*) */}
                    {user?.is_super_admin && currentPath.startsWith('/admin') && (
                        <nav className="mb-5 flex gap-1.5 flex-wrap p-1.5 bg-rose-50 rounded-2xl border border-rose-100 w-fit">
                            {[
                                { href: '/admin',               label: 'Dashboard',   exact: true },
                                { href: '/admin/users',         label: 'Utilizatori' },
                                { href: '/admin/agencies',      label: 'Agenții' },
                                { href: '/admin/subscriptions', label: 'Abonamente' },
                            ].map(item => {
                                const active = item.exact ? currentPath === item.href : currentPath.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                                            active
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'text-rose-700 hover:bg-rose-100'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
