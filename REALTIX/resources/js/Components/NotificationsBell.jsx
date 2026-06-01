import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function NotificationsBell({ unreadCount = 0 }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState(unreadCount);
    const ref = useRef(null);

    useEffect(() => setCount(unreadCount), [unreadCount]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/notifications', { headers: { Accept: 'application/json' } });
            const json = await res.json();
            setItems(json.notifications ?? []);
            setCount(json.unread_count ?? 0);
        } finally {
            setLoading(false);
        }
    };

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchNotifications();
    };

    // Fire-and-forget mark-read endpoints. We hit them via fetch instead of
    // router.post on purpose: `router.post(..., { preserveState })` ties the
    // request to the Inertia navigation cycle, which on GET-only pages (e.g.
    // /properties/create) causes Inertia to attempt a POST re-render of the
    // current route → 405. fetch keeps these calls out of the Inertia loop.
    const csrfToken = () =>
        document.querySelector('meta[name="csrf-token"]')?.content ?? '';

    const postSilent = (url) =>
        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type':     'application/json',
                'Accept':           'application/json',
                'X-CSRF-TOKEN':     csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).catch(() => { /* silent — UI is already updated optimistically */ });

    const handleClickItem = (n) => {
        if (!n.read_at) {
            // Optimistic UI first so the user sees the dot disappear immediately,
            // then ping the server in the background.
            setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
            setCount(c => Math.max(0, c - 1));
            postSilent(`/notifications/${n.id}/read`);
        }
        setOpen(false);
        // router.visit is a real GET navigation — that's the legitimate use of
        // Inertia routing; it doesn't 405 because GET-only pages accept GET.
        if (n.data?.url) router.visit(n.data.url);
    };

    const handleMarkAllRead = () => {
        setItems(prev => prev.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
        setCount(0);
        postSilent('/notifications/read-all');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={toggleOpen}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Notificări"
            >
                <span className="text-lg">🔔</span>
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-900">Notificări</div>
                        {count > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-700 hover:underline font-semibold"
                            >
                                Marchează toate
                            </button>
                        )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {loading && items.length === 0 && (
                            <div className="px-6 py-8 text-center text-sm text-slate-400">Se încarcă...</div>
                        )}

                        {!loading && items.length === 0 && (
                            <div className="px-6 py-12 text-center">
                                <div className="text-4xl mb-2">📭</div>
                                <div className="text-sm text-slate-400 font-medium">Nicio notificare încă</div>
                            </div>
                        )}

                        {items.map(n => (
                            <button
                                key={n.id}
                                onClick={() => handleClickItem(n)}
                                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${
                                    n.read_at ? 'opacity-70' : ''
                                }`}
                            >
                                <div className="text-2xl shrink-0">{n.data?.icon ?? '🔔'}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">{n.data?.title}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.data?.message}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{n.created_at}</div>
                                </div>
                                {!n.read_at && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
