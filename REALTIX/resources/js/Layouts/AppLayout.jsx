import { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { useTranslation } from '@/Hooks/useTranslation';
import NotificationsBell from '@/Components/NotificationsBell';
import {
    Home, Globe, Plus, Send, FileText, Calendar, Users,
    Settings, LifeBuoy, ChevronDown, LayoutGrid, MoreHorizontal,
} from 'lucide-react';

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
                    <Link href="/suport" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>❓</span> {t('profile.support')}
                    </Link>
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close drawer on route change
    useEffect(() => { setMobileMenuOpen(false); }, [currentPath]);
    // Lock scroll while drawer is open
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    const sidebarItems = [
        { key: 'properties',  label: t('nav.my_listings'),  href: '/properties',        Icon: Home },
        { key: 'web-offers',  label: t('nav.web_offers'),   href: '/web-offers',        Icon: Globe },
        { key: 'create',      label: t('nav.add_listing'),  href: '/properties/create', Icon: Plus },
        { key: 'autopost',    label: t('nav.autopost'),     href: '/autopost',          Icon: Send },
        { key: 'contracts',   label: t('nav.contracts'),    href: '/contracts',         Icon: FileText },
        { key: 'calendar',    label: t('nav.calendar'),     href: '/calendar',          Icon: Calendar },
        { key: 'contacts',    label: t('nav.crm_clients'),  href: '/contacts',          Icon: Users },
    ];

    const headerNavItems = [
        { label: t('nav.dashboard'),    href: '/dashboard' },
        { label: t('nav.statistics'),   href: '/statistics' },
        { label: t('nav.subscription'), href: '/subscription' },
        ...(user?.is_super_admin ? [{ label: 'Admin', href: route('super-admin.dashboard'), highlight: true }] : []),
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
        ? { starter: 'Solo', medium: 'Team', pro: 'Growth' }[user.agency.subscription_plan] ?? user.agency.subscription_plan
        : '—';

    const subStatus = user?.agency?.subscription_status;
    const isPastDue = subStatus === 'past_due' || subStatus === 'unpaid';

    const { impersonation } = usePage().props;

    return (
        <div className="min-h-screen overflow-x-hidden bg-linear-to-br from-slate-50 via-white to-blue-50 text-slate-900 font-[Inter,sans-serif]">
            {impersonation && (
                <div className="bg-rose-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 shadow-md lg:pl-64">
                    <div className="flex items-start sm:items-center gap-2">
                        <span className="text-base shrink-0">🎭</span>
                        <span>
                            Imitate user — autentificat ca <strong>{user?.name}</strong> (admin original: <strong>{impersonation.admin_name}</strong>)
                        </span>
                    </div>
                    <button
                        onClick={() => router.post(route('super-admin.users.stop-impersonate'))}
                        className="shrink-0 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider self-end sm:self-auto"
                    >
                        ⏹ Stop impersonate
                    </button>
                </div>
            )}
            {isPastDue && (
                <div className="bg-red-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 shadow-md lg:pl-64">
                    <div className="flex items-start sm:items-center gap-2">
                        <span className="text-base shrink-0">⚠</span>
                        <span>
                            Plata abonamentului a eșuat. Accesul la unele funcții poate fi restricționat. Actualizează metoda de plată.
                        </span>
                    </div>
                    {user?.is_admin && (
                        <Link
                            href={route('subscription.portal')}
                            className="shrink-0 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider self-end sm:self-auto"
                        >
                            Actualizează plata
                        </Link>
                    )}
                </div>
            )}
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:pl-64">
                <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 sm:px-6 py-3 gap-3">
                    {/* Hamburger (mobile only) */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

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
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Language switcher */}
                        {(() => {
                            const langs = ['ro', 'ru'];
                            const activeIndex = langs.indexOf(locale);
                            return (
                                <div className="hidden sm:flex relative text-xs font-bold bg-slate-100 rounded-xl p-1">
                                    <span
                                        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
                                        style={{
                                            width: `calc((100% - 8px) / ${langs.length})`,
                                            left: '4px',
                                            transform: `translateX(calc(${activeIndex} * 100%))`,
                                            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            opacity: activeIndex < 0 ? 0 : 1,
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

                        <NotificationsBell unreadCount={user?.unread_notifications_count ?? 0} />

                        <ProfileDropdown user={user} />
                    </div>
                </div>
            </header>

            {/* Flash messages */}
            {(flash?.success || flash?.error || flash?.warning) && (
                <div className="mx-auto max-w-screen-2xl px-6 pt-3 lg:pl-64">
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

            {/* Mobile drawer */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 shadow-2xl overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Home className="w-6 h-6 text-blue-400" />
                                <div className="text-xl font-black tracking-widest text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>REALTIX</div>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                                aria-label="Close menu"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {user?.agency && (
                            <div className="mx-3 mt-3 mb-2 rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2.5 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                                    {user.agency.logo_path ? (
                                        <img src={`/storage/${user.agency.logo_path}`} alt={user.agency.name} className="w-full h-full rounded-lg object-cover" />
                                    ) : (
                                        <Home className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 leading-tight">
                                    <div className="text-sm font-semibold text-white truncate">{user.agency.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{planLabel}</div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 space-y-1">
                            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('nav.navigate')}</div>
                            {headerNavItems.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                                        currentPath.startsWith(item.href)
                                            ? 'bg-blue-600 text-white'
                                            : item.highlight
                                                ? 'bg-rose-500/20 text-rose-300'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    {item.highlight && <span>🛡</span>}
                                    <span>{item.label}</span>
                                </Link>
                            ))}

                            <div className="border-t border-slate-800 my-2" />

                            {sidebarItems.map(item => {
                                const Icon = item.Icon;
                                const isActive = item.href === '/properties/create'
                                    ? currentPath === item.href
                                    : currentPath.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                                            <span>{item.label}</span>
                                        </span>
                                        {item.badge && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Bottom-aligned Settings + helper card */}
                        <div className="mt-auto p-3 space-y-3">
                            <Link
                                href="/settings"
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                                    currentPath.startsWith('/settings')
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Settings className="w-5 h-5 shrink-0" />
                                <span>{t('nav.settings')}</span>
                            </Link>

                            <div className="p-4 rounded-xl bg-linear-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30">
                                <div className="flex items-start gap-2 mb-2">
                                    <LifeBuoy className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-bold text-white">Ai nevoie de ajutor?</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Echipa noastră îți stă la dispoziție.</div>
                                    </div>
                                </div>
                                <Link
                                    href="/suport"
                                    className="block w-full text-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-colors"
                                >
                                    Contactează suport
                                </Link>
                            </div>

                            <div className="rounded-xl bg-slate-800 p-1 flex">
                                {['ro', 'ru'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => switchLanguage(lang)}
                                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${locale === lang ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </>
            )}

            {/* Main layout. No mx-auto/max-w here — the fixed sidebar takes
                viewport-left, so centering the wrapper would offset content
                away from the sidebar's right edge on ultra-wide screens and
                push the right side past the viewport (horizontal scroll). */}
            <div className="flex gap-0 p-3 sm:p-6 items-start">
                {/* Sidebar (desktop only) — dark navy, edge-to-edge, fixed full-height.
                    Inner wrapper carries the padding + flex-col so mt-auto pushes
                    the helper card / language switcher to the bottom of the viewport. */}
                <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-linear-to-b from-slate-900 to-[#0b1120] border-r border-white/6 fixed top-0 left-0 h-screen overflow-y-auto z-30">
                    <div className="flex flex-col h-full p-4">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 mb-4">
                        <Home className="w-7 h-7 text-blue-500 shrink-0" strokeWidth={2.5} />
                        <span className="text-lg font-black tracking-widest text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            REALTIX
                        </span>
                    </Link>

                    {/* Agency card — links to /subscription so the chevron + cursor-pointer
                        + hover state all map to actual behaviour (plan management). */}
                    {user?.agency && (
                        <Link
                            href="/subscription"
                            className="mx-1 mb-4 rounded-2xl bg-white/4 border border-white/7 px-3 py-3 flex items-center gap-3 hover:bg-white/7 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 overflow-hidden">
                                {user.agency.logo_path ? (
                                    <img src={`/storage/${user.agency.logo_path}`} alt={user.agency.name} className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                    <Home className="w-5 h-5 text-blue-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 leading-tight">
                                <div className="text-sm font-semibold text-white truncate">{user.agency.name}</div>
                                <div className="text-[11px] text-slate-400 font-medium truncate">{planLabel}</div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        </Link>
                    )}

                    {/* Navigate label */}
                    <div className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {t('nav.navigate')}
                    </div>
                    <div className="space-y-1.5">
                        {sidebarItems.map(item => {
                            const Icon = item.Icon;
                            const isActive = item.href === '/properties/create'
                                ? currentPath === item.href
                                : currentPath.startsWith(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                                        isActive
                                            ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                                    }`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 shrink-0 text-current" strokeWidth={isActive ? 2.5 : 2} />
                                        <span>{item.label}</span>
                                    </span>
                                    {item.badge && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Bottom-aligned: separator + Settings + helper card + lang switcher */}
                    <div className="mt-auto space-y-3">
                        <div className="border-t border-white/6 my-3 mx-1" />

                        <Link
                            href="/settings"
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                                currentPath.startsWith('/settings')
                                    ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                            }`}
                        >
                            <Settings className="w-5 h-5 shrink-0 text-current" strokeWidth={currentPath.startsWith('/settings') ? 2.5 : 2} />
                            <span>{t('nav.settings')}</span>
                        </Link>
                    </div>
                    </div>
                </aside>

                {/* Content. pb-20 on mobile reserves space for the fixed
                    bottom nav so the last item isn't hidden behind it. */}
                <main className="flex-1 min-w-0 min-h-150 lg:ml-64 pb-20 lg:pb-0">
                    {title && (
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-5">{title}</h1>
                    )}

                    {/* Admin sub-nav (visible only on /admin/*) */}
                    {user?.is_super_admin && currentPath.startsWith('/super-admin') && (
                        <nav className="mb-5 flex gap-1.5 flex-wrap p-1.5 bg-rose-50 rounded-2xl border border-rose-100 w-fit">
                            {[
                                { href: route('super-admin.dashboard'), label: 'Dashboard', exact: true },
                                { href: route('super-admin.users.index'), label: 'Utilizatori' },
                                { href: route('super-admin.agencies.index'), label: 'Agenții' },
                                { href: route('super-admin.plans.index'), label: 'Abonamente' },
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

            {/* Fixed mobile bottom navigation. Five entries with a raised
                central "Adaugă" button. The "Mai mult" entry opens the same
                drawer the top-bar hamburger does, so deep routes (Web Oferte,
                Autopostare, Contracte, Calendar, AI, Setări) remain reachable
                with a single tap. Hidden on lg+ where the sidebar is visible. */}
            <nav
                className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 pt-2"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                aria-label="Mobile navigation"
            >
                <div className="flex items-end justify-around">
                    {(() => {
                        const propertiesActive = currentPath.startsWith('/properties')
                            && !currentPath.startsWith('/properties/create');
                        const items = [
                            { key: 'dashboard', label: 'Panou',    href: '/dashboard', Icon: Home,        isActive: currentPath === '/dashboard' },
                            { key: 'props',     label: 'Anunțuri', href: '/properties', Icon: LayoutGrid, isActive: propertiesActive },
                            { key: 'contacts',  label: 'Clienți',  href: '/contacts',   Icon: Users,      isActive: currentPath.startsWith('/contacts') },
                        ];
                        return (
                            <>
                                {items.slice(0, 2).map(({ key, label, href, Icon, isActive }) => (
                                    <Link
                                        key={key}
                                        href={href}
                                        className="flex flex-col items-center gap-1 px-3 py-1 min-w-14"
                                    >
                                        <Icon
                                            className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                            {label}
                                        </span>
                                    </Link>
                                ))}

                                {/* Raised center "Adaugă" — sits above the bar
                                    via -mt-6 so the FAB-style button breaks the
                                    baseline like the mockup. */}
                                <Link
                                    href="/properties/create"
                                    className="flex flex-col items-center gap-1 -mt-6"
                                >
                                    <span className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30 transition-colors">
                                        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400">Adaugă</span>
                                </Link>

                                {items.slice(2).map(({ key, label, href, Icon, isActive }) => (
                                    <Link
                                        key={key}
                                        href={href}
                                        className="flex flex-col items-center gap-1 px-3 py-1 min-w-14"
                                    >
                                        <Icon
                                            className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                            {label}
                                        </span>
                                    </Link>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="flex flex-col items-center gap-1 px-3 py-1 min-w-14"
                                    aria-label="Open more menu"
                                >
                                    <MoreHorizontal
                                        className={`w-5 h-5 ${mobileMenuOpen ? 'text-blue-600' : 'text-slate-400'}`}
                                        strokeWidth={mobileMenuOpen ? 2.5 : 2}
                                    />
                                    <span className={`text-[10px] font-medium ${mobileMenuOpen ? 'text-blue-600' : 'text-slate-400'}`}>
                                        Mai mult
                                    </span>
                                </button>
                            </>
                        );
                    })()}
                </div>
            </nav>
        </div>
    );
}
