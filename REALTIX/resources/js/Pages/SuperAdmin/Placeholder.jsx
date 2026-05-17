import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head } from '@inertiajs/react';

export default function Placeholder({ section, description }) {
    return (
        <SuperAdminLayout title={section} breadcrumb={`Super Admin · ${section}`}>
            <Head title={`${section} — Super Admin`} />

            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <div className="text-5xl mb-4">🚧</div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{section}</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                    {description ?? 'Această secțiune face parte din Phase 1+ a Super Admin Panel. Foundation-ul e gata; conținutul real urmează.'}
                </p>
            </div>
        </SuperAdminLayout>
    );
}
