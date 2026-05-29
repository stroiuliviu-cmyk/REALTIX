/* ============================================================================
   AppShell — fixed navy sidebar + sticky glassy header (the AppLayout shell)
   props: active, onNav(key), children, title
   ============================================================================ */
const NAV = [
  { key: 'properties', label: 'Imobiliare', icon: 'home' },
  { key: 'weboffers',  label: 'Web Oferte', icon: 'globe' },
  { key: 'create',     label: 'Adaugă anunț', icon: 'plus' },
  { key: 'autopost',   label: 'Autopostare', icon: 'send' },
  { key: 'contracts',  label: 'Contracte', icon: 'file' },
  { key: 'calendar',   label: 'Calendar', icon: 'calendar' },
  { key: 'pipeline',   label: 'Clienți CRM', icon: 'users' },
];

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors px-2.5 py-1.5">
        <span className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">A</span>
        <span className="text-sm font-semibold text-slate-700 hidden sm:block">Alexandru</span>
        <Icon name="chevdown" size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-[0_12px_40px_rgba(15,23,42,.18)] border border-slate-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-100 mb-1">
            <div className="text-sm font-bold text-slate-900">Alexandru Popa</div>
            <div className="text-xs text-slate-500">alex@realtix.md</div>
          </div>
          {[['user','Profilul meu'],['bell','Notificări'],['card','Abonament'],['life','Suport']].map(([ic,l]) => (
            <a key={l} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"><Icon name={ic} size={16} className="text-slate-400" />{l}</a>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <a className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"><Icon name="logout" size={16} />Deconectare</a>
          </div>
        </div>
      )}
    </div>
  );
}

function AppShell({ active, onNav, title, children }) {
  const [lang, setLang] = useState('ro');
  return (
    <div className="min-h-screen text-slate-900 rt-canvas">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed top-0 left-0 h-screen z-30 overflow-y-auto"
        style={{ background: 'linear-gradient(to bottom,#0f172a,#0b1120)', borderRight: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex flex-col h-full p-4">
          <div className="px-3 py-2 mb-4"><Wordmark dark size={18} /></div>
          <a className="mx-1 mb-4 rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors"
             style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <span className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Icon name="building" size={20} className="text-blue-400" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">Imobil Prim SRL</div>
              <div className="text-[11px] text-slate-400">Team · Growth</div>
            </div>
            <Icon name="chevdown" size={16} className="text-slate-500" />
          </a>
          <div className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Navighează</div>
          <div className="space-y-1.5">
            {NAV.map(it => {
              const on = active === it.key;
              return (
                <button key={it.key} onClick={() => onNav(it.key)}
                  className={`group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                    on ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}>
                  <Icon name={it.icon} size={19} sw={on ? 2.25 : 2} />
                  <span>{it.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto space-y-3">
            <div className="border-t border-white/6 my-3 mx-1" />
            <button onClick={() => onNav('settings')}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
              <Icon name="settings" size={19} /><span>Setări</span>
            </button>
            <div className="p-4 rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,.04)' }}>
              <div className="flex items-start gap-2 mb-2">
                <Icon name="life" size={20} className="text-blue-400 shrink-0 mt-0.5" />
                <div><div className="text-sm font-bold text-white">Ai nevoie de ajutor?</div>
                  <div className="text-xs text-slate-400 mt-0.5">Echipa îți stă la dispoziție.</div></div>
              </div>
              <a className="block w-full text-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white cursor-pointer">Contactează suport</a>
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="rt-header sticky top-0 z-20 border-b border-slate-200/80 lg:pl-64" style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            {[['dashboard','Panou principal'],['statistics','Statistici'],['subscription','Abonament']].map(([k,l]) => (
              <button key={k} onClick={() => onNav(k)}
                className={`px-4 py-2 rounded-xl transition-colors ${active===k ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>{l}</button>
            ))}
            <button onClick={() => onNav('admin')}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors inline-flex items-center gap-1.5 ${active==='admin' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
              <Icon name="shield" size={14} /> Admin</button>
          </nav>
          <div className="lg:hidden"><Wordmark dark={false} size={16} /></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex relative text-xs font-bold bg-slate-100 rounded-xl p-1">
              <span className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-transform duration-200"
                style={{ width: 'calc((100% - 8px)/2)', left: 4, transform: `translateX(${lang==='ro'?0:100}%)` }} />
              {['ro','ru'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`relative z-10 px-3 py-1 rounded-lg uppercase ${lang===l?'text-slate-900':'text-slate-400'}`}>{l}</button>
              ))}
            </div>
            <Button variant="primary" className="hidden md:flex !px-4 !py-2" onClick={() => onNav('properties')}>
              <Icon name="plus" size={16} sw={2.5} /> Anunț nou
            </Button>
            <ThemeToggle />
            <button className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 shadow-sm">
              <Icon name="bell" size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 max-w-screen-2xl">
          {title && <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { AppShell, NAV });
