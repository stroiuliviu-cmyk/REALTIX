import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

const MAX_IMAGES = 30;

const thumbSrc = (m) => `/storage/${m.thumb_path || m.path}`;
const fullSrc  = (m) => `/storage/${m.path}`;

/**
 * Property photo gallery — hero + thumbnail strip + lightbox (zoom, fullscreen,
 * keyboard nav, mobile swipe). Storia / Imobiliare.md style.
 *
 * Layout:
 *   - 0 photos       → placeholder card
 *   - 1 photo        → hero only
 *   - 2-5 photos     → hero + thumbs (one tile per photo)
 *   - 6+ photos      → hero + 4 thumbs + "+N" tile that jumps the lightbox
 *                      to the 5th image
 *
 * Hero opens the lightbox at the currently-active index. Thumbs only update
 * the active index (no auto-open) so clicking through to compare is cheap.
 */
export default function PropertyGallery({ media = [] }) {
    const images = (media || []).slice(0, MAX_IMAGES);
    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (images.length === 0) {
        return (
            <div className="h-[500px] bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-6xl text-slate-300">🏠</span>
            </div>
        );
    }

    // Clamp in case the active image gets removed in some upstream re-render.
    const safeIndex = Math.min(activeIndex, images.length - 1);
    const hero = images[safeIndex];

    // 6+ images → show 4 thumbs + a 5th overlay tile carrying "+N" that opens
    // the lightbox at index 4 so the user can scrub through the rest.
    const hasOverflow    = images.length > 5;
    const visibleThumbs  = hasOverflow ? images.slice(0, 4) : images.slice(0, 5);
    const overlayIndex   = 4;
    const overflowCount  = images.length - 5;

    return (
        <div>
            {/* Hero */}
            <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="relative w-full h-[500px] rounded-xl overflow-hidden group block"
                aria-label="Deschide galerie foto"
            >
                <img
                    src={fullSrc(hero)}
                    alt=""
                    className="w-full h-full object-cover"
                />
                {/* Soft gradient on hover so the bottom badges keep contrast */}
                <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                {/* Photo count — bottom-right */}
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    📸 {images.length} {images.length === 1 ? 'fotografie' : 'fotografii'}
                </div>
                {/* "N / total" — bottom-left, only when ≥ 2 photos */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                        {safeIndex + 1} / {images.length}
                    </div>
                )}
            </button>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                    {visibleThumbs.map((m, i) => (
                        <button
                            type="button"
                            key={m.id ?? i}
                            onClick={() => setActiveIndex(i)}
                            className={`relative aspect-square overflow-hidden rounded-lg transition ${
                                safeIndex === i ? 'ring-2 ring-blue-600 ring-offset-2' : 'opacity-90 hover:opacity-100'
                            }`}
                            aria-label={`Vezi fotografia ${i + 1}`}
                            aria-current={safeIndex === i ? 'true' : 'false'}
                        >
                            <img src={thumbSrc(m)} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                    {hasOverflow && (
                        <button
                            type="button"
                            onClick={() => {
                                setActiveIndex(overlayIndex);
                                setLightboxOpen(true);
                            }}
                            className="relative aspect-square overflow-hidden rounded-lg group"
                            aria-label={`Vezi toate cele ${images.length} fotografii`}
                        >
                            <img src={thumbSrc(images[overlayIndex])} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 text-white font-semibold text-lg flex items-center justify-center group-hover:bg-black/80 transition-colors">
                                +{overflowCount}
                            </div>
                        </button>
                    )}
                </div>
            )}

            {/* Lightbox — keyboard (ESC / arrows / +/-), mouse wheel zoom,
                fullscreen, and mobile swipe. The Thumbnails plugin renders
                a strip at the bottom inside the lightbox itself. */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={safeIndex}
                slides={images.map(m => ({ src: fullSrc(m) }))}
                plugins={[Zoom, Fullscreen, Thumbnails, Counter]}
                zoom={{ maxZoomPixelRatio: 4 }}
                thumbnails={{ position: 'bottom', width: 80, height: 60 }}
                counter={{
                    container: { style: { top: 'unset', bottom: 0, right: 0, left: 'unset' } },
                }}
                carousel={{ finite: false }}
                on={{
                    view: ({ index }) => setActiveIndex(index),
                }}
                animation={{ swipe: 300 }}
                styles={{
                    container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
                }}
            />
        </div>
    );
}
