/* ============================================================================
   REALTIX App UI Kit — shared primitives + Lucide icon set
   Enterprise refinement: flat fills, restrained accents, no emoji.
   Exposes globals on window for the other babel scripts.
   ============================================================================ */
const { useState, useRef, useEffect, createContext, useContext } = React;

/* ---- Icons (Lucide paths, currentColor) --------------------------------- */
const ICON_PATHS = {
  home:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  building:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  globe:   '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
  plus:    '<path d="M5 12h14"/><path d="M12 5v14"/>',
  send:    '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  file:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
  calcheck:'<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  users:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:    '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search:  '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell:    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  chevdown:'<path d="m6 9 6 6 6-6"/>',
  pin:     '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  star:    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
  trending:'<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  chart:   '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  more:    '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  phone:   '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  eye:     '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  grid:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  filter:  '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  banknote:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  card:    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  sparkles:'<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  shield:  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  lock:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  zap:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  clock:   '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  alert:   '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  copy:    '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  arrowright:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowup:'<path d="m18 15-6-6-6 6"/>',
  arrowdown:'<path d="m6 9 6 6 6-6"/>',
  check:   '<path d="M20 6 9 17l-5-5"/>',
  x:       '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  logout:  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/>',
  life:    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/>',
  document:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon:    '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  import:  '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/>',
  mail:    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  eyeoff:  '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
};
function Icon({ name, size = 20, sw = 2, className = '', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }} />
  );
}

/* ---- Wordmark ----------------------------------------------------------- */
function Wordmark({ dark = true, size = 18 }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name="home" size={size + 6} sw={2.25} className={dark ? 'text-blue-500' : 'text-blue-600'} />
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, letterSpacing: '0.16em', fontSize: size }}
        className={dark ? 'text-white' : 'text-[#0b1a4a]'}>REALTIX</span>
    </div>
  );
}

/* ---- Buttons (flat, restrained) ----------------------------------------- */
function Button({ variant = 'primary', children, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-60';
  const styles = {
    primary:   'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm shadow-sm',
    dark:      'bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm',
    secondary: 'bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300',
    ghost:     'text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm',
    success:   'bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm',
    danger:    'bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold',
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

/* ---- Badge -------------------------------------------------------------- */
const BADGE = {
  active:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
  inactive: 'bg-slate-100 text-slate-500 ring-1 ring-slate-500/10',
  sold:     'bg-blue-50 text-blue-700 ring-1 ring-blue-600/15',
  rented:   'bg-violet-50 text-violet-700 ring-1 ring-violet-600/15',
  cheap:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
  average:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15',
  expensive:'bg-red-50 text-red-700 ring-1 ring-red-600/15',
};
function Badge({ tone = 'active', children, dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${BADGE[tone] || BADGE.active}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/* ---- Card --------------------------------------------------------------- */
function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div className={`bg-white border border-slate-200/70 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,.07),0_1px_2px_rgba(15,23,42,.04)] ${hover ? 'hover:shadow-[0_10px_28px_rgba(15,23,42,.10)] hover:border-slate-300/70 transition-all duration-200' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

/* ---- Theme toggle (night / light) --------------------------------------- */
function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  try { localStorage.setItem('rt-theme', t); } catch (e) {}
}
function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light');
  const toggle = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); applyTheme(next); };
  return (
    <button onClick={toggle} aria-label="Comută tema"
      className={`w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors ${className}`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

Object.assign(window, { Icon, Wordmark, Button, Badge, Card, ThemeToggle, applyTheme, useState, useRef, useEffect });
