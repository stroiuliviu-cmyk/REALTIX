import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const statusColors = {
    lead: 'bg-amber-100 text-amber-700',
    active: 'bg-blue-100 text-blue-700',
    closed: 'bg-slate-100 text-slate-500',
};

const typeLabels = {
    buyer: 'Cumpărător',
    seller: 'Vânzător',
    landlord: 'Proprietar',
    tenant: 'Chiriaș',
};

function AddContactModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        type: 'buyer',
        status: 'lead',
        notes: '',
        source: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/contacts', { onSuccess: onClose });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Contact nou</h2>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Prenume *</label>
                            <input
                                value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            />
                            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nume</label>
                            <input
                                value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Telefon</label>
                            <input
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tip</label>
                            <select
                                value={data.type}
                                onChange={e => setData('type', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            >
                                {Object.entries(typeLabels).map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                            <select
                                value={data.status}
                                onChange={e => setData('status', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            >
                                <option value="lead">Lead</option>
                                <option value="active">Activ</option>
                                <option value="closed">Închis</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Sursă</label>
                        <input
                            value={data.source}
                            onChange={e => setData('source', e.target.value)}
                            placeholder="ex: organic, referral, 999.md"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-2xl bg-slate-900 py-3 text-white font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Se salvează...' : 'Adaugă contact'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 py-3 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Anulează
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Index({ contacts, filters }) {
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState(filters?.search ?? '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/contacts', { search, status: filters?.status }, { preserveState: true });
    };

    return (
        <AppLayout title="Clienți CRM">
            <Head title="Clienți" />
            {showModal && <AddContactModal onClose={() => setShowModal(false)} />}

            <div className="space-y-6">
                {/* Kanban header row */}
                <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Bază de date Clienți</h2>
                            <p className="text-sm text-slate-500 mt-1">{contacts.total} contacte totale</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="rounded-full bg-gradient-to-r from-slate-900 to-blue-700 px-6 py-2.5 text-white shadow-lg text-sm font-semibold"
                        >
                            + Contact nou
                        </button>
                    </div>

                    {/* Search + filters */}
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după nume sau telefon..."
                            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                        />
                        <select
                            value={filters?.status ?? ''}
                            onChange={e => router.get('/contacts', { search, status: e.target.value }, { preserveState: true })}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                        >
                            <option value="">Toate statusurile</option>
                            <option value="lead">Lead</option>
                            <option value="active">Activ</option>
                            <option value="closed">Închis</option>
                        </select>
                        <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white text-sm font-semibold">
                            Caută
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3">Nume</th>
                                    <th className="px-4 py-3">Telefon</th>
                                    <th className="px-4 py-3">Tip</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Sursă</th>
                                    <th className="px-4 py-3">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-400">
                                            Niciun contact. Adaugă primul client!
                                        </td>
                                    </tr>
                                ) : contacts.data.map(contact => (
                                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-4 font-bold text-slate-900">
                                            <Link href={`/contacts/${contact.id}`} className="hover:text-blue-700">
                                                {contact.first_name} {contact.last_name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4">{contact.phone ?? '—'}</td>
                                        <td className="px-4 py-4">{typeLabels[contact.type] ?? contact.type}</td>
                                        <td className="px-4 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[contact.status] ?? 'bg-slate-100'}`}>
                                                {contact.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-400">{contact.source ?? '—'}</td>
                                        <td className="px-4 py-4">
                                            <Link href={`/contacts/${contact.id}`} className="text-blue-700 hover:underline text-xs font-semibold">
                                                Detalii
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {contacts.last_page > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            {contacts.links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                        link.active ? 'bg-slate-900 text-white' :
                                        link.url ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'opacity-30'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
