import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

const statusColors = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    posted:   'bg-blue-100 text-blue-700',
};
const statusLabels = { pending: 'În așteptare', approved: 'Aprobat', rejected: 'Respins', posted: 'Publicat' };

export default function Index({ requests = [] }) {
    return (
        <AppLayout title="Autopostare">
            <Head title="Autopostare" />
            <div className="space-y-6">
                <div className="rounded-4xl bg-white border border-slate-100 shadow-xl p-8">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Publicare pe platforme externe</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Publică anunțuri pe 999.md, Facebook, OLX și alte platforme cu un singur click. Fiecare publicare trece prin aprobare admin.
                    </p>

                    {requests.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4">📤</div>
                            <div className="font-bold text-slate-700 mb-2">Nicio cerere de publicare</div>
                            <p className="text-sm text-slate-400">
                                Creează un anunț și folosește butonul "Autopostare" din cardul proprietății.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(r => (
                                <div key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{r.property?.title ?? '—'}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Target: {r.target}</div>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                        {statusLabels[r.status] ?? r.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
