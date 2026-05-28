import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head } from '@inertiajs/react';

const CATEGORY_LABELS = {
    apartment:  'Apartamente',
    house:      'Case',
    cottage:    'Vile/Cabane',
    land:       'Terenuri',
    garage:     'Garaje',
    commercial: 'Comercial',
};

function formatBytes(b) {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let v = Number(b);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function MetricCard({ label, value, accent = 'slate' }) {
    const palette = { slate: 'bg-white border-slate-200', amber: 'bg-amber-50 border-amber-200', rose: 'bg-rose-50 border-rose-200', emerald: 'bg-emerald-50 border-emerald-200' };
    return (
        <div className={`rounded-xl border ${palette[accent]} px-5 py-4`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">{value}</div>
        </div>
    );
}

export default function Index({ disk, media, byAgency, foldersByDir, scrapedByCategory = [], planLabels }) {
    const diskAccent = disk.used_pct > 90 ? 'rose' : disk.used_pct > 75 ? 'amber' : 'emerald';

    return (
        <SuperAdminLayout title="Storage" breadcrumb="Super Admin · Disk & Media">
            <Head title="Storage — Super Admin" />

            <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Disk used" value={`${disk.used_pct}%`} accent={diskAccent} />
                    <MetricCard label="Free space" value={formatBytes(disk.free_bytes)} accent="emerald" />
                    <MetricCard label="Total media files" value={media.total_files.toLocaleString('ro')} />
                    <MetricCard label="Total media size" value={formatBytes(media.total_agency_bytes)} />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-900">Disk utilization</h3>
                        <span className="text-xs text-slate-500 font-mono">
                            {formatBytes(disk.used_bytes)} / {formatBytes(disk.total_bytes)}
                        </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${disk.used_pct > 90 ? 'bg-rose-500' : disk.used_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${disk.used_pct}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Pe folder</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(foldersByDir).map(([dir, info]) => (
                            <div key={dir} className="rounded-lg bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500 uppercase font-bold">/{dir}</div>
                                <div className="text-lg font-black text-slate-900 mt-1">{formatBytes(info.bytes)}</div>
                                <div className="text-xs text-slate-500">{info.files.toLocaleString('ro')} fișiere</div>
                            </div>
                        ))}
                    </div>
                </div>

                {scrapedByCategory.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold text-slate-900">Scraped 999.md pe categorie</h3>
                            <span className="text-xs text-slate-400">mărime estimată (152.7 KB/imagine)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-160">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-2">Categorie</th>
                                        <th className="px-4 py-2 text-right">Listings</th>
                                        <th className="px-4 py-2 text-right">Imagini</th>
                                        <th className="px-4 py-2 text-right">Mărime estimată</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {scrapedByCategory.map(c => (
                                        <tr key={c.type}>
                                            <td className="px-4 py-2 font-semibold text-slate-800">{CATEGORY_LABELS[c.type] ?? c.type}</td>
                                            <td className="px-4 py-2 text-right text-slate-700">{Number(c.listings).toLocaleString('ro')}</td>
                                            <td className="px-4 py-2 text-right text-slate-700">{Number(c.total_images).toLocaleString('ro')}</td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-900">{formatBytes(c.est_bytes)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Top 20 agenții (după storage media)</h3>
                    </div>
                    {byAgency.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-slate-400">Nicio agenție cu media încărcat.</p>
                    ) : (
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-160">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-2">Agenție</th>
                                    <th className="px-4 py-2">Plan</th>
                                    <th className="px-4 py-2 text-right">Fișiere</th>
                                    <th className="px-4 py-2 text-right">Mărime</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {byAgency.map(a => (
                                    <tr key={a.id}>
                                        <td className="px-4 py-2 font-semibold text-slate-800">{a.name}</td>
                                        <td className="px-4 py-2 text-slate-500">{planLabels[a.subscription_plan] ?? a.subscription_plan}</td>
                                        <td className="px-4 py-2 text-right text-slate-700">{Number(a.files).toLocaleString('ro')}</td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-900">{formatBytes(a.bytes)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
