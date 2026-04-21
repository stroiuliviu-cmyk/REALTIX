import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';

const menuItems = [
    { key: 'dashboard', label: 'Prezentare generală', href: '/dashboard', icon: '⊞' },
    { key: 'properties', label: 'Anunțuri', href: '/properties', icon: '🏠' },
    { key: 'contacts', label: 'Clienți', href: '/contacts', icon: '👥' },
    { key: 'deals', label: 'Tranzacții', href: '/deals', icon: '💼' },
    { key: 'calendar', label: 'Calendar', href: '/calendar', icon: '📅' },
    { key: 'ai', label: 'Instrumente AI', href: '/ai', icon: '✨' },
    { key: 'settings', label: 'Setări', href: '/profile', icon: '⚙️' },
];

export default function AppLayout({ children, title }) {
    const { auth, flash, locale } = usePage().props;
    const user = auth?.user;
    const currentPath = window.location.pathname;

    const activeKey = menuItems.find(item =>
        item.href !== '/dashboard'
            ? currentPath.startsWith(item.href)
            : currentPath === '/dashboard'
    )?.key ?? 'dashboard';

    const switchLanguage = (lang) => {
        router.post(`/language/${lang}`, {}, { preserveState: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900 font-[Inter,sans-serif]">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
                    <div>
                        <Link href="/dashboard">
                            <div className="text-3xl font-bold tracking-widest text-blue-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                REALTIX
                            </div>
                        </Link>
                        {user?.agency && (
                            <div className="text-xs text-slate-500">{user.agency.name} • {user.agency.subscription_plan}</div>
                        )}
                    </div>

                    <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
                        <Link href="/dashboard" className="hover:text-blue-700 transition-colors">Panou principal</Link>
                        <Link href="/properties" className="hover:text-blue-700 transition-colors">Proprietăți</Link>
                        <Link href="/contacts" className="hover:text-blue-700 transition-colors">CRM</Link>
                        <Link href="/deals" className="hover:text-blue-700 transition-colors">Analize</Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        {/* Language switcher */}
                        <div className="flex gap-1 text-xs font-semibold">
                            {['ro', 'ru', 'en'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => switchLanguage(lang)}
                                    className={`px-2 py-1 rounded-lg uppercase transition-colors ${locale === lang ? 'bg-blue-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        {user && (
                            <div className="flex items-center gap-2">
                                {user.avatar_path ? (
                                    <img src={`/storage/${user.avatar_path}`} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold text-sm">
                                        {user.name[0]}
                                    </div>
                                )}
                                <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user.name}</span>
                            </div>
                        )}

                        <Link
                            href="/properties/create"
                            className="rounded-full bg-gradient-to-r from-slate-900 to-blue-700 px-6 py-2.5 text-white shadow-lg hover:shadow-xl transition-shadow font-semibold text-sm"
                        >
                            Adaugă anunț
                        </Link>
                    </div>
                </div>
            </header>

            {/* Flash messages */}
            {(flash?.success || flash?.error) && (
                <div className={`mx-auto max-w-7xl px-8 pt-4`}>
                    {flash?.success && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-emerald-700 text-sm font-medium">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-red-700 text-sm font-medium">
                            {flash.error}
                        </div>
                    )}
                </div>
            )}

            {/* Main grid */}
            <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-8 items-start">
                {/* Sidebar */}
                <aside className="col-span-2 rounded-[2rem] bg-white/90 p-5 shadow-2xl border border-white backdrop-blur-xl sticky top-28">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 pl-2">Meniu</div>
                    <div className="space-y-2 flex flex-col">
                        {menuItems.map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`text-left text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                                    activeKey === item.key
                                        ? 'rounded-2xl bg-slate-900 p-3 text-white shadow-md'
                                        : 'rounded-2xl p-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span className="hidden lg:block">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* User info + logout */}
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full text-left text-xs text-red-500 hover:text-red-700 font-semibold pl-3 transition-colors"
                        >
                            Ieșire
                        </Link>
                    </div>
                </aside>

                {/* Main content */}
                <main className="col-span-12 md:col-span-10 min-h-[600px]">
                    {title && (
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">{title}</h1>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
