import { Head, Link } from '@inertiajs/react';

const mont = { fontFamily: "'Montserrat', sans-serif" };

function Section({ id, title, children }) {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 mt-10" style={mont}>{title}</h2>
            <div className="space-y-3 text-slate-700 leading-relaxed">{children}</div>
        </section>
    );
}

function Sub({ title, children }) {
    return (
        <div className="mt-5">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
            <div className="space-y-2 text-slate-700">{children}</div>
        </div>
    );
}

function Info({ children }) {
    return (
        <div className="my-4 rounded-2xl bg-blue-50 border border-blue-100 px-5 py-3 text-sm text-blue-900">
            <strong>ℹ </strong>{children}
        </div>
    );
}

function List({ items }) {
    return (
        <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
            {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
    );
}

export default function Privacy() {
    return (
        <>
            <Head title="Politica de Confidențialitate — REALTIX">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
                        <Link href="/" style={mont} className="text-2xl font-bold text-[#1E3A8A] tracking-widest">REALTIX</Link>
                        <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-700">← Înapoi la pagina principală</Link>
                    </div>
                </header>

                <main className="mx-auto max-w-3xl px-6 py-12">
                    <div className="mb-10">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">REALTIX — Platforma CRM Imobiliar</p>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3" style={mont}>Politica de Confidențialitate</h1>
                        <p className="text-sm text-slate-500">Versiunea 1.0 · În vigoare din 9 mai 2026</p>
                    </div>

                    <Section id="introducere" title="Introducere">
                        <p>Prezenta Politică de Confidențialitate descrie modul în care <strong>BRR GRUP Ltd.</strong> (denumită în continuare „Compania", „Noi" sau „Operatorul") colectează, utilizează, stochează, transferă și protejează datele cu caracter personal ale utilizatorilor platformei REALTIX, inclusiv aplicația mobilă (Android și iOS), platforma web și toate serviciile conexe.</p>
                        <p className="font-semibold pt-2">Această Politică a fost elaborată în conformitate cu:</p>
                        <List items={[
                            'Regulamentul General privind Protecția Datelor (GDPR — Regulamentul UE 2016/679)',
                            'Legea Republicii Bulgaria privind protecția datelor cu caracter personal',
                            'Legea Republicii Moldova nr. 133/2011',
                            'Legea Republicii Moldova nr. 195/2024 (armonizare UE)',
                            'Google Play Developer Policy și Apple App Store Review Guidelines',
                        ]} />
                        <Info>Dacă nu sunteți de acord cu această Politică, vă rugăm să nu utilizați Serviciul. Ne puteți contacta oricând la <a href="mailto:privacy@realtix.app" className="text-blue-700 hover:underline">privacy@realtix.app</a>.</Info>
                    </Section>

                    <Section id="1" title="1. Datele Operatorului">
                        <List items={[
                            'Denumire juridică: BRR GRUP Ltd.',
                            'Cod de înregistrare (EIK/UIC): 207691210',
                            'Adresa juridică: Sartsevo, Tvartitsa, Sliven region, 8896, Bulgaria',
                            'Email pentru protecția datelor: privacy@realtix.app',
                            'Website: www.realtix.eu',
                        ]} />
                    </Section>

                    <Section id="2" title="2. Termeni și definiții">
                        <List items={[
                            'Date cu caracter personal: orice informație care vă identifică direct (nume, email) sau indirect (adresă IP, identificator de dispozitiv)',
                            'Prelucrare: orice operațiune efectuată asupra datelor (colectare, stocare, modificare, transmitere, ștergere etc.)',
                            'Utilizator: persoana fizică sau reprezentantul legal al persoanei juridice care folosește Serviciul',
                            'Operator: BRR GRUP Ltd. — entitatea care stabilește scopurile și mijloacele prelucrării',
                            'Procesator: orice partener extern care prelucrează date personale în numele nostru (furnizori cloud, procesatori de plăți)',
                            'Cookies: fișiere mici stocate pe dispozitivul dvs., folosite pentru funcționarea și îmbunătățirea Serviciului',
                        ]} />
                    </Section>

                    <Section id="3" title="3. Principiile noastre privind prelucrarea datelor">
                        <p>Ne angajăm să respectăm permanent următoarele principii conform Art. 5 GDPR:</p>
                        <List items={[
                            'Legalitate: colectăm date doar când avem un motiv legal clar și justificat',
                            'Transparență: vă informăm clar despre ce date colectăm și de ce',
                            'Echitate: prelucrăm datele fără scopuri ascunse',
                            'Limitarea scopului: datele sunt folosite exclusiv pentru scopurile declarate',
                            'Minimizarea datelor: colectăm doar datele strict necesare',
                            'Exactitate: menținem datele actualizate și corecte',
                            'Limitarea stocării: păstrăm datele doar atât timp cât este necesar',
                            'Integritate și confidențialitate: aplicăm măsuri tehnice și organizatorice de protecție',
                            'Responsabilitate: suntem responsabili pentru toate operațiunile de prelucrare',
                        ]} />
                    </Section>

                    <Section id="4" title="4. Ce date colectăm și de ce">
                        <Sub title="4.1 Date pe care ni le furnizați direct">
                            <p>Când vă creați un cont sau utilizați Serviciul, ne puteți furniza:</p>
                            <List items={[
                                'Numele și prenumele (pentru identificare în platformă)',
                                'Adresa de email (pentru autentificare și comunicări despre cont)',
                                'Numărul de telefon (pentru funcționalitățile CRM și verificare)',
                                'Denumirea companiei sau agenției imobiliare',
                                'Adrese și locații ale proprietăților gestionate',
                                'Fotografii ale proprietăților sau documente încărcate',
                                'Informații despre clienți, contacte și istoricul comunicărilor',
                                'Note interne, sarcini, întâlniri și evenimente din calendar',
                                'Datele de autentificare (email + parolă criptată)',
                            ]} />
                        </Sub>
                        <Sub title="4.2 Date colectate automat">
                            <p>Sistemele noastre colectează automat anumite date tehnice necesare pentru funcționarea și securitatea platformei:</p>
                            <List items={[
                                'Adresa IP și locația aproximativă (țară/oraș)',
                                'Tipul dispozitivului, sistemul de operare și browserul',
                                'Identificatori tehnici unici ai dispozitivului',
                                'Jurnalul de activitate: pagini accesate, dată/oră, durata sesiunilor',
                                'Statistici de utilizare a funcționalităților platformei',
                            ]} />
                            <p>Aceste date ne ajută să identificăm probleme tehnice, să îmbunătățim performanța și să detectăm accesuri neautorizate.</p>
                        </Sub>
                        <Sub title="4.3 Date privind plățile">
                            <p>Plățile sunt procesate exclusiv prin furnizori de plăți securizați (în prezent: <strong>Stripe Inc.</strong>). Compania noastră NU stochează niciodată datele complete ale cardurilor bancare pe serverele proprii. Stocăm doar:</p>
                            <List items={[
                                'Numele titularului cardului',
                                'Ultimele 4 cifre ale cardului (pentru identificare în istoric)',
                                'Istoricul tranzacțiilor, țara și statutul plăților',
                            ]} />
                            <p>Stripe operează conform standardului PCI DSS. Politica de confidențialitate Stripe: <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-blue-700 hover:underline">stripe.com/privacy</a>.</p>
                        </Sub>
                        <Sub title="4.4 Acces la contacte și jurnalul de apeluri (doar aplicația mobilă)">
                            <p>Aplicația mobilă REALTIX poate solicita acces la anumite resurse ale dispozitivului. Aceste permisiuni sunt OPȚIONALE și vă vor fi solicitate explicit:</p>
                            <List items={[
                                'Contacte: pentru importul contactelor din telefon direct în CRM',
                                'Jurnal apeluri (Call Log): pentru afișarea istoricului apelurilor cu clienții',
                                'Istoricul comunicărilor: pentru statistici privind comunicările',
                            ]} />
                            <Info>IMPORTANT: Aceste date sunt folosite EXCLUSIV pentru funcționalitățile CRM. Nu sunt vândute, nu sunt transmise terților în scopuri publicitare. Puteți retrage oricând permisiunile din Setări → Aplicații, fără a pierde accesul la celelalte funcții.</Info>
                        </Sub>
                    </Section>

                    <Section id="5" title="5. De ce avem dreptul legal să prelucrăm datele dvs.">
                        <p>Conform GDPR (Art. 6), orice prelucrare de date personale necesită un temei legal:</p>
                        <List items={[
                            'Consimțământul dvs. (Art. 6(1)(a)): pentru comunicări de marketing, activarea permisiunilor opționale (contacte, apeluri) și utilizarea cookies ne-esențiale',
                            'Executarea contractului (Art. 6(1)(b)): pentru crearea și administrarea contului, furnizarea serviciilor CRM, procesarea plăților și suport tehnic',
                            'Obligații legale (Art. 6(1)(c)): pentru păstrarea datelor de facturare conform legislației fiscale bulgare (5 ani) sau la solicitarea autorităților',
                            'Interesul nostru legitim (Art. 6(1)(f)): pentru îmbunătățirea produsului, detectarea fraudelor, securitatea platformei și analiză statistică anonimizată',
                        ]} />
                        <p>Vă puteți opune prelucrărilor bazate pe interesul legitim sau vă puteți retrage consimțământul oricând, fără a afecta legalitatea prelucrărilor anterioare.</p>
                    </Section>

                    <Section id="6" title="6. Pentru ce folosim datele dvs.">
                        <List items={[
                            'Crearea, verificarea și administrarea contului',
                            'Furnizarea tuturor funcționalităților CRM imobiliar',
                            'Gestionarea proprietăților, contactelor și clienților',
                            'Sincronizarea apelurilor și afișarea istoricului de comunicare',
                            'Organizarea sarcinilor, întâlnirilor și calendarului',
                            'Suport tehnic și soluționarea problemelor raportate',
                            'Îmbunătățirea continuă a produsului pe baza statisticilor',
                            'Securitatea platformei și detectarea accesurilor neautorizate',
                            'Facturare, procesare plăți și gestionarea abonamentelor',
                            'Notificări importante despre cont (expirare abonament, modificări)',
                            'Comunicări de marketing și oferte promoționale (doar cu consimțământ)',
                            'Respectarea obligațiilor legale aplicabile',
                        ]} />
                    </Section>

                    <Section id="7" title="7. Abonamente și plăți">
                        <Sub title="7.1 Tipuri de abonamente">
                            <p>Oferim planuri tarifare lunare și anuale, detaliate pe website. Funcționalitățile disponibile diferă în funcție de planul ales.</p>
                        </Sub>
                        <Sub title="7.2 Reînnoire automată">
                            <p>Abonamentele se reînnoiesc automat. Veți fi notificat prin email cu cel puțin 7 zile înainte de reînnoire. Puteți anula oricând din secțiunea Abonament din setările contului.</p>
                        </Sub>
                        <Sub title="7.3 Procesarea plăților">
                            <p>Plățile sunt procesate prin Stripe Inc., certificat PCI DSS. Nu stocăm date complete ale cardurilor bancare pe serverele noastre.</p>
                        </Sub>
                        <Sub title="7.4 Suspendarea accesului">
                            <p>În cazul neplății abonamentului, ne rezervăm dreptul de a suspenda temporar accesul. Datele rămân stocate în siguranță timp de 90 de zile după expirare, perioadă în care puteți reactiva contul.</p>
                        </Sub>
                    </Section>

                    <Section id="8" title="8. Comunicări de marketing">
                        <p>Cu acordul dvs. prealabil, vă putem transmite:</p>
                        <List items={[
                            'Email-uri informative despre noi funcționalități',
                            'Oferte promoționale și reduceri la abonamente',
                            'Actualizări importante despre produs',
                            'Notificări push (doar dacă ați activat pe dispozitiv)',
                        ]} />
                        <p>Vă puteți dezabona oricând prin link-ul „Dezabonare" din orice email primit, prin setările contului sau contactând <a href="mailto:privacy@realtix.app" className="text-blue-700 hover:underline">privacy@realtix.app</a>.</p>
                        <p>Dezabonarea de la marketing nu afectează notificările esențiale despre cont (confirmare plată, alertă de securitate).</p>
                    </Section>

                    <Section id="9" title="9. Cookies și tehnologii similare">
                        <List items={[
                            'Cookies esențiale: necesare pentru autentificare, securitate și funcționarea de bază — nu pot fi dezactivate',
                            'Cookies analitice: ne ajută să înțelegem cum este utilizată platforma (pagini vizitate, timp petrecut, erori). Folosim instrumente analitice cu date anonimizate',
                            'Cookies de preferințe: salvează preferințele dvs. (limbă, aspect) pentru o experiență mai bună',
                        ]} />
                        <p>La prima vizită, vi se va afișa un banner de consimțământ pentru cookies. Puteți gestiona preferințele din setările browserului sau din panoul de cookies al platformei. Dezactivarea cookies esențiale poate afecta funcționarea Serviciului.</p>
                    </Section>

                    <Section id="10" title="10. Transmiterea datelor către terți">
                        <p>Datele dvs. personale <strong>NU sunt vândute niciodată</strong>. Pot fi transmise exclusiv către:</p>
                        <List items={[
                            'Furnizori de infrastructură: hosting și cloud (AWS, Google Cloud) pe baza unor acorduri de procesare conforme GDPR',
                            'Procesatori de plăți: Stripe Inc. pentru procesarea plăților',
                            'Servicii analitice: instrumente de analiză anonimizată a traficului (Google Analytics cu IP anonimizat)',
                            'Furnizori IT: servicii tehnice (email tranzacțional, suport) legați prin acorduri de confidențialitate',
                            'Autorități competente: exclusiv în baza unor obligații legale sau hotărâri judecătorești',
                        ]} />
                    </Section>

                    <Section id="11" title="11. Transferuri internaționale de date">
                        <p>Datele dvs. pot fi stocate și prelucrate pe servere situate în Spațiul Economic European (SEE) sau, în anumite situații, în țări terțe care oferă garanții adecvate de protecție.</p>
                        <p>În cazul transferurilor în afara SEE, aplicăm:</p>
                        <List items={[
                            'Clauze Contractuale Standard aprobate de Comisia Europeană (Art. 46(2)(c) GDPR)',
                            'Criptare end-to-end a datelor transferate',
                            'Verificarea conformității partenerilor înainte de orice transfer',
                            'Acorduri de procesare a datelor cu fiecare partener extern',
                        ]} />
                        <p>Puteți solicita detalii despre transferurile internaționale la <a href="mailto:privacy@realtix.app" className="text-blue-700 hover:underline">privacy@realtix.app</a>.</p>
                    </Section>

                    <Section id="12" title="12. Securitatea datelor dvs.">
                        <p>Aplicăm măsuri tehnice și organizatorice conforme cu standardele industriei:</p>
                        <List items={[
                            'Criptare SSL/TLS pentru toate transmisiile de date',
                            'Parole criptate prin algoritmi moderni (bcrypt/Argon2)',
                            'Autentificare cu doi factori (2FA) disponibilă pentru conturi',
                            'Control strict al accesului: angajații au acces doar la datele necesare rolului lor',
                            'Monitorizare continuă și detectarea activităților suspecte',
                            'Backup periodic al datelor pe servere securizate',
                            'Teste periodice de securitate și evaluări ale vulnerabilităților',
                        ]} />
                        <p>În cazul unui incident de securitate care vă afectează datele, vă vom notifica în cel mult <strong>72 de ore</strong> de la descoperire, conform Art. 33-34 GDPR.</p>
                        <Info>Niciun sistem informatic nu poate garanta securitate absolută. Vă recomandăm să utilizați parole puternice și să activați autentificarea cu doi factori.</Info>
                    </Section>

                    <Section id="13" title="13. Cât timp păstrăm datele dvs.">
                        <List items={[
                            'Date de cont și CRM: pe toată durata existenței contului activ + 90 de zile după ștergere',
                            'Date de facturare și plăți: 5 ani de la data facturii (obligație fiscală bulgară)',
                            'Jurnalul tehnic (loguri de server): maximum 90 de zile identificabile, apoi anonimizate sau șterse',
                            'Date colectate pe bază de consimțământ: pe durata valabilității; la retragere, ștergem în 30 de zile',
                            'Date păstrate din obligații legale: conform termenelor legale aplicabile',
                        ]} />
                        <p>La expirarea perioadei de stocare, datele sunt șterse irevocabil sau anonimizate.</p>
                    </Section>

                    <Section id="14" title="14. Drepturile dvs. privind datele personale">
                        <p>Conform GDPR (Art. 15-22), beneficiați de următoarele drepturi. Toate solicitările sunt gratuite și vor fi soluționate în termen de 30 de zile (cu posibilă prelungire de până la 60 de zile în cazuri complexe):</p>
                        <List items={[
                            'Dreptul de acces (Art. 15): copie a datelor pe care le deținem despre dvs.',
                            'Dreptul la rectificare (Art. 16): corectarea datelor incorecte sau incomplete',
                            'Dreptul la ștergere — „dreptul de a fi uitat" (Art. 17): ștergerea datelor când nu mai sunt necesare',
                            'Dreptul la restricționarea prelucrării (Art. 18): limitarea temporară a prelucrării',
                            'Dreptul de opoziție (Art. 21): opoziție față de prelucrarea bazată pe interesul nostru legitim',
                            'Dreptul la portabilitatea datelor (Art. 20): primirea datelor într-un format structurat (JSON/CSV)',
                            'Dreptul de a retrage consimțământul (Art. 7(3)) oricând, fără efect retroactiv',
                            'Dreptul de a depune o plângere (Art. 77) la autoritatea de supraveghere',
                        ]} />
                        <p>Pentru a vă exercita oricare dintre drepturi, contactați-ne la <a href="mailto:privacy@realtix.app" className="text-blue-700 hover:underline">privacy@realtix.app</a>. Vă vom solicita să vă verificați identitatea înainte de a procesa cererea.</p>

                        <Sub title="Autoritatea de supraveghere competentă (Bulgaria)">
                            <List items={[
                                'Comisia pentru Protecția Datelor cu Caracter Personal (KZLD / CPDP)',
                                'Adresa: bul. Prof. Tsvetan Lazarov nr. 2, 1592 Sofia, Bulgaria',
                                'Website: www.cpdp.bg',
                                'Email: kzld@cpdp.bg',
                            ]} />
                        </Sub>
                    </Section>

                    <Section id="15" title="15. Ștergerea contului și a datelor">
                        <p>Puteți solicita ștergerea contului dvs. și a datelor asociate oricând prin:</p>
                        <List items={[
                            'Secțiunea Setări Cont → Șterge contul din aplicație sau platforma web',
                            'Email la privacy@realtix.app cu subiectul „Solicitare ștergere cont"',
                            'Solicitare scrisă la adresa juridică a companiei',
                        ]} />
                        <p>După primirea solicitării, vom confirma recepția în 5 zile lucrătoare și vom finaliza ștergerea în 30 de zile.</p>
                        <p className="font-semibold pt-2">Excepții — anumite date pot fi reținute după ștergere:</p>
                        <List items={[
                            'Date de facturare: 5 ani, conform legislației fiscale (Art. 6(1)(c) GDPR)',
                            'Date necesare soluționării unui litigiu în curs',
                            'Date solicitate de autorități în baza unor obligații legale',
                        ]} />
                        <p>Toate datele reținute prin excepție sunt izolate și nu sunt folosite pentru niciun alt scop.</p>
                    </Section>

                    <Section id="16" title="16. Decizii automate și profilare">
                        <p>REALTIX nu ia decizii automate cu efect juridic sau semnificativ similar asupra dvs. (conform Art. 22 GDPR). Platforma poate utiliza algoritmi pentru a personaliza interfața sau a sugera acțiuni în CRM (ex: sortarea automată a contactelor), dar acestea nu produc efecte legale și pot fi ignorate sau modificate manual oricând.</p>
                    </Section>

                    <Section id="17" title="17. Persoane minore">
                        <p>Serviciul REALTIX este destinat exclusiv profesioniștilor adulți din domeniul imobiliar și nu este adresat persoanelor sub 18 ani. Nu colectăm în mod intenționat date cu caracter personal ale minorilor. Dacă suspectați că un minor ne-a furnizat date personale, vă rugăm să ne contactați la <a href="mailto:privacy@realtix.app" className="text-blue-700 hover:underline">privacy@realtix.app</a>, iar noi vom șterge acele date imediat.</p>
                    </Section>

                    <Section id="18" title="18. Modificarea prezentei Politici">
                        <p>Ne rezervăm dreptul de a actualiza această Politică pentru a reflecta modificări ale serviciilor, legislației sau practicilor de prelucrare a datelor.</p>
                        <p>În cazul modificărilor semnificative:</p>
                        <List items={[
                            'Vă vom notifica prin email cu cel puțin 30 de zile înainte de intrarea în vigoare',
                            'Vom afișa un anunț vizibil în platformă',
                            'Pentru modificările care afectează drepturile fundamentale, vom solicita consimțământul dvs. activ',
                        ]} />
                        <p>Versiunea actualizată va fi întotdeauna disponibilă pe website și în secțiunea „Despre" a aplicației, cu data ultimei modificări indicată clar.</p>
                    </Section>

                    <Section id="19" title="19. Contact și Responsabilul cu Protecția Datelor">
                        <List items={[
                            'Email protecția datelor: privacy@realtix.app',
                            'Email suport general: support@realtix.app',
                            'Website: www.realtix.eu',
                            'Adresă poștală: Sartsevo, regiune Sliven, Bulgaria',
                            'Telefon: +359 884 898 930',
                        ]} />
                        <p>Ne angajăm să răspundem în termen de 5 zile lucrătoare. Dacă va fi necesară numirea unui Responsabil cu Protecția Datelor (DPO), datele acestuia vor fi publicate pe website și comunicate Autorității de Supraveghere.</p>
                    </Section>

                    <div className="mt-16 pt-8 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-400">© 2026 BRR GRUP Ltd. · Toate drepturile rezervate · Versiunea 1.0 · 09.05.2026</p>
                        <p className="mt-2 text-sm"><Link href="/terms" className="text-blue-700 hover:underline">Termeni și Condiții</Link></p>
                    </div>
                </main>
            </div>
        </>
    );
}
