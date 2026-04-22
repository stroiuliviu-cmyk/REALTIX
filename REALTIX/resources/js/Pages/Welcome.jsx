import { Head, Link } from '@inertiajs/react';

const features = [
    { title: 'Sistem CRM', desc: 'Gestionează clienții și tranzacțiile într-un singur loc.', icon: '👥' },
    { title: 'Agregator Anunțuri', desc: 'Colectare automată de pe 999.md, imobiliare.md și altele.', icon: '🔍' },
    { title: 'Asistent AI', desc: 'Generare automată de descrieri și evaluare inteligentă a proprietăților.', icon: '🤖' },
    { title: 'Contracte PDF', desc: 'Generare automată a contractelor și documentelor necesare.', icon: '📄' },
];

const targetAudience = [
    { role: 'Agenții Imobiliare', desc: 'Automatizarea proceselor și managementul echipei.' },
    { role: 'Agenți Independenți', desc: 'Gestionarea eficientă a portofoliului de clienți.' },
    { role: 'Investitori', desc: 'Analiza pieței și a activelor în timp real.' },
    { role: 'Cumpărători / Chiriași', desc: 'Acces la anunțuri verificate direct de la proprietari.' },
];

const pricing = [
    {
        name: 'Starter', price: '12€', users: '1 agent',
        features: ['CRM de bază', 'Asistent AI limitat', 'Suport email'],
        popular: false,
    },
    {
        name: 'Medium', price: '49€', users: '2–5 agenți',
        features: ['CRM avansat', 'Agregator anunțuri', 'Generare PDF', 'Suport prioritar'],
        popular: true,
    },
    {
        name: 'Pro', price: '89€', users: 'Nelimitat agenți',
        features: ['Toate funcțiile Medium', 'White-label / branding', 'API & Integrări personalizate', 'Manager dedicat'],
        popular: false,
    },
];

const mont = { fontFamily: "'Montserrat', sans-serif" };

export default function Welcome() {
    return (
        <>
            <Head title="REALTIX — Găsește, evaluează, vinde – ușor.">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50 text-slate-900">

                {/* Header */}
                <header className="fixed top-0 w-full z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                        <div style={mont} className="text-3xl font-bold text-[#1E3A8A] tracking-widest">
                            REALTIX
                        </div>

                        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                            <a href="#functionalitati" className="hover:text-[#1E3A8A] transition-colors">Funcționalități</a>
                            <a href="#audienta" className="hover:text-[#1E3A8A] transition-colors">Pentru Cine</a>
                            <a href="#preturi" className="hover:text-[#1E3A8A] transition-colors">Prețuri</a>
                        </nav>

                        <div className="flex gap-4 items-center">
                            <Link
                                href={route('login')}
                                className="hidden sm:block text-sm font-semibold text-[#1E3A8A] hover:text-blue-900 transition-colors"
                            >
                                Autentificare
                            </Link>
                            <Link
                                href={route('register')}
                                className="rounded-full bg-[#1E3A8A] hover:bg-blue-900 transition-colors px-6 py-2.5 text-white text-sm font-semibold shadow-lg"
                            >
                                Încearcă Gratuit
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Hero */}
                <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                    <div className="mx-auto max-w-7xl px-6 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-[#1E3A8A] mb-8">
                            <span className="flex h-2 w-2 rounded-full bg-[#22C55E]" />
                            SaaS PropTech pregătit de scalare în Moldova
                        </div>

                        <h1 style={mont} className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-slate-900 sm:text-7xl">
                            Găsește, evaluează, vinde –{' '}
                            <span className="text-[#1E3A8A]">ușor.</span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                            REALTIX combină funcțiile unui sistem CRM, agregator de căutare și asistent AI
                            pentru a face lucrul cu imobiliarele simplu, inteligent și transparent.
                        </p>

                        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                href={route('register')}
                                className="rounded-full bg-[#1E3A8A] px-8 py-4 text-base font-semibold text-white shadow-xl hover:bg-blue-900 transition-all"
                            >
                                Creează cont de agent
                            </Link>
                            <Link
                                href={route('login')}
                                className="rounded-full bg-white border border-slate-200 px-8 py-4 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition-all inline-flex items-center justify-center"
                            >
                                Autentifică-te
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section id="functionalitati" className="py-20 bg-white">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16">
                            <h2 style={mont} className="text-3xl font-bold text-slate-900">
                                Instrumentele viitorului imobiliar
                            </h2>
                            <p className="mt-4 text-slate-600">
                                Automatizează tranzacțiile și folosește inteligența artificială.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {features.map((feat, idx) => (
                                <div key={idx} className="rounded-4xl bg-slate-50 p-8 border border-slate-100 hover:shadow-xl transition-shadow">
                                    <div className="text-4xl mb-4">{feat.icon}</div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{feat.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Target Audience */}
                <section id="audienta" className="py-20 bg-linear-to-br from-[#1E3A8A] to-blue-900 text-white">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 style={mont} className="text-3xl md:text-4xl font-bold mb-6">
                                    Un ecosistem complet pentru toți actorii pieței
                                </h2>
                                <p className="text-blue-200 text-lg mb-8 leading-relaxed">
                                    Fie că ești o agenție mare cu zeci de angajați sau un cumpărător în căutarea
                                    locuinței perfecte, REALTIX filtrează, organizează și automatizează informația
                                    pentru tine.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3">
                                        <span className="text-[#22C55E]">✓</span> Filtru „doar de la proprietari"
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-[#22C55E]">✓</span> Multilingv (RO / RU / EN)
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-[#22C55E]">✓</span> Aplicație mobilă integrată
                                    </li>
                                </ul>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {targetAudience.map((item, idx) => (
                                    <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl">
                                        <h4 className="font-bold text-lg mb-2">{item.role}</h4>
                                        <p className="text-sm text-blue-100">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section id="preturi" className="py-24 bg-slate-50">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16">
                            <h2 style={mont} className="text-3xl font-bold text-slate-900">
                                Abonamente transparente
                            </h2>
                            <p className="mt-4 text-slate-600">
                                Alege planul potrivit pentru volumul tău de muncă.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {pricing.map((plan, idx) => (
                                <div
                                    key={idx}
                                    className={`relative rounded-4xl p-8 border ${
                                        plan.popular
                                            ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xl scale-105'
                                            : 'bg-white text-slate-900 border-slate-200 shadow-lg'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#22C55E] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                            Cel mai ales
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="mb-6">
                                        <span style={mont} className="text-4xl font-bold">{plan.price}</span>
                                        <span className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}> / lună</span>
                                    </div>
                                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-8 ${plan.popular ? 'bg-white/20' : 'bg-slate-100'}`}>
                                        {plan.users}
                                    </div>
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm">
                                                <span className={plan.popular ? 'text-[#22C55E]' : 'text-[#1E3A8A]'}>✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={route('register')}
                                        className={`block w-full py-3 rounded-2xl font-semibold text-center transition-colors ${
                                            plan.popular
                                                ? 'bg-[#22C55E] text-white hover:bg-green-600'
                                                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                        }`}
                                    >
                                        Alege {plan.name}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-slate-900 text-slate-400 py-12 text-sm">
                    <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div style={mont} className="text-2xl font-bold text-white tracking-widest">REALTIX</div>
                        <p>© {new Date().getFullYear()} REALTIX. Toate drepturile rezervate.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white transition-colors">Termeni și Condiții</a>
                            <a href="#" className="hover:text-white transition-colors">Confidențialitate</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
