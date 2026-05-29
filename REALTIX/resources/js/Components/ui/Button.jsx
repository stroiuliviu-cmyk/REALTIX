/**
 * REALTIX design-system button — flat fills, restrained accents, no glow.
 *
 * Variants (per design-system/ui-kit-reference.jsx):
 *   primary    — blue-600 / hover blue-700, the working CTA
 *   dark       — slate-900 / hover slate-800, neutral confirm
 *   secondary  — white with slate border, low-key actions
 *   ghost      — text-only, hover slate-100
 *   success    — same shape as `dark`; named for intent (kept distinct so
 *                callers don't conflate "submit" with "primary action")
 *   danger     — red-600, smaller padding + bold (destructive row-action)
 */
const BASE = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

const VARIANT_CLASSES = {
    primary:   'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm shadow-sm',
    dark:      'bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm',
    secondary: 'bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300',
    ghost:     'text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm',
    success:   'bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm',
    danger:    'bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold',
};

export default function Button({ variant = 'primary', className = '', children, ...rest }) {
    const styles = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
    return (
        <button type="button" className={`${BASE} ${styles} ${className}`} {...rest}>
            {children}
        </button>
    );
}
