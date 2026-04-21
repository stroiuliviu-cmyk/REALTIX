import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';

const inputCls = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700';
const selectCls = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 bg-white';

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

export default function Edit({ property }) {
    const { data, setData, put, processing, errors } = useForm({
        title: property.title ?? '',
        type: property.type ?? 'apartment',
        transaction_type: property.transaction_type ?? 'sale',
        price: property.price ?? '',
        currency: property.currency ?? 'EUR',
        area_total: property.area_total ?? '',
        rooms: property.rooms ?? '',
        floor: property.floor ?? '',
        floors_total: property.floors_total ?? '',
        address: property.address ?? '',
        city: property.city ?? 'Chișinău',
        district: property.district ?? '',
        description_ro: property.description_ro ?? '',
        description_ru: property.description_ru ?? '',
        description_en: property.description_en ?? '',
        status: property.status ?? 'active',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/properties/${property.id}`);
    };

    return (
        <AppLayout title="Editează proprietate">
            <Head title="Editează proprietate" />
            <div className="max-w-3xl">
                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-5">
                        <h2 className="text-lg font-bold text-slate-900">Informații de bază</h2>
                        <Field label="Titlu *" error={errors.title}>
                            <input value={data.title} onChange={e => setData('title', e.target.value)} className={inputCls} required />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Tip *" error={errors.type}>
                                <select value={data.type} onChange={e => setData('type', e.target.value)} className={selectCls}>
                                    <option value="apartment">Apartament</option>
                                    <option value="house">Casă</option>
                                    <option value="commercial">Comercial</option>
                                    <option value="land">Teren</option>
                                </select>
                            </Field>
                            <Field label="Tranzacție *">
                                <select value={data.transaction_type} onChange={e => setData('transaction_type', e.target.value)} className={selectCls}>
                                    <option value="sale">Vânzare</option>
                                    <option value="rent">Chirie</option>
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Preț"><input type="number" value={data.price} onChange={e => setData('price', e.target.value)} className={inputCls} min="0" /></Field>
                            <Field label="Monedă">
                                <select value={data.currency} onChange={e => setData('currency', e.target.value)} className={selectCls}>
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="MDL">MDL</option>
                                </select>
                            </Field>
                            <Field label="Status">
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
                            <Field label="Suprafață (m²)"><input type="number" value={data.area_total} onChange={e => setData('area_total', e.target.value)} className={inputCls} min="0" step="0.1" /></Field>
                            <Field label="Camere"><input type="number" value={data.rooms} onChange={e => setData('rooms', e.target.value)} className={inputCls} min="0" /></Field>
                            <Field label="Etaj"><input type="number" value={data.floor} onChange={e => setData('floor', e.target.value)} className={inputCls} /></Field>
                            <Field label="Total etaje"><input type="number" value={data.floors_total} onChange={e => setData('floors_total', e.target.value)} className={inputCls} min="1" /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Oraș *"><input value={data.city} onChange={e => setData('city', e.target.value)} className={inputCls} required /></Field>
                            <Field label="Sector"><input value={data.district} onChange={e => setData('district', e.target.value)} className={inputCls} /></Field>
                        </div>
                        <Field label="Adresă"><input value={data.address} onChange={e => setData('address', e.target.value)} className={inputCls} /></Field>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900">Descrieri</h2>
                        {[['ro', 'Română'], ['ru', 'Rusă'], ['en', 'Engleză']].map(([lang, label]) => (
                            <Field key={lang} label={`Descriere — ${label}`}>
                                <textarea
                                    value={data[`description_${lang}`]}
                                    onChange={e => setData(`description_${lang}`, e.target.value)}
                                    className="w-full h-32 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-700 resize-none"
                                    placeholder={`Descriere în ${label}...`}
                                />
                            </Field>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" disabled={processing} className="rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 px-8 py-3 text-white font-semibold shadow-lg disabled:opacity-50">
                            {processing ? 'Se salvează...' : 'Salvează modificările'}
                        </button>
                        <Link href={`/properties/${property.id}`} className="rounded-2xl border border-slate-200 px-8 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                            Anulează
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
