import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

// ── constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = {
    sale:          { label: 'Vânzare-cumpărare',   icon: '🏷' },
    rent:          { label: 'Chirie',               icon: '🔑' },
    mandate:       { label: 'Mandat imobiliar',     icon: '📋' },
    advance:       { label: 'Avans / Acont',        icon: '💰' },
    handover:      { label: 'Proces-verbal',        icon: '📝' },
    viewing_sheet: { label: 'Fișă de vizionare',   icon: '👁' },
    gdpr_consent:  { label: 'Consimțământ GDPR',   icon: '🔐' },
    exclusive:     { label: 'Contract exclusivitate', icon: '⭐' },
};

const LOCALE_LABELS = { ro: 'RO', ru: 'RU' };

const PLACEHOLDER_GROUPS = {
    'Proprietate': [
        'adresa_proprietate', 'titlu_proprietate', 'pret', 'valuta',
        'numar_camere', 'suprafata', 'suprafata_locuibila', 'etaj', 'numar_cadastral',
    ],
    'Client / Chiriaș': [
        'nume_client', 'telefon_client', 'email_client', 'adresa_client', 'cnp_client',
    ],
    'Vânzător / Proprietar': [
        'nume_vanzator', 'cnp_vanzator', 'adresa_vanzator',
        'nume_proprietar', 'cnp_proprietar',
    ],
    'Agent / Agenție': [
        'nume_agent', 'email_agent', 'nume_agentie',
    ],
    'Contract': [
        'data_contractului', 'oras', 'comision_procent', 'durata_zile',
        'durata_luni', 'depozit', 'data_start', 'data_sfarsit', 'tipul_tranzactiei',
    ],
};

const FIELD_LABELS = {
    // General
    data_contractului:        'Data contractului',
    numar_contract:           'Număr contract',
    oras:                     'Orașul',
    sector:                   'Sector / Raion',
    tip_proprietate:          'Tip proprietate',
    tip_tranzactie:           'Tip tranzacție',
    tipul_tranzactiei:        'Tipul tranzacției',
    numar_exemplare:          'Număr exemplare',
    observatii:               'Observații',
    // Property
    adresa_proprietate:       'Adresa proprietății',
    titlu_proprietate:        'Titlu anunț',
    pret:                     'Preț',
    pret_minim:               'Preț minim',
    pret_maxim:               'Preț maxim',
    valuta:                   'Valuta',
    numar_camere:             'Număr camere',
    suprafata:                'Suprafață (m²)',
    suprafata_locuibila:      'Suprafață locativă (m²)',
    etaj:                     'Etaj',
    total_etaje:              'Total etaje',
    numar_cadastral:          'Număr cadastral',
    document_proprietate:     'Document proprietate',
    caracteristici:           'Caracteristici',
    stare_imobil:             'Stare imobil',
    transmitere_mobilier:     'Transmitere mobilier',
    // Owner / Seller
    nume_proprietar:          'Nume proprietar',
    idnp_proprietar:          'IDNP proprietar',
    cnp_proprietar:           'CNP proprietar',
    adresa_proprietar:        'Adresa proprietar',
    telefon_proprietar:       'Telefon proprietar',
    email_proprietar:         'Email proprietar',
    nume_vanzator:            'Nume vânzător',
    idnp_vanzator:            'IDNP vânzător',
    cnp_vanzator:             'CNP vânzător',
    adresa_vanzator:          'Adresa vânzător',
    // Client / Buyer
    nume_client:              'Nume client',
    idnp_client:              'IDNP client',
    cnp_client:               'CNP client',
    telefon_client:           'Telefon client',
    email_client:             'Email client',
    adresa_client:            'Adresa client',
    // Agent / Agency
    nume_agent:               'Nume agent',
    email_agent:              'Email agent',
    nume_agentie:             'Nume agenție',
    idno_agentie:             'IDNO agenție',
    adresa_agentie:           'Adresa agenție',
    telefon_agentie:          'Telefon agenție',
    email_agentie:            'Email agenție',
    // Mandant / Mandatar
    nume_mandant:             'Nume mandant',
    idnp_mandant:             'IDNP mandant',
    adresa_mandant:           'Adresa mandant',
    data_nasterii_mandant:    'Data nașterii mandant',
    nume_mandatar:            'Nume mandatar',
    idnp_mandatar:            'IDNP mandatar',
    adresa_mandatar:          'Adresa mandatar',
    data_nasterii_mandatar:   'Data nașterii mandatar',
    // Predator / Primitor (predare-primire)
    nume_predator:            'Nume predător',
    idnp_predator:            'IDNP predător',
    adresa_predator:          'Adresa predător',
    nume_primitor:            'Nume primitor',
    idnp_primitor:            'IDNP primitor',
    adresa_primitor:          'Adresa primitor',
    // Notificare expeditor/destinatar
    nume_expeditor:           'Nume expeditor',
    idnp_expeditor:           'IDNP expeditor',
    adresa_expeditor:         'Adresa expeditor',
    nume_destinatar:          'Nume destinatar',
    idnp_destinatar:          'IDNP destinatar',
    adresa_destinatar:        'Adresa destinatar',
    // Dates
    data_inceput:             'Data început',
    data_sfarsit:             'Data sfârșit',
    data_inceput_chirie:      'Început chirie',
    data_sfarsit_chirie:      'Sfârșit chirie',
    data_start:               'Data start',
    data_contract_initial:    'Data contract inițial',
    data_contract_principal:  'Data contract principal',
    data_reziliere:           'Data reziliere',
    data_expirare_procura:    'Data expirare procură',
    data_vizionarii:          'Data vizionării',
    data_decontare:           'Data decontare',
    durata_luni:              'Durată (luni)',
    durata_zile:              'Durată (zile)',
    durata_post_actiune:      'Durată post-acțiune',
    termen_plata:             'Termen plată',
    termen_notificare_fm:     'Termen notificare (zile)',
    zile_notificare:          'Zile notificare',
    modalitate_prelungire:    'Modalitate prelungire',
    // Sums
    suma_avans:               'Suma avans',
    suma_arvuna:              'Suma arvună',
    suma_achitata:            'Suma achitată',
    suma_de_plata:            'Suma de plată',
    suma_totala:              'Suma totală',
    suma_fixa:                'Suma fixă',
    suma_penalitate:          'Suma penalitate',
    depozit:                  'Depozit (sumă)',
    comision_procent:         'Comision (%)',
    alta_modalitate_calcul:   'Altă modalitate calcul',
    forma_plata:              'Formă plată',
    // Documents / Keys / Meters
    numar_act:                'Număr act',
    act_identitate_eliberat:  'Act identitate (eliberat)',
    alte_documente:           'Alte documente',
    chei_intrare:             'Chei intrare',
    chei_postala:             'Chei poștală',
    chei_suplimentare:        'Chei suplimentare',
    alte_chei:                'Alte chei',
    contor_apa_rece:          'Contor apă rece',
    contor_apa_calda:         'Contor apă caldă',
    contor_electric:          'Contor electric',
    contor_gaz:               'Contor gaz',
    alte_contoare:            'Alte contoare',
    // Misc clauses
    obiect_contract:          'Obiect contract',
    temei_juridic:            'Temei juridic',
    alte_actiuni:             'Alte acțiuni',
    alte_servicii:            'Alte servicii',
    alte_conditii:            'Alte condiții',
    alte_scopuri:             'Alte scopuri',
    alte_imputerniciri:       'Alte împuterniciri',
    alt_contract:             'Alt contract',
    alt_rezultat:             'Alt rezultat',
    alta_modalitate:          'Altă modalitate',
    alta_procedura:           'Altă procedură',
    drept_substituire:        'Drept substituire',
    contract_semnat:          'Contract semnat',
    clauza_cumparator_propriu:'Clauză cumpărător propriu',
    prestare_partiala:        'Prestare parțială',
    eliberare_obiect:         'Eliberare obiect',
};

// Filled server-side from auth context; we don't show them as editable inputs.
const SERVER_SIDE_FILLED = new Set([
    'property_id', 'contact_id',
    'nume_agent', 'email_agent', 'nume_agentie',
]);

function extractManualFields(content) {
    const matches = [...content.matchAll(/\{(\w+)\}/g)];
    return [...new Set(matches.map(m => m[1]))].filter(k => !SERVER_SIDE_FILLED.has(k));
}

// Extract `@cbx:KEY label` lines so the form can render boolean checkboxes
// instead of text inputs for these service-list / option-list items.
function extractCheckboxes(content) {
    const matches = [...content.matchAll(/^@cbx:(\w+)\s+(.+)$/gm)];
    return matches.map(([, key, label]) => ({ key, label: label.trim() }));
}

function todayIso() {
    return new Date().toISOString().split('T')[0];
}

// ── shared input classes ──────────────────────────────────────────────────────

const INPUT_CLS =
    'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white';
const LABEL_CLS =
    'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

// ── SearchSelect ──────────────────────────────────────────────────────────────

function SearchSelect({ options, value, onChange, placeholder, renderRow }) {
    const [query, setQuery]   = useState('');
    const [open, setOpen]     = useState(false);

    const selected = options.find(o => String(o.id) === String(value));

    const filtered = options
        .filter(o => {
            if (!query) return true;
            const q = query.toLowerCase();
            const r = renderRow(o);
            return (r.text ?? '').toLowerCase().includes(q)
                || (r.sub ?? '').toLowerCase().includes(q)
                || String(o.id).includes(q);
        })
        .slice(0, 8);

    return (
        <div className="relative">
            <input
                className={INPUT_CLS}
                value={selected ? renderRow(selected).text : query}
                placeholder={placeholder}
                onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    {filtered.map(o => {
                        const r = renderRow(o);
                        return (
                            <div
                                key={o.id}
                                onMouseDown={() => { onChange(o.id); setQuery(''); setOpen(false); }}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer"
                            >
                                <div className="text-sm font-semibold text-slate-800">{r.text}</div>
                                {r.sub && <div className="text-xs text-slate-400 mt-0.5">{r.sub}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── GenerateModal ─────────────────────────────────────────────────────────────

function GenerateModal({ template, properties, contacts, onClose }) {
    const { data, setData, post, processing } = useForm({
        property_id: '',
        contact_id:  '',
        fields: { data_contractului: todayIso() },
    });

    const setField = (key, val) => setData('fields', { ...data.fields, [key]: val });

    const manualFields = extractManualFields(template.content);
    const checkboxes   = extractCheckboxes(template.content);
    const dateFields   = new Set(['data_contractului', 'data_start', 'data_sfarsit', 'data_vizionarii']);

    const submit = e => {
        e.preventDefault();
        post(route('contracts.generate', template.id), { onSuccess: () => onClose() });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Generează document</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {TEMPLATE_TYPES[template.type]?.icon} {template.name}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                    </div>
                </div>

                <form onSubmit={submit} className="overflow-y-auto px-8 py-6 space-y-4 grow">
                    {/* Property */}
                    <div>
                        <label className={LABEL_CLS}>
                            Proprietate <span className="font-normal normal-case text-slate-400">(opțional)</span>
                        </label>
                        <SearchSelect
                            options={properties}
                            value={data.property_id}
                            onChange={v => {
                                setData('property_id', v);
                                const p = properties.find(x => String(x.id) === String(v));
                                if (!p) return;
                                // Auto-fill placeholders from the chosen property — user can still edit
                                // any value in the manual fields below before generating.
                                setData(prev => ({
                                    ...prev,
                                    property_id: v,
                                    fields: {
                                        ...prev.fields,
                                        adresa_proprietate:  p.address ?? '',
                                        titlu_proprietate:   p.title ?? '',
                                        oras:                p.city ?? '',
                                        sector:              p.district ?? '',
                                        pret:                p.price ?? '',
                                        valuta:              p.currency ?? 'EUR',
                                        numar_camere:        p.rooms ?? '',
                                        suprafata:           p.area_total ?? '',
                                        suprafata_locuibila: p.area_living ?? '',
                                        etaj:                p.floor ?? '',
                                        total_etaje:         p.floors_total ?? '',
                                        numar_cadastral:     p.meta?.cadastre_number ?? '',
                                    },
                                }));
                            }}
                            placeholder="Caută după ID, titlu sau adresă…"
                            renderRow={p => ({
                                text: `#${p.id} · ${p.title ?? '—'}`,
                                sub:  [p.address, p.city].filter(Boolean).join(', '),
                            })}
                        />
                    </div>

                    {/* Contact */}
                    <div>
                        <label className={LABEL_CLS}>
                            Client / Contact <span className="font-normal normal-case text-slate-400">(opțional)</span>
                        </label>
                        <SearchSelect
                            options={contacts}
                            value={data.contact_id}
                            onChange={v => {
                                setData('contact_id', v);
                                const c = contacts.find(x => String(x.id) === String(v));
                                if (!c) return;
                                setData(prev => ({
                                    ...prev,
                                    contact_id: v,
                                    fields: {
                                        ...prev.fields,
                                        nume_client:    [c.first_name, c.last_name].filter(Boolean).join(' '),
                                        telefon_client: c.phone ?? '',
                                        email_client:   c.email ?? '',
                                        adresa_client:  c.address ?? c.meta?.address ?? '',
                                        cnp_client:     c.meta?.idnp ?? c.meta?.cnp ?? '',
                                        idnp_client:    c.meta?.idnp ?? '',
                                    },
                                }));
                            }}
                            placeholder="Caută după ID, nume sau telefon…"
                            renderRow={c => ({
                                text: `#${c.id} · ${[c.first_name, c.last_name].filter(Boolean).join(' ')}`,
                                sub:  c.phone ?? c.email,
                            })}
                        />
                    </div>

                    {/* Manual fields */}
                    {manualFields.length > 0 && (
                        <div className="border-t border-slate-100 pt-4 space-y-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                Câmpuri suplimentare
                            </p>
                            {manualFields.map(key => (
                                <div key={key}>
                                    <label className={LABEL_CLS}>{FIELD_LABELS[key] ?? key}</label>
                                    <input
                                        type={dateFields.has(key) ? 'date' : 'text'}
                                        value={data.fields[key] ?? ''}
                                        onChange={e => setField(key, e.target.value)}
                                        className={INPUT_CLS}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Checkbox-uri (servicii / opțiuni bifabile) */}
                    {checkboxes.length > 0 && (
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                Servicii / opțiuni
                            </p>
                            {checkboxes.map(({ key, label }) => (
                                <label
                                    key={key}
                                    className="flex items-start gap-3 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={data.fields[key] === '1'}
                                        onChange={e => setField(key, e.target.checked ? '1' : '')}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700 leading-snug">{label}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => window.open(route('contracts.preview', template.id), '_blank')}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 shrink-0"
                        >
                            👁 Preview
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Anulează
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {processing ? 'Se generează…' : 'Generează Word'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── TemplateEditorModal ───────────────────────────────────────────────────────

function TemplateEditorModal({ template, onClose }) {
    const isNew = !template?.id;
    const textareaRef = useRef(null);
    const docxInputRef = useRef(null);
    const [extracting, setExtracting] = useState(false);
    const [docxError,  setDocxError]  = useState('');

    const { data, setData, post, patch, processing, errors } = useForm({
        name:    template.name    ?? '',
        type:    template.type    ?? 'sale',
        locale:  template.locale  ?? 'ro',
        content: template.content ?? '',
    });

    // Pull text from a .docx into the content field without saving.
    const importFromDocx = async (file) => {
        if (!file) return;
        setExtracting(true); setDocxError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await window.axios.post('/contracts/extract-docx', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setData(prev => ({
                ...prev,
                content: res.data.content ?? '',
                name:    prev.name || (file.name.replace(/\.docx?$/i, '')),
            }));
        } catch (e) {
            setDocxError(e.response?.data?.error || 'Nu am putut extrage textul din fișier.');
        } finally {
            setExtracting(false);
            if (docxInputRef.current) docxInputRef.current.value = '';
        }
    };

    // Insert text into the textarea preserving the native undo history.
    //
    // execCommand('insertText') is deprecated on paper but still the only
    // cross-browser way to programmatically mutate a <textarea> while keeping
    // its undo stack (Ctrl+Z) intact. Direct value-set via setData() breaks
    // undo because there's no input event from a user gesture.
    const insertAtCursor = (text) => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const ok = document.execCommand('insertText', false, text);
        if (ok) return; // textarea's onChange handler will sync React state

        // Fallback (rare): no undo support, but at least it inserts something.
        const offset = el.selectionStart ?? el.value.length;
        setData('content', data.content.substring(0, offset) + text + data.content.substring(offset));
        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = offset + text.length;
        });
    };

    const insertPlaceholder   = key => insertAtCursor(`{${key}}`);
    const insertPlaceholderAt = key => insertAtCursor(`{${key}}`);

    const submit = e => {
        e.preventDefault();
        if (isNew) {
            post(route('contracts.store'), { onSuccess: () => onClose() });
        } else {
            patch(route('contracts.update', template.id), { onSuccess: () => onClose() });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-4xl max-h-[93vh] flex flex-col">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {isNew ? '+ Creează document' : 'Editează șablon'}
                        <span className="relative group">
                            <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold cursor-help hover:bg-slate-200 transition-colors"
                                aria-label="Cum utilizezi pagina"
                            >?</span>
                            <span className="invisible group-hover:visible absolute left-0 top-7 z-10 w-80 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed p-3 shadow-2xl normal-case font-normal">
                                <strong className="block mb-1.5 text-[12px]">Cum utilizezi pagina:</strong>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Setează <strong>tipul</strong>, <strong>limba</strong> și <strong>denumirea</strong> șablonului.</li>
                                    <li>Scrie textul în <strong>Conținut șablon</strong> sau apasă <strong>📄 Încarcă .docx</strong> pentru a importa dintr-un fișier Word.</li>
                                    <li>Din panoul din dreapta, <strong>click</strong> pe orice câmp sau <strong>trage-l</strong> cu mouse-ul în text — se inserează la poziția cursorului.</li>
                                    <li><strong>Ctrl+Z</strong> anulează ultima inserare; placeholderii apar ca <code className="bg-slate-800 px-1 rounded">{'{nume_camp}'}</code> și se completează automat la generare.</li>
                                    <li>Apasă <strong>Creează șablon</strong> pentru a salva.</li>
                                </ol>
                            </span>
                        </span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <input
                            ref={docxInputRef}
                            type="file"
                            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={e => importFromDocx(e.target.files?.[0])}
                        />
                        <button
                            type="button"
                            onClick={() => docxInputRef.current?.click()}
                            disabled={extracting}
                            className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {extracting ? 'Se extrage…' : '📄 Încarcă .docx'}
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                    </div>
                </div>
                {docxError && (
                    <p className="px-8 pt-3 text-xs text-rose-600">{docxError}</p>
                )}

                <form onSubmit={submit} className="overflow-y-auto p-8 space-y-5 grow">
                    {/* Meta row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={LABEL_CLS}>Tip document</label>
                            <select value={data.type} onChange={e => setData('type', e.target.value)} className={INPUT_CLS}>
                                {Object.entries(TEMPLATE_TYPES).map(([k, t]) => (
                                    <option key={k} value={k}>{t.icon} {t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={LABEL_CLS}>Limbă</label>
                            <select value={data.locale} onChange={e => setData('locale', e.target.value)} className={INPUT_CLS}>
                                <option value="ro">🇷🇴 Română</option>
                                <option value="ru">🇷🇺 Русский</option>
                                <option value="en">🇬🇧 English</option>
                            </select>
                        </div>
                        <div>
                            <label className={LABEL_CLS}>Denumire șablon</label>
                            <input
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="ex. Contract vânzare 2024"
                                required
                                className={INPUT_CLS}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                    </div>

                    {/* Content + Placeholders */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <label className={LABEL_CLS}>Conținut șablon</label>
                            <textarea
                                ref={textareaRef}
                                value={data.content}
                                onChange={e => setData('content', e.target.value)}
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                                onDrop={e => {
                                    const key = e.dataTransfer.getData('text/x-placeholder');
                                    if (!key) return; // not our drag — let textarea handle file/text drops normally
                                    e.preventDefault();
                                    insertPlaceholderAt(key);
                                }}
                                placeholder="Scrieți textul contractului. Trageți câmpurile din dreapta (sau click) pentru a le insera."
                                required
                                className="w-full h-80 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                            />
                            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
                        </div>

                        {/* Placeholder hints — click or drag onto the textarea */}
                        <div className="overflow-y-auto max-h-80 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Câmpuri disponibile</p>
                            <p className="text-xs text-slate-400 mb-3">Trageți peste text sau click pentru inserare</p>
                            {Object.entries(PLACEHOLDER_GROUPS).map(([group, fields]) => (
                                <div key={group} className="mb-3">
                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">{group}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {fields.map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                draggable
                                                onDragStart={e => {
                                                    e.dataTransfer.setData('text/x-placeholder', f);
                                                    e.dataTransfer.setData('text/plain', `{${f}}`);
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                    // Small drag image anchored at cursor (0,0) so the visual
                                                    // preview lines up exactly with the textarea drop position —
                                                    // default drag image is the whole chip, offset by where
                                                    // the user grabbed it, causing the apparent target to be
                                                    // off by a line.
                                                    const ghost = document.createElement('div');
                                                    ghost.textContent = `{${f}}`;
                                                    ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;background:#1d4ed8;color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-family:ui-monospace,SFMono-Regular,monospace;white-space:nowrap;';
                                                    document.body.appendChild(ghost);
                                                    e.dataTransfer.setDragImage(ghost, 0, 0);
                                                    // Remove the helper element after the browser has captured it.
                                                    setTimeout(() => ghost.remove(), 0);
                                                }}
                                                onClick={() => insertPlaceholder(f)}
                                                className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 active:cursor-grabbing cursor-grab font-mono border border-blue-100 transition-colors select-none"
                                            >
                                                {'{' + f + '}'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Anulează
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {processing ? 'Se salvează…' : isNew ? 'Creează șablon' : 'Salvează modificările'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── DeleteTemplateModal ───────────────────────────────────────────────────────

function DeleteTemplateModal({ template, onClose }) {
    const [busy, setBusy] = useState(false);

    const submit = () => {
        setBusy(true);
        router.delete(route('contracts.destroy', template.id), {
            preserveScroll: true,
            onFinish: () => { setBusy(false); onClose(); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">
                        ⚠
                    </div>
                    <div className="grow">
                        <h3 className="text-lg font-bold text-slate-900">Șterge șablonul?</h3>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                            Vei șterge definitiv <span className="font-semibold text-slate-700">„{template.name}"</span>.
                            Contractele deja generate din acest șablon rămân, dar nu vei mai putea genera unele noi.
                            Acțiunea nu poate fi anulată.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Anulează
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="flex-1 rounded-2xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {busy ? 'Se șterge…' : 'Da, șterge'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── TemplateCard ──────────────────────────────────────────────────────────────

function TemplateCard({ template, onGenerate, onEdit, onPreview, onDelete }) {
    const tType = TEMPLATE_TYPES[template.type] ?? { label: template.type, icon: '📄' };

    return (
        <div className="rounded-4xl bg-white border border-slate-100 p-6 hover:shadow-xl transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{tType.icon}</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold uppercase">
                        {LOCALE_LABELS[template.locale] ?? template.locale}
                    </span>
                    {template.is_default && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                            Implicit
                        </span>
                    )}
                </div>
            </div>

            <div className="font-bold text-slate-900 leading-snug">{template.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 mb-4">{tType.label}</div>

            {/* Actions */}
            <div className="mt-auto space-y-2">
                <button
                    onClick={onGenerate}
                    className="w-full rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                >
                    Generează document
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onPreview}
                        className="flex-1 rounded-2xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        👁 Preview
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-1 rounded-2xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        ✏ Editează
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-1 rounded-2xl border border-red-100 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:border-red-200"
                    >
                        🗑 Șterge
                    </button>
                </div>
            </div>
        </div>
    );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function Index({ templates = [], generated = [], properties = [], contacts = [] }) {
    const [generateFor, setGenerateFor]   = useState(null);
    const [editTemplate, setEditTemplate] = useState(null); // null=closed, {}=new, obj=edit
    const [deleteFor, setDeleteFor]       = useState(null);

    return (
        <AppLayout title="Documente Smart">
            <Head title="Documente" />

            {editTemplate !== null && (
                <TemplateEditorModal
                    template={editTemplate}
                    onClose={() => setEditTemplate(null)}
                />
            )}
            {generateFor && (
                <GenerateModal
                    template={generateFor}
                    properties={properties}
                    contacts={contacts}
                    onClose={() => setGenerateFor(null)}
                />
            )}
            {deleteFor && (
                <DeleteTemplateModal
                    template={deleteFor}
                    onClose={() => setDeleteFor(null)}
                />
            )}

            <div className="space-y-8">

                {/* ── Library ── */}
                <div>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Biblioteca de șabloane</h2>
                            <p className="text-sm text-slate-400 mt-0.5">{templates.length} șabloane active</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => router.post('/run-seeder/contracts', {}, { preserveScroll: true })}
                                title="Adaugă șabloanele standard care lipsesc din biblioteca ta"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                🔄 Sincronizează standard
                            </button>
                            <button
                                onClick={() => setEditTemplate({})}
                                className="rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                            >
                                + Creează document
                            </button>
                        </div>
                    </div>

                    {templates.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-12 text-center">
                            <div className="text-5xl mb-4">📄</div>
                            <p className="font-bold text-slate-700 mb-2">Niciun șablon în bibliotecă</p>
                            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                                Creați primul șablon sau instalați setul implicit REALTIX (13 documente standard, traduse în română).
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setEditTemplate({})}
                                    className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                                >
                                    + Creează document
                                </button>
                                <button
                                    onClick={() => router.post('/run-seeder/contracts', {}, { preserveState: false })}
                                    className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Instalează setul implicit
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    onGenerate={() => setGenerateFor(t)}
                                    onEdit={() => setEditTemplate(t)}
                                    onPreview={() => window.open(route('contracts.preview', t.id), '_blank')}
                                    onDelete={() => setDeleteFor(t)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Generated contracts ── */}
                {generated.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Contracte generate recent</h2>
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl overflow-x-auto">
                            <table className="w-full text-sm min-w-180">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['Document', 'Proprietate', 'Client', 'Agent', 'Data', 'Acțiuni'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {generated.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900 leading-snug">
                                                    {TEMPLATE_TYPES[g.template?.type]?.icon ?? '📄'} {g.template?.name ?? '—'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 text-xs">
                                                {g.property?.title ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 text-xs">
                                                {g.contact
                                                    ? `${g.contact.first_name} ${g.contact.last_name ?? ''}`
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400 text-xs">
                                                {g.user?.name ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                                                {new Date(g.created_at).toLocaleDateString('ro')}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {g.pdf_path && (
                                                    <a
                                                        href={`/storage/${g.pdf_path}`}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline mr-3"
                                                    >
                                                        ↓ PDF
                                                    </a>
                                                )}
                                                <a
                                                    href={`/contracts/generated/${g.id}/docx`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                                                >
                                                    ↓ DOCX
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
