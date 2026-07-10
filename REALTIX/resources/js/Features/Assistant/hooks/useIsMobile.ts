import { useEffect, useState } from 'react';

/**
 * True când viewport-ul e „mobil" (implicit ≤ 640px). Bazat pe matchMedia, cu
 * listener pe schimbarea de lățime. SSR/jsdom-safe: dacă `window.matchMedia`
 * lipsește (ex. în teste), întoarce `false` → layout desktop, fără să arunce.
 */
export function useIsMobile(query = '(max-width: 640px)'): boolean {
  const read = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [isMobile, setIsMobile] = useState<boolean>(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
