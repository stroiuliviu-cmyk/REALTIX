import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
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

const LOCALE_LABELS = { ro: 'RO', ru: 'RU', en: 'EN' };

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
    data_contractului:  'Data contractului',
    oras:               'Orașul',
    cnp_vanzator:       'CNP Vânzător',
    nume_vanzator:      'Nume Vânzător',
    adresa_vanzator:    'Adresa Vânzător',
    adresa_client:      'Adresa Client',
    cnp_client:         'CNP Client',
    durata_luni:        'Durată (luni)',
    data_start:         'Data start',
    data_sfarsit:       'Data sfârșit',
    depozit:            'Depozit (sumă)',
    cnp_proprietar:     'CNP Proprietar',
    nume_proprietar:    'Nume Proprietar',
    tipul_tranzactiei:  'Tipul tranzacției',
    comision_procent:   'Comision (%)',
    durata_zile:        'Durată (zile)',
    data_vizionarii:    'Data vizionării',
};

// Fields auto-filled by backend — won't appear in manual mini-form
const AUTO_FILLED = new Set([
    'property_id', 'contact_id',
    'adresa_proprietate', 'titlu_proprietate', 'oras', 'pret', 'valuta',
    'numar_camere', 'suprafata', 'suprafata_locuibila', 'etaj', 'numar_cadastral',
    'nume_client', 'telefon_client', 'email_client',
    'nume_agent', 'email_agent', 'nume_agentie',
]);

function extractManualFields(content) {
    const matches = [...content.matchAll(/\{(\w+)\}/g)];
    return [...new Set(matches.map(m => m[1]))].filter(k => !AUTO_FILLED.has(k));
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
            return renderRow(o).text.toLowerCase().includes(query.toLowerCase());
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
                            onChange={v => setData('property_id', v)}
                            placeholder="Caută după titlu sau adresă…"
                            renderRow={p => ({
                                text: p.title ?? `#${p.id}`,
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
                            onChange={v => setData('contact_id', v)}
                            placeholder="Caută după nume sau telefon…"
                            renderRow={c => ({
                                text: [c.first_name, c.last_name].filter(Boolean).join(' '),
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
                            {processing ? 'Se generează…' : 'Generează PDF'}
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

    const { data, setData, post, patch, processing, errors } = useForm({
        name:    template.name    ?? '',
        type:    template.type    ?? 'sale',
        locale:  template.locale  ?? 'ro',
        content: template.content ?? '',
    });

    const insertPlaceholder = key => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end   = el.selectionEnd;
        const text  = `{${key}}`;
        setData('content', data.content.substring(0, start) + text + data.content.substring(end));
        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + text.length;
            el.focus();
        });
    };

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
                <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {isNew ? '+ Șablon nou' : 'Editează șablon'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                </div>

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
                                placeholder="Scrieți textul contractului. Folosiți {camp} pentru câmpuri dinamice."
                                required
                                className="w-full h-80 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                            />
                            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
                        </div>

                        {/* Placeholder hints */}
                        <div className="overflow-y-auto max-h-80 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Câmpuri disponibile</p>
                            <p className="text-xs text-slate-400 mb-3">Click → inserare în text</p>
                            {Object.entries(PLACEHOLDER_GROUPS).map(([group, fields]) => (
                                <div key={group} className="mb-3">
                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">{group}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {fields.map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => insertPlaceholder(f)}
                                                className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-mono border border-blue-100 transition-colors"
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

// ── TemplateCard ──────────────────────────────────────────────────────────────

function TemplateCard({ template, onGenerate, onEdit, onPreview }) {
    const [confirmDel, setConfirmDel] = useState(false);
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
                    {confirmDel ? (
                        <button
                            onClick={() => router.delete(route('contracts.destroy', template.id), { preserveScroll: true })}
                            className="flex-1 rounded-2xl bg-red-600 py-1.5 text-xs font-semibold text-white"
                        >
                            Sigur?
                        </button>
                    ) : (
                        <button
                            onClick={() => setConfirmDel(true)}
                            onBlur={() => setTimeout(() => setConfirmDel(false), 1500)}
                            className="flex-1 rounded-2xl border border-red-100 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                            Șterge
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Index({ templates = [], generated = [], properties = [], contacts = [] }) {
    const [generateFor, setGenerateFor]   = useState(null);
    const [editTemplate, setEditTemplate] = useState(null); // null=closed, {}=new, obj=edit
    const { flash } = usePage().props;

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

            <div className="space-y-8">
                {/* Flash */}
                {flash?.success && (
                    <div
                        className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800"
                        dangerouslySetInnerHTML={{ __html: flash.success }}
                    />
                )}

                {/* ── Library ── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Biblioteca de șabloane</h2>
                            <p className="text-sm text-slate-400 mt-0.5">{templates.length} șabloane active</p>
                        </div>
                        <button
                            onClick={() => setEditTemplate({})}
                            className="rounded-2xl bg-linear-to-br from-slate-900 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                            + Șablon nou
                        </button>
                    </div>

                    {templates.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-12 text-center">
                            <div className="text-5xl mb-4">📄</div>
                            <p className="font-bold text-slate-700 mb-2">Niciun șablon în bibliotecă</p>
                            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                                Creați primul șablon sau instalați setul implicit REALTIX (6 documente standard).
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setEditTemplate({})}
                                    className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                                >
                                    + Șablon nou
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
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Generated contracts ── */}
                {generated.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Contracte generate recent</h2>
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                            <table className="w-full text-sm">
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
                                            <td className="px-5 py-4">
                                                {g.pdf_path && (
                                                    <a
                                                        href={`/storage/${g.pdf_path}`}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                                                    >
                                                        ↓ PDF
                                                    </a>
                                                )}
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
