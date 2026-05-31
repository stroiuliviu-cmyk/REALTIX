import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Clock, Search } from 'lucide-react';

const statusColors = {
    lead:   'bg-amber-100 text-amber-700 hover:bg-amber-200',
    active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    closed: 'bg-red-100 text-red-700 hover:bg-red-200',
};

const statusLabels = { lead: 'Lead', active: 'Activ', closed: 'Închis' };

function StatusDropdown({ contact }) {
    const handleChange = (e) => {
        const next = e.target.value;
        if (next === contact.status) return;
        router.patch(route('contacts.status', contact.id), { status: next }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const cls = statusColors[contact.status] ?? 'bg-slate-100 text-slate-500';

    return (
        <select
            value={contact.status}
            onChange={handleChange}
            onClick={e => e.stopPropagation()}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors ${cls}`}
        >
            {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
            ))}
        </select>
    );
}

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

    const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200/70 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-slate-900 mb-5">Contact nou</h2>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Prenume *</label>
                            <input
                                value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                className={inputCls}
                            />
                            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nume</label>
                            <input
                                value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Telefon</label>
                            <input
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tip</label>
                            <select
                                value={data.type}
                                onChange={e => setData('type', e.target.value)}
                                className={inputCls}
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
                                className={inputCls}
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
                            className={inputCls}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Anulează
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Se salvează…' : 'Adaugă contact'}
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
                {/* Header card */}
                <div className="rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200/70">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Bază de date Clienți</h2>
                            <p className="text-sm text-slate-500 mt-0.5">{contacts.total} contacte totale</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white shadow-sm text-sm font-semibold transition-colors"
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            Contact nou
                        </button>
                    </div>

                    {/* Search + filters */}
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după nume sau telefon…"
                            className="flex-1 min-w-0 sm:min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                        <div className="flex gap-2 sm:gap-3 flex-wrap">
                            <select
                                value={filters?.status ?? ''}
                                onChange={e => router.get('/contacts', { ...filters, search, status: e.target.value }, { preserveState: true })}
                                className="flex-1 sm:flex-initial rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            >
                                <option value="">Toate statusurile</option>
                                <option value="lead">Lead</option>
                                <option value="active">Activ</option>
                                <option value="closed">Închis</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => router.get('/contacts', { ...filters, search, forgotten: filters?.forgotten ? '' : '1' }, { preserveState: true })}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                    filters?.forgotten
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'
                                }`}
                                title="Doar contacte fără activitate de >30 zile"
                            >
                                <Clock className="w-4 h-4" />
                                <span className="hidden sm:inline">Uitate</span>
                            </button>
                            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-white text-sm font-semibold shadow-sm transition-colors">
                                <Search className="w-4 h-4" />
                                Caută
                            </button>
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="rounded-xl bg-white p-3 sm:p-6 shadow-sm border border-slate-200/70">
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
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
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link href={`/contacts/${contact.id}`} className="hover:text-blue-700">
                                                    {contact.first_name} {contact.last_name}
                                                </Link>
                                                {contact.is_forgotten && (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md"
                                                        title="Niciun contact > 30 zile"
                                                    >
                                                        <Clock className="w-3 h-3" />
                                                        Uitat
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">{contact.phone ?? '—'}</td>
                                        <td className="px-4 py-4">{typeLabels[contact.type] ?? contact.type}</td>
                                        <td className="px-4 py-4">
                                            <StatusDropdown contact={contact} />
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        link.active ? 'bg-blue-600 text-white shadow-sm' :
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
