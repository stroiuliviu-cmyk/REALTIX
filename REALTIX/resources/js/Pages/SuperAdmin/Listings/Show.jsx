import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function Show({ property, reports, aiActivity, moderationLogs }) {
    const toggleFeature = () => {
        router.post(route('super-admin.listings.feature', property.id), {}, { preserveScroll: true });
    };
    const remove = () => {
        if (!confirm(`Șterge anunțul „${property.title}"?`)) return;
        router.delete(route('super-admin.listings.destroy', property.id));
    };

    return (
        <SuperAdminLayout breadcrumb={<Link href="/super-admin/listings" className="hover:text-slate-700">Listings</Link>}>
            <Head title={`${property.title} — Super Admin`} />

            <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                            <div className="text-sm text-slate-500 mt-1">
                                {property.address ?? property.city} · {property.type} · {property.transaction_type}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-mono">
                                #{property.id} · Agency: {property.agency?.name} · Owner: {property.user?.name}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/properties/${property.id}`} target="_blank" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                                👁 Open in app
                            </Link>
                            <button onClick={toggleFeature} className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-bold hover:bg-amber-100">
                                ⭐ {property.meta?.featured ? 'Unfeature' : 'Feature'}
                            </button>
                            <button onClick={remove} className="rounded-lg bg-rose-600 text-white px-3 py-2 text-sm font-bold hover:bg-rose-700">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Imagini ({property.media?.length ?? 0})</h3>
                        {(property.media ?? []).length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-6">Nicio imagine.</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {property.media.map(m => (
                                    <img key={m.id} src={`/storage/${m.path}`} alt="" className="w-full aspect-square object-cover rounded-lg" />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Metadata</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Status</span><span className="font-semibold">{property.status}</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Preț</span><span className="font-semibold">{property.price ? `${Number(property.price).toLocaleString('ro')} ${property.currency}` : '—'}</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Suprafață</span><span className="font-semibold">{property.area_total ?? '—'} m²</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Camere</span><span className="font-semibold">{property.rooms ?? '—'}</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Sector</span><span className="font-semibold">{property.district ?? '—'}</span></div>
                            <div className="flex justify-between py-1"><span className="text-slate-500">Creat</span><span className="font-semibold">{new Date(property.created_at).toLocaleDateString('ro')}</span></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Descriere (RO)</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{property.description_ro || '—'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Rapoarte ({reports.length})</h3>
                        </div>
                        {reports.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-slate-400">Niciun raport.</p>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {reports.map(r => (
                                    <div key={r.id} className="px-5 py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{r.status}</span>
                                            <span className="text-slate-500">{r.reporter?.name ?? '—'}</span>
                                            <span className="ml-auto text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString('ro')}</span>
                                        </div>
                                        <div className="text-slate-700 mt-1">{r.reason}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">AI activity ({aiActivity.length})</h3>
                        </div>
                        {aiActivity.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-slate-400">Niciun log AI pentru acest anunț.</p>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {aiActivity.map(a => (
                                    <div key={a.id} className="px-5 py-2 flex items-center gap-3 text-xs">
                                        <span className="text-slate-400 font-mono whitespace-nowrap">{new Date(a.created_at).toLocaleDateString('ro')}</span>
                                        <span className="font-mono px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{a.action}</span>
                                        <span className="text-slate-700 flex-1 truncate">{a.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {moderationLogs.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Moderation history</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {moderationLogs.map(l => (
                                <div key={l.id} className="px-5 py-2 flex items-center gap-3 text-xs">
                                    <span className="text-slate-400 font-mono whitespace-nowrap">{new Date(l.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{l.action}</span>
                                    <span className="text-slate-700 flex-1 truncate">{l.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}
