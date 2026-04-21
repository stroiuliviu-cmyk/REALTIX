import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const TEMPLATE_TYPES = {
    sale:     { label: 'Vânzare-cumpărare', icon: '🏷' },
    rent:     { label: 'Chirie',             icon: '🔑' },
    mandate:  { label: 'Mandat',             icon: '📋' },
    advance:  { label: 'Avans / Acont',      icon: '💰' },
    handover: { label: 'Proces-verbal',      icon: '📝' },
};

function GenerateModal({ template, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        property_id: '',
        contact_id:  '',
        fields: {},
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('contracts.generate', template.id), {
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-md mx-4 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Generează contract</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{template.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            ID Proprietate <span className="font-normal normal-case">(opțional)</span>
                        </label>
                        <input
                            type="number"
                            value={data.property_id}
                            onChange={e => setData('property_id', e.target.value)}
                            placeholder="ex. 1"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            ID Client <span className="font-normal normal-case">(opțional)</span>
                        </label>
                        <input
                            type="number"
                            value={data.contact_id}
                            onChange={e => setData('contact_id', e.target.value)}
                            placeholder="ex. 1"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Data contractului</label>
                        <input
                            type="date"
                            value={data.fields?.data_contractului ?? ''}
                            onChange={e => setData('fields', { ...data.fields, data_contractului: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            Anulează
                        </button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-60">
                            {processing ? 'Se generează...' : 'Generează PDF'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Index({ templates = [], generated = [] }) {
    const [generateFor, setGenerateFor] = useState(null);
    const { flash } = usePage().props;

    return (
        <AppLayout title="Contracte & Documente">
            <Head title="Contracte" />
            {generateFor && <GenerateModal template={generateFor} onClose={() => setGenerateFor(null)} />}

            <div className="space-y-8">
                {flash?.success && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800"
                        dangerouslySetInnerHTML={{ __html: flash.success }} />
                )}

                {/* Template library */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Biblioteca de șabloane</h2>
                    </div>

                    {templates.length === 0 ? (
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-12 text-center">
                            <div className="text-5xl mb-4">📄</div>
                            <div className="font-bold text-slate-700 mb-2">Niciun șablon</div>
                            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                                Rulați seeder-ul pentru a adăuga șabloanele implicite REALTIX.
                            </p>
                            <button
                                onClick={() => router.post('/run-seeder/contracts', {}, { preserveState: false })}
                                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                            >
                                Instalează șabloane implicite
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
                                {Object.entries(TEMPLATE_TYPES).slice(0, 3).map(([key, t]) => (
                                    <div key={key} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
                                        <div className="text-3xl mb-2">{t.icon}</div>
                                        <div className="text-xs font-bold text-slate-600">{t.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <div key={t.id} className="rounded-4xl bg-white border border-slate-100 p-6 hover:shadow-xl transition-shadow">
                                    <div className="text-3xl mb-3">{TEMPLATE_TYPES[t.type]?.icon ?? '📄'}</div>
                                    <div className="font-bold text-slate-900">{t.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{TEMPLATE_TYPES[t.type]?.label}</div>
                                    {t.is_default && (
                                        <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                                            Implicit
                                        </span>
                                    )}
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => setGenerateFor(t)}
                                            className="flex-1 rounded-2xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                                        >
                                            Generează
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Generated contracts */}
                {generated.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Contracte generate</h2>
                        <div className="rounded-4xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['Șablon', 'Proprietate', 'Client', 'Data', 'Acțiuni'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {generated.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 font-semibold">{g.template?.name ?? '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">{g.property?.title ?? '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {g.contact ? `${g.contact.first_name} ${g.contact.last_name}` : '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-500 text-xs">
                                                {new Date(g.created_at).toLocaleDateString('ro')}
                                            </td>
                                            <td className="px-5 py-4">
                                                {g.pdf_path && (
                                                    <a
                                                        href={`/storage/${g.pdf_path}`}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="text-xs font-semibold text-blue-700 hover:underline"
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
