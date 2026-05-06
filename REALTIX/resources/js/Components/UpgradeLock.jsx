import { Link } from '@inertiajs/react';
import { useFeature } from '@/Hooks/useFeature';

export default function UpgradeLock({
    feature,
    children,
    mode = 'overlay',
    className = '',
}) {
    const { allowed, minPlan, label } = useFeature(feature);

    if (allowed) return children;

    if (mode === 'disable') {
        return (
            <span
                className={`relative inline-flex group ${className}`}
                title={`${label} — necesită plan ${minPlan ? minPlan[0].toUpperCase() + minPlan.slice(1) : 'mai mare'}`}
            >
                <span className="opacity-50 pointer-events-none select-none">{children}</span>
                <span className="absolute -top-1 -right-1 text-xs">🔒</span>
            </span>
        );
    }

    if (mode === 'banner') {
        return (
            <div className={`rounded-3xl border border-amber-200 bg-amber-50 p-6 flex items-center justify-between gap-4 flex-wrap ${className}`}>
                <div className="flex items-start gap-3">
                    <span className="text-3xl">🔒</span>
                    <div>
                        <div className="font-bold text-amber-900">„{label}" nu este pe planul tău</div>
                        <div className="text-sm text-amber-800 opacity-80">
                            {minPlan
                                ? `Această funcție necesită planul ${minPlan[0].toUpperCase() + minPlan.slice(1)} sau superior.`
                                : 'Această funcție necesită un plan superior.'}
                        </div>
                    </div>
                </div>
                <Link
                    href="/subscription"
                    className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                    Vezi planuri
                </Link>
            </div>
        );
    }

    // overlay (default): wrap children with blur + lock badge
    return (
        <div className={`relative ${className}`}>
            <div className="opacity-30 pointer-events-none select-none blur-[1px]">{children}</div>
            <Link
                href="/subscription"
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl group hover:bg-white/70 transition-all"
            >
                <span className="text-4xl mb-2">🔒</span>
                <div className="text-sm font-bold text-slate-900">„{label}" — necesită {minPlan ? minPlan[0].toUpperCase() + minPlan.slice(1) : 'plan superior'}</div>
                <div className="text-xs text-amber-700 font-semibold mt-1 group-hover:underline">Vezi planuri →</div>
            </Link>
        </div>
    );
}
