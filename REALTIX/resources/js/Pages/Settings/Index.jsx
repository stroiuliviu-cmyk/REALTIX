import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const tabs = [
    { key: 'profile',       label: 'Profil',        icon: '👤' },
    { key: 'agency',        label: 'Agenție',        icon: '🏢' },
    { key: 'users',         label: 'Utilizatori',   icon: '👥' },
    { key: 'notifications', label: 'Notificări',    icon: '🔔' },
    { key: 'security',      label: 'Securitate',    icon: '🔒' },
    { key: 'integrations',  label: 'Integrări',     icon: '🔗' },
];

function Toggle({ checked, onChange, label }) {
    return (
        <label className="flex items-center justify-between cursor-pointer py-3">
            <span className="text-sm text-slate-700">{label}</span>
            <div
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-700' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
        </label>
    );
}

function ProfileTab({ user }) {
    const { data, setData, patch, processing, errors } = useForm({
        name:     user.name ?? '',
        email:    user.email ?? '',
        phone:    user.phone ?? '',
        position: user.position ?? '',
        locale:   user.locale ?? 'ro',
    });

    const submit = (e) => {
        e.preventDefault();
        patch('/profile');
    };

    return (
        <form onSubmit={submit} className="space-y-5 max-w-lg">
            <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-black text-blue-700">
                    {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                    <button type="button" className="text-xs text-blue-700 hover:underline mt-1">Schimbă fotografia</button>
                </div>
            </div>

            {[
                { key: 'name',     label: 'Nume complet *',  type: 'text' },
                { key: 'email',    label: 'Email *',         type: 'email' },
                { key: 'phone',    label: 'Telefon',         type: 'tel' },
                { key: 'position', label: 'Funcție',         type: 'text', placeholder: 'ex: Agent imobiliar' },
            ].map(f => (
                <div key={f.key}>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                    <input
                        type={f.type}
                        value={data[f.key]}
                        onChange={e => setData(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                    />
                    {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
                </div>
            ))}

            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Limbă interfață</label>
                <select
                    value={data.locale}
                    onChange={e => setData('locale', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                    <option value="ro">Română</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                </select>
            </div>

            <button type="submit" disabled={processing} className="rounded-2xl bg-slate-900 px-6 py-3 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors">
                {processing ? 'Se salvează...' : 'Salvează modificările'}
            </button>
        </form>
    );
}

function AgencyTab({ agency }) {
    const [name, setName] = useState(agency?.name ?? '');

    return (
        <div className="space-y-5 max-w-lg">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Numele agenției</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Subdomeniu</label>
                <div className="flex items-center rounded-2xl border border-slate-200 overflow-hidden">
                    <input value={agency?.slug ?? ''} readOnly className="flex-1 px-4 py-2.5 text-sm bg-slate-50 text-slate-500" />
                    <span className="px-4 py-2.5 text-xs text-slate-400 bg-slate-50 border-l border-slate-200">.realtix.md</span>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Plan abonament</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-900 capitalize">{agency?.subscription_plan}</span>
                    <a href="/subscription" className="text-xs text-blue-700 font-semibold hover:underline ml-auto">Gestionează →</a>
                </div>
            </div>
            <button className="rounded-2xl bg-slate-900 px-6 py-3 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                Salvează
            </button>
        </div>
    );
}

function NotificationsTab() {
    const [notifs, setNotifs] = useState({
        new_deals:          true,
        subscription_end:   true,
        ai_valuation_change:false,
        calendar_reminders: true,
        email_notifications:true,
    });

    const labels = {
        new_deals:           'Tranzacții noi',
        subscription_end:    'Expirare abonament',
        ai_valuation_change: 'Modificare evaluare AI',
        calendar_reminders:  'Remindere calendar',
        email_notifications: 'Notificări pe email',
    };

    return (
        <div className="max-w-lg">
            <p className="text-sm text-slate-500 mb-6">Configurează tipurile de notificări pe care le primești.</p>
            <div className="rounded-3xl bg-white border border-slate-100 divide-y divide-slate-100 px-5">
                {Object.entries(labels).map(([key, label]) => (
                    <Toggle
                        key={key}
                        label={label}
                        checked={notifs[key]}
                        onChange={v => setNotifs(prev => ({ ...prev, [key]: v }))}
                    />
                ))}
            </div>
            <button className="mt-5 rounded-2xl bg-slate-900 px-6 py-3 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                Salvează preferințele
            </button>
        </div>
    );
}

function SecurityTab() {
    const { data, setData, post, processing } = useForm({ current_password: '', password: '', password_confirmation: '' });

    return (
        <div className="space-y-8 max-w-lg">
            <div>
                <h3 className="font-bold text-slate-900 mb-4">Schimbă parola</h3>
                <div className="space-y-4">
                    {[
                        { key: 'current_password',      label: 'Parola curentă' },
                        { key: 'password',              label: 'Parola nouă' },
                        { key: 'password_confirmation', label: 'Confirmă parola nouă' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                            <input
                                type="password"
                                value={data[f.key]}
                                onChange={e => setData(f.key, e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700"
                            />
                        </div>
                    ))}
                    <button
                        onClick={() => post('/user/password')}
                        disabled={processing}
                        className="rounded-2xl bg-slate-900 px-6 py-3 text-white text-sm font-bold disabled:opacity-50"
                    >
                        Actualizează parola
                    </button>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-slate-900 mb-2">Autentificare în doi factori</h3>
                <p className="text-sm text-slate-500 mb-4">Adaugă un nivel extra de securitate contului tău.</p>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    ⚠ 2FA prin email sau SMS — disponibil în versiunea viitoare.
                </div>
            </div>

            <div>
                <h3 className="font-bold text-slate-900 mb-2">Sesiuni active</h3>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">Sesiunea curentă</span>
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">Activă</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IntegrationsTab() {
    return (
        <div className="space-y-5 max-w-lg">
            {[
                { icon: '📅', title: 'Google Calendar', desc: 'Sincronizare bidirecțională cu Google Calendar', action: 'Conectează' },
                { icon: '📘', title: 'Facebook / Instagram', desc: 'Autopostare automată pe rețelele sociale', action: 'Conectează' },
                { icon: '🤖', title: 'Anthropic Claude API', desc: 'Cheie API pentru generare descrieri și evaluare AI', action: 'Configurează' },
            ].map(item => (
                <div key={item.title} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">{item.icon}</div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                        </div>
                    </div>
                    <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                        {item.action}
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function Index({ user, agency }) {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const [activeTab, setActiveTab] = useState(urlParams.get('tab') ?? 'profile');
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.roles?.some(r => r.name === 'admin');

    const visibleTabs = tabs.filter(t => {
        if (t.key === 'agency' || t.key === 'users' || t.key === 'integrations') return isAdmin;
        return true;
    });

    return (
        <AppLayout title="Setări">
            <Head title="Setări" />
            <div className="flex gap-6 items-start">
                {/* Tab sidebar */}
                <div className="w-48 shrink-0 rounded-4xl bg-white border border-slate-100 shadow-xl p-3 sticky top-28 self-start">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors text-left ${
                                activeTab === tab.key
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 rounded-4xl bg-white border border-slate-100 shadow-xl p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        {visibleTabs.find(t => t.key === activeTab)?.icon}{' '}
                        {visibleTabs.find(t => t.key === activeTab)?.label}
                    </h2>
                    {activeTab === 'profile'       && <ProfileTab user={user} />}
                    {activeTab === 'agency'        && <AgencyTab agency={agency} />}
                    {activeTab === 'users'         && (
                        <div className="text-sm text-slate-500 py-8 text-center">
                            Gestionarea utilizatorilor — în curând.
                        </div>
                    )}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'security'      && <SecurityTab />}
                    {activeTab === 'integrations'  && <IntegrationsTab />}
                </div>
            </div>
        </AppLayout>
    );
}
