import { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';

const SECTIONS = [
    { group: 'OVERVIEW', items: [
        { key: 'dashboard',     label: 'Dashboard',           icon: '📊', href: '/super-admin' },
        { key: 'analytics',     label: 'Analytics',           icon: '📈', href: '/super-admin/analytics' },
        { key: 'system-health', label: 'System Health',       icon: '💓', href: '/super-admin/system-health' },
    ]},
    { group: 'BUSINESS', items: [
        { key: 'agencies',      label: 'Agencies',            icon: '🏢', href: '/super-admin/agencies' },
        { key: 'users',         label: 'Users',               icon: '👥', href: '/super-admin/users' },
        { key: 'listings',      label: 'Listings',            icon: '🏠', href: '/super-admin/listings' },
        { key: 'crm-monitor',   label: 'CRM Monitoring',      icon: '🎯', href: '/super-admin/crm' },
    ]},
    { group: 'REVENUE', items: [
        { key: 'billing',       label: 'Billing',             icon: '💳', href: '/super-admin/billing' },
        { key: 'plans',         label: 'Subscription Plans',  icon: '📦', href: '/super-admin/plans' },
    ]},
    { group: 'PLATFORM', items: [
        { key: 'ai-system',     label: 'AI System',           icon: '🤖', href: '/super-admin/ai' },
        { key: 'portal-999',    label: '999.md Integration',  icon: '🔌', href: '/super-admin/integrations/999md' },
        { key: 'email',         label: 'Email System',        icon: '✉️', href: '/super-admin/email' },
        { key: 'storage',       label: 'Storage',             icon: '💾', href: '/super-admin/storage' },
    ]},
    { group: 'SAFETY', items: [
        { key: 'moderation',    label: 'Moderation',          icon: '🛡', href: '/super-admin/moderation' },
        { key: 'security',      label: 'Security',            icon: '🔒', href: '/super-admin/security' },
        { key: 'logs',          label: 'Logs',                icon: '📜', href: '/super-admin/logs' },
    ]},
    { group: 'CONFIG', items: [
        { key: 'feature-flags', label: 'Feature Flags',       icon: '🚩', href: '/super-admin/feature-flags' },
        { key: 'support',       label: 'Support',             icon: '🎫', href: '/super-admin/support' },
        { key: 'settings',      label: 'Platform Settings',   icon: '⚙️', href: '/super-admin/settings' },
    ]},
];

function NavLink({ item, active }) {
    return (
        <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
        >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge != null && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 rounded-full">{item.badge}</span>
            )}
        </Link>
    );
}

function Sidebar({ currentPath, counters, mobileOpen, onCloseMobile }) {
    const badgeMap = {
        moderation: counters?.moderation_pending,
        support:    counters?.support_open,
    };

    return (
        <aside
            className={`bg-slate-950 text-slate-200 flex flex-col border-r border-slate-800/80 transition-transform z-50
                fixed inset-y-0 left-0 w-72 max-w-[85vw] h-screen overflow-y-auto shadow-2xl
                lg:sticky lg:top-0 lg:w-64 lg:shrink-0 lg:overflow-visible lg:shadow-none lg:translate-x-0
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            onClick={onCloseMobile ? (e) => { if (e.target.tagName === 'A') onCloseMobile(); } : undefined}
        >
            <div className="px-5 py-5 border-b border-slate-800/80 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black">R</div>
                <div>
                    <div className="text-sm font-bold text-white tracking-wide">REALTIX</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Super Admin</div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {SECTIONS.map(group => (
                    <div key={group.group}>
                        <div className="px-3 mb-2 text-[10px] font-bold text-slate-600 tracking-widest">{group.group}</div>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const active = item.href === '/super-admin'
                                    ? currentPath === '/super-admin'
                                    : currentPath.startsWith(item.href);
                                const badge = badgeMap[item.key];
                                const itemWithBadge = badge > 0 ? { ...item, badge } : item;
                                return <NavLink key={item.key} item={itemWithBadge} active={active} />;
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-3 py-3 border-t border-slate-800/80">
                <Link href="/dashboard" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 px-3 py-2">
                    ← Back to app
                </Link>
            </div>
        </aside>
    );
}

function Topbar({ user, alerts = [], criticalCount: criticalCountProp = 0, onMenuClick }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const activeAlerts = alerts.filter(a => !a.dismissed_at);
    const criticalCount = criticalCountProp || activeAlerts.filter(a => a.level === 'critical').length;
    const systemColor = criticalCount > 0 ? 'bg-red-500' : activeAlerts.length > 0 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4">
            <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open menu"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className="flex-1 max-w-md hidden md:block">
                <div className="relative">
                    <input
                        type="search"
                        placeholder="Search agencies, users, listings… (⌘K)"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                    />
                    <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                </div>
            </div>
            <div className="flex-1 md:hidden" />

            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className={`w-2 h-2 rounded-full ${systemColor}`} />
                    <span className="text-xs font-semibold text-slate-700">
                        {criticalCount > 0 ? `${criticalCount} critical` : 'All systems normal'}
                    </span>
                </div>
                <span className={`sm:hidden w-2.5 h-2.5 rounded-full ${systemColor}`} title={criticalCount > 0 ? `${criticalCount} critical` : 'All systems normal'} />

                <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Platform alerts">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {activeAlerts.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                    )}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setProfileOpen(o => !o)}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
                            {user?.name?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div className="text-left hidden sm:block">
                            <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">Super Admin</div>
                        </div>
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
                            <Link href="/super-admin/settings" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Platform Settings</Link>
                            <Link href="/dashboard" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Back to app</Link>
                            <button onClick={() => router.post('/logout')} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 border-t border-slate-100">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default function SuperAdminLayout({ children, title, breadcrumb }) {
    const { auth, alerts = [], superAdminCounters } = usePage().props;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[type=search]')?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Close mobile sidebar on path change.
    useEffect(() => { setMobileMenuOpen(false); }, [currentPath]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
            <Sidebar
                currentPath={currentPath}
                counters={superAdminCounters}
                mobileOpen={mobileMenuOpen}
                onCloseMobile={() => setMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar
                    user={auth?.user}
                    alerts={alerts}
                    criticalCount={superAdminCounters?.critical_alerts ?? 0}
                    onMenuClick={() => setMobileMenuOpen(true)}
                />

                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {(title || breadcrumb) && (
                        <div className="mb-6">
                            {breadcrumb && (
                                <div className="text-xs text-slate-400 mb-1.5">{breadcrumb}</div>
                            )}
                            {title && (
                                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                            )}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
