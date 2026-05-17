import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen">
            {/* Left brand panel */}
            <div className="hidden lg:flex lg:w-5/12 bg-linear-to-br from-blue-950 via-blue-900 to-blue-800 flex-col justify-between p-12 relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <Link href="/">
                        <span className="text-3xl font-bold text-white tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>REALTIX</span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white leading-snug">
                            Platforma imobiliară<br />
                            <span className="text-blue-300">pentru profesioniști</span>
                        </h1>
                        <p className="text-blue-200 text-lg leading-relaxed">
                            Gestionează proprietăți, clienți și tranzacții dintr-un singur loc.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {[
                            'Administrare completă a portofoliului',
                            'CRM integrat pentru clienți',
                            'Statistici și rapoarte în timp real',
                        ].map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center shrink-0">
                                    <svg className="w-3 h-3 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-blue-100 text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-blue-400 text-sm">
                    © {new Date().getFullYear()} REALTIX. Toate drepturile rezervate.
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-gray-50">
                {/* Mobile logo */}
                <div className="lg:hidden mb-8">
                    <Link href="/">
                        <span className="text-2xl font-bold text-blue-700 tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>REALTIX</span>
                    </Link>
                </div>

                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
