import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const PLAN_LABELS = { starter: 'Solo', medium: 'Team', pro: 'Growth' };
const PLAN_COLORS = {
    starter: 'bg-slate-100 text-slate-700',
    medium:  'bg-blue-100 text-blue-700',
    pro:     'bg-violet-100 text-violet-700',
};

function PlanForm({ plan = null, onClose }) {
    const isEdit = !!plan;
    const form = useForm({
        name:                  plan?.name ?? '',
        slug:                  plan?.slug ?? '',
        price_monthly:         plan?.price_monthly ?? 0,
        max_listings:          plan?.max_listings ?? -1,
        max_realtors:          plan?.max_realtors ?? 1,
        seats_included:        plan?.seats_included ?? 1,
        price_per_extra_seat:  plan?.price_per_extra_seat ?? '',
        stripe_price_id:       plan?.stripe_price_id ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            form.patch(route('super-admin.plans.update', plan.id), { preserveScroll: true, onSuccess: onClose });
        } else {
            form.post(route('super-admin.plans.store'), { preserveScroll: true, onSuccess: onClose });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{isEdit ? `Edit plan: ${plan.name}` : 'Plan nou'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nume</label>
                            <input value={form.data.name} onChange={e => form.setData('name', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                            {form.errors.name && <p className="text-xs text-rose-600 mt-1">{form.errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Slug</label>
                            <input value={form.data.slug} onChange={e => form.setData('slug', e.target.value)}
                                disabled={isEdit}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-400 disabled:bg-slate-100" />
                            {form.errors.slug && <p className="text-xs text-rose-600 mt-1">{form.errors.slug}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Preț lunar (€)</label>
                        <input type="number" step="0.01" value={form.data.price_monthly} onChange={e => form.setData('price_monthly', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Max anunțuri</label>
                            <input type="number" value={form.data.max_listings} onChange={e => form.setData('max_listings', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                            <p className="text-[10px] text-slate-400 mt-1">-1 = nelimitat</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seats incluse</label>
                            <input type="number" value={form.data.seats_included} onChange={e => form.setData('seats_included', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Max agenți</label>
                            <input type="number" value={form.data.max_realtors} onChange={e => form.setData('max_realtors', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Preț / seat extra (opțional)</label>
                        <input type="number" step="0.01" value={form.data.price_per_extra_seat} onChange={e => form.setData('price_per_extra_seat', e.target.value)}
                            placeholder="ex: 8.00 doar pentru Growth"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Stripe Price ID</label>
                        <input value={form.data.stripe_price_id} onChange={e => form.setData('stripe_price_id', e.target.value)}
                            placeholder="price_1Q..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-400" />
                    </div>

                    <button type="submit" disabled={form.processing} className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
                        {form.processing ? 'Se salvează…' : isEdit ? 'Salvează modificări' : 'Creează plan'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function Subscriptions({ plans }) {
    const [editing, setEditing] = useState(null);
    const [showNew, setShowNew] = useState(false);

    const remove = (plan) => {
        if (!confirm(`Șterge planul „${plan.name}"? Nu se poate dacă există agenții pe el.`)) return;
        router.delete(route('super-admin.plans.destroy', plan.id), { preserveScroll: true });
    };

    return (
        <SuperAdminLayout title="Subscription Plans" breadcrumb="Super Admin · Plans">
            <Head title="Plans — Super Admin" />

            {(editing || showNew) && (
                <PlanForm plan={editing} onClose={() => { setEditing(null); setShowNew(false); }} />
            )}

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{plans.length} plan{plans.length !== 1 ? 'uri' : ''} configurate</p>
                    <button onClick={() => setShowNew(true)} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-bold hover:bg-slate-700">
                        + Plan nou
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {plans.map(p => (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-xs font-mono text-slate-400">{p.slug}</div>
                                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{p.name}</h3>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PLAN_COLORS[p.slug] ?? 'bg-slate-100'}`}>
                                    {PLAN_LABELS[p.slug] ?? p.slug}
                                </span>
                            </div>

                            <div className="text-3xl font-black text-slate-900">
                                €{Number(p.price_monthly).toFixed(0)}
                                <span className="text-sm text-slate-400 font-normal"> /lună</span>
                                {Number(p.price_per_extra_seat) > 0 && (
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        + €{Number(p.price_per_extra_seat).toFixed(0)}/seat peste {p.seats_included}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 text-sm pt-3 border-t border-slate-100">
                                <div className="flex justify-between"><span className="text-slate-500">Max anunțuri</span><span className="font-bold">{p.max_listings === -1 ? '∞' : p.max_listings}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Seats incluse</span><span className="font-bold">{p.seats_included}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Max agenți</span><span className="font-bold">{p.max_realtors === -1 ? '∞' : p.max_realtors}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Agenții pe plan</span><span className="font-bold">{p.agencies_count}</span></div>
                            </div>

                            {p.stripe_price_id && (
                                <div className="text-[10px] text-slate-400 font-mono truncate" title={p.stripe_price_id}>
                                    Stripe: {p.stripe_price_id}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setEditing(p)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                                    ✎ Edit
                                </button>
                                <button onClick={() => remove(p)} disabled={p.agencies_count > 0}
                                    className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-xs font-semibold hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed">
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
