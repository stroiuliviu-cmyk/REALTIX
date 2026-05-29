import { Home } from 'lucide-react';

/**
 * REALTIX wordmark — lucide Home glyph + Montserrat 800 caps with the
 * 0.16em brand tracking. Pass `dark` when rendering on a dark surface
 * (sidebar, auth panel) so the icon switches to blue-500 and the text
 * stays white instead of the navy used on light surfaces.
 *
 *   size controls the wordmark font-size in px; the icon scales to size + 6.
 */
export default function Wordmark({ dark = false, size = 18, className = '' }) {
    const iconColor = dark ? 'text-blue-500' : 'text-blue-600';
    const textColor = dark ? 'text-white'     : 'text-[#0b1a4a]';

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <Home className={`shrink-0 ${iconColor}`} size={size + 6} strokeWidth={2.25} />
            <span
                className={textColor}
                style={{
                    fontFamily:    'Montserrat, sans-serif',
                    fontWeight:    800,
                    letterSpacing: '0.16em',
                    fontSize:      size,
                }}
            >
                REALTIX
            </span>
        </div>
    );
}
