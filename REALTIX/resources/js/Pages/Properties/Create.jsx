import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

const inputCls = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700';
const selectCls = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 bg-white';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        type: 'apartment',
        transaction_type: 'sale',
        price: '',
        currency: 'EUR',
        area_total: '',
        rooms: '',
        floor: '',
        floors_total: '',
        address: '',
        city: 'Chișinău',
        district: '',
        description_ro: '',
        status: 'active',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/properties');
    };

    return (
        <AppLayout title="Proprietate nouă">
            <Head title="Proprietate nouă" />
            <div className="max-w-3xl">
                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-5">
                        <h2 className="text-lg font-bold text-slate-900">Informații de bază</h2>

                        <Field label="Titlu *" error={errors.title}>
                            <input value={data.title} onChange={e => setData('title', e.target.value)} className={inputCls} required />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Tip proprietate *" error={errors.type}>
                                <select value={data.type} onChange={e => setData('type', e.target.value)} className={selectCls}>
                                    <option value="apartment">Apartament</option>
                                    <option value="house">Casă</option>
                                    <option value="commercial">Comercial</option>
                                    <option value="land">Teren</option>
                                </select>
                            </Field>
                            <Field label="Tip tranzacție *" error={errors.transaction_type}>
                                <select value={data.transaction_type} onChange={e => setData('transaction_type', e.target.value)} className={selectCls}>
                                    <option value="sale">Vânzare</option>
                                    <option value="rent">Chirie</option>
                                </select>
                            </Field>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Preț" error={errors.price}>
                                <input type="number" value={data.price} onChange={e => setData('price', e.target.value)} className={inputCls} min="0" />
                            </Field>
                            <Field label="Monedă" error={errors.currency}>
                                <select value={data.currency} onChange={e => setData('currency', e.target.value)} className={selectCls}>
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="MDL">MDL</option>
                                </select>
                            </Field>
                            <Field label="Status *" error={errors.status}>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className={selectCls}>
                                    <option value="active">Activ</option>
                                    <option value="inactive">Inactiv</option>
                                    <option value="sold">Vândut</option>
                                    <option value="rented">Închiriat</option>
                                </select>
                            </Field>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-5">
                        <h2 className="text-lg font-bold text-slate-900">Caracteristici</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="Suprafață totală (m²)" error={errors.area_total}>
                                <input type="number" value={data.area_total} onChange={e => setData('area_total', e.target.value)} className={inputCls} min="0" step="0.1" />
                            </Field>
                            <Field label="Camere" error={errors.rooms}>
                                <input type="number" value={data.rooms} onChange={e => setData('rooms', e.target.value)} className={inputCls} min="0" />
                            </Field>
                            <Field label="Etaj" error={errors.floor}>
                                <input type="number" value={data.floor} onChange={e => setData('floor', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Total etaje" error={errors.floors_total}>
                                <input type="number" value={data.floors_total} onChange={e => setData('floors_total', e.target.value)} className={inputCls} min="1" />
                            </Field>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-5">
                        <h2 className="text-lg font-bold text-slate-900">Locație</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Oraș *" error={errors.city}>
                                <input value={data.city} onChange={e => setData('city', e.target.value)} className={inputCls} required />
                            </Field>
                            <Field label="Sector/District" error={errors.district}>
                                <input value={data.district} onChange={e => setData('district', e.target.value)} className={inputCls} />
                            </Field>
                        </div>
                        <Field label="Adresă" error={errors.address}>
                            <input value={data.address} onChange={e => setData('address', e.target.value)} className={inputCls} />
                        </Field>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-5">
                        <h2 className="text-lg font-bold text-slate-900">Descriere (RO)</h2>
                        <textarea
                            value={data.description_ro}
                            onChange={e => setData('description_ro', e.target.value)}
                            className="w-full h-40 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-700 resize-none"
                            placeholder="Descriere proprietate în română..."
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 px-8 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
                        >
                            {processing ? 'Se salvează...' : 'Adaugă proprietatea'}
                        </button>
                        <Link href="/properties" className="rounded-2xl border border-slate-200 px-8 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                            Anulează
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
