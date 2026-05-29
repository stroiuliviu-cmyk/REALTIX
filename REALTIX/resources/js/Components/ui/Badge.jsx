/**
 * Status badge — soft tint fill + subtle ring outline, rounded-md.
 *
 * Tones are tied to product state, not decoration:
 *   active       — emerald (active listing, OK)
 *   inactive     — slate (idle, neutral)
 *   sold         — blue (closed sale)
 *   rented       — violet (active rental)
 *   cheap        — emerald (AI valuation: under market)
 *   average      — amber  (AI valuation: at market)
 *   expensive    — red    (AI valuation: above market)
 *
 * Optional dot=true renders a small leading dot for status-list styling.
 */
const TONE_CLASSES = {
    active:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
    inactive:  'bg-slate-100 text-slate-500 ring-1 ring-slate-500/10',
    sold:      'bg-blue-50 text-blue-700 ring-1 ring-blue-600/15',
    rented:    'bg-violet-50 text-violet-700 ring-1 ring-violet-600/15',
    cheap:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
    average:   'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15',
    expensive: 'bg-red-50 text-red-700 ring-1 ring-red-600/15',
};

export default function Badge({ tone = 'active', dot = false, className = '', children }) {
    const styles = TONE_CLASSES[tone] ?? TONE_CLASSES.active;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${styles} ${className}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
            {children}
        </span>
    );
}
