import { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';

const sidebarItems = [
    { key: 'properties',  label: 'Anunțurile mele',    href: '/properties',       icon: '🏠' },
    { key: 'web-offers',  label: 'Web Oferte',          href: '/web-offers',       icon: '🌐' },
    { key: 'create',      label: 'Adaugă anunț',        href: '/properties/create',icon: '➕' },
    { key: 'ai',          label: 'Instrumente AI',      href: '/ai',               icon: '✨' },
    { key: 'autopost',    label: 'Autopostare',         href: '/autopost',         icon: '📤' },
    { key: 'contracts',   label: 'Contracte',           href: '/contracts',        icon: '📄' },
    { key: 'calendar',    label: 'Calendar',            href: '/calendar',         icon: '📅' },
    { key: 'contacts',    label: 'Clienți CRM',         href: '/contacts',         icon: '👥' },
];

const headerNavItems = [
    { label: 'Panou principal', href: '/dashboard' },
    { label: 'Statistici',     href: '/statistics' },
    { label: 'Abonament',      href: '/subscription' },
];

function ProfileDropdown({ user }) {
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
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <div className="text-sm font-bold text-slate-900 truncate">{user?.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                    </div>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>👤</span> Profilul meu
                    </Link>
                    <Link href="/settings?tab=notifications" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🔔</span> Notificări
                    </Link>
                    <Link href="/subscription" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>💳</span> Abonament
                    </Link>
                    <a href="mailto:support@realtix.md" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>❓</span> Suport
                    </a>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <span>🚪</span> Ieșire
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AppLayout({ children, title }) {
    const { auth, flash, locale } = usePage().props;
    const user = auth?.user;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

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
                            <div className="hidden sm:block text-xs text-slate-400 border-l border-slate-200 pl-3 leading-tight">
                                <div className="font-semibold text-slate-600">{user.agency.name}</div>
                                <div className="text-slate-400">{planLabel}</div>
                            </div>
                        )}
                    </Link>

                    {/* Center nav */}
                    <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
                        {headerNavItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-xl transition-colors ${
                                    currentPath.startsWith(item.href) || currentPath === item.href
                                        ? 'bg-slate-100 text-slate-900 font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Language switcher */}
                        <div className="hidden sm:flex gap-0.5 text-xs font-bold bg-slate-100 rounded-xl p-1">
                            {['ro', 'ru', 'en'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => switchLanguage(lang)}
                                    className={`px-2.5 py-1 rounded-lg uppercase transition-colors ${locale === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        {/* Quick add */}
                        <Link
                            href="/properties/create"
                            className="hidden md:flex items-center gap-1.5 rounded-xl bg-linear-to-r from-slate-900 to-blue-700 px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            <span className="text-base">+</span> Anunț nou
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
                        Navigare
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
                            title="Setări"
                            className={`flex items-center gap-3 text-sm font-semibold transition-all duration-150 rounded-2xl p-3 ${
                                currentPath.startsWith('/settings') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span className="text-base shrink-0">⚙️</span>
                            <span className="hidden lg:block">Setări</span>
                        </Link>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0 min-h-150">
                    {title && (
                        <h1 className="text-2xl font-bold text-slate-900 mb-5">{title}</h1>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
