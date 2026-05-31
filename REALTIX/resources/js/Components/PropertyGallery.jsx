import { useState } from 'react';
import { Building, Camera } from 'lucide-react';
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
 * Property photo gallery — responsive thumbnail grid. Clicking any thumb
 * opens the existing lightbox (zoom, fullscreen, keyboard nav, mobile swipe)
 * at that image's index. No permanent hero — everything lives inside the
 * lightbox to keep the page above-the-fold compact.
 *
 * Layout:
 *   - 0 photos       → placeholder card with a Building icon
 *   - 1+ photos      → responsive grid (3 cols mobile → 5 cols desktop),
 *                      capped at MAX_IMAGES tiles
 */
export default function PropertyGallery({ media = [] }) {
    const images = (media || []).slice(0, MAX_IMAGES);
    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (images.length === 0) {
        return (
            <div className="h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <Building className="w-12 h-12 mb-2" strokeWidth={1.5} />
                <span className="text-sm">Fără fotografii</span>
            </div>
        );
    }

    const openAt = (i) => { setActiveIndex(i); setLightboxOpen(true); };

    return (
        <div>
            {/* Photo count header */}
            <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Camera className="w-3.5 h-3.5" />
                <span>
                    {images.length} {images.length === 1 ? 'fotografie' : 'fotografii'}
                </span>
            </div>

            {/* Thumbnail grid — all images visible; click opens the lightbox */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {images.map((m, i) => (
                    <button
                        type="button"
                        key={m.id ?? i}
                        onClick={() => openAt(i)}
                        className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 group"
                        aria-label={`Deschide fotografia ${i + 1} din ${images.length}`}
                    >
                        <img
                            src={thumbSrc(m)}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                    </button>
                ))}
            </div>

            {/* Lightbox — keyboard (ESC / arrows / +/-), mouse wheel zoom,
                fullscreen, and mobile swipe. The Thumbnails plugin renders
                a strip at the bottom inside the lightbox itself. */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={activeIndex}
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
