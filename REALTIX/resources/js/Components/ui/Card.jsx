/**
 * White card with hairline slate border, rounded-xl, soft two-layer shadow
 * at rest. Dark-mode override flips bg-white via the .dark .bg-white rule
 * in app.css — no Card-specific dark prop needed.
 *
 * Pass `hover` to opt into the design-system lift: shadow grows and the
 * border darkens slightly on hover (200ms). Keep this off for static
 * surfaces (e.g. modals, panels) to avoid jitter.
 */
const REST_SHADOW  = 'shadow-[0_1px_3px_rgba(15,23,42,.07),0_1px_2px_rgba(15,23,42,.04)]';
const HOVER_STYLES = 'hover:shadow-[0_10px_28px_rgba(15,23,42,.10)] hover:border-slate-300/70 transition-all duration-200';

export default function Card({ hover = false, className = '', children, ...rest }) {
    return (
        <div
            className={`bg-white border border-slate-200/70 rounded-xl ${REST_SHADOW} ${hover ? HOVER_STYLES : ''} ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
}
