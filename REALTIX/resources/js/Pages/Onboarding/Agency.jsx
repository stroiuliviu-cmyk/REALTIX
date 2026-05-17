import { useForm, Head, router } from '@inertiajs/react';

export default function OnboardingAgency({ agency }) {
    const { data, setData, post, processing, errors } = useForm({
        name:          agency?.name ?? '',
        address:       agency?.address ?? '',
        contact_phone: agency?.contact_phone ?? '',
        idno:          agency?.idno ?? '',
        director_name: agency?.director_name ?? '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('onboarding.agency.save'));
    };

    const handleLogout = () => router.post(route('logout'));

    const fields = [
        { key: 'name',          label: 'Numele agenției',     placeholder: 'ex. Imobiliare Plus SRL', autoFocus: true },
        { key: 'address',       label: 'Adresa juridică',     placeholder: 'str. Ștefan cel Mare 1, Chișinău' },
        { key: 'contact_phone', label: 'Telefon de contact',  placeholder: '+373 60 000 000', type: 'tel' },
        { key: 'idno',          label: 'IDNO (cod fiscal)',   placeholder: '1234567890123', help: '13 cifre — necesar pentru contracte oficiale' },
        { key: 'director_name', label: 'Numele directorului', placeholder: 'Ion Popescu', help: 'Apare în contractele PDF auto-generate' },
    ];

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-100 via-white to-blue-50 py-12 px-4">
            <Head title="Profil agenție" />

            <button
                onClick={handleLogout}
                className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-700 font-medium"
            >
                Deconectare
            </button>

            <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Pasul 4 din 7 — profil agenție
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Datele agenției tale
                    </h1>
                    <p className="text-slate-600 text-base max-w-lg mx-auto">
                        Folosim aceste date pentru contracte PDF, facturi Stripe și informații publice.
                        Le poți modifica oricând din Setări → Agenție.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-5">
                    {fields.map((f) => (
                        <div key={f.key}>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                {f.label} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type={f.type ?? 'text'}
                                value={data[f.key]}
                                onChange={(e) => setData(f.key, e.target.value)}
                                placeholder={f.placeholder}
                                autoFocus={f.autoFocus}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-colors"
                            />
                            {f.help && !errors[f.key] && (
                                <p className="mt-1 text-xs text-slate-400">{f.help}</p>
                            )}
                            {errors[f.key] && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors[f.key]}</p>
                            )}
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full mt-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors py-3 text-sm font-bold text-white"
                    >
                        {processing ? 'Se salvează…' : 'Continuă spre alegerea planului →'}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                    Toate câmpurile sunt obligatorii. Fără ele nu putem genera contracte legale și facturi corecte.
                </p>
            </div>
        </div>
    );
}
