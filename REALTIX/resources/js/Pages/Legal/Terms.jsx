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

export default function Terms() {
    return (
        <>
            <Head title="Termeni și Condiții — REALTIX">
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
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3" style={mont}>Termeni și Condiții de Utilizare</h1>
                        <p className="text-sm text-slate-500">Versiunea 1.0 · În vigoare din 10 mai 2026</p>
                    </div>

                    <Section id="introducere" title="Introducere">
                        <p>Prezenții Termeni și Condiții de Utilizare (denumiți în continuare „Termenii") reglementează accesul și utilizarea platformei software REALTIX, inclusiv aplicația mobilă (Android și iOS), platforma web și toate serviciile conexe (denumite colectiv „Serviciul" sau „Platforma").</p>
                        <p>Serviciul este furnizat de <strong>BRR GRUP Ltd.</strong>, societate comercială înregistrată în Republica Bulgaria (denumită în continuare „Compania", „Noi" sau „Furnizorul"). Deși Compania este înregistrată în Bulgaria, Serviciul este disponibil utilizatorilor din Republica Moldova; prezenții Termeni sunt redactați în conformitate atât cu legislația bulgară și dreptul UE, cât și cu legislația Republicii Moldova.</p>
                        <p>Prin accesarea, instalarea, înregistrarea sau utilizarea Serviciului în orice mod, Utilizatorul declară că a citit, înțeles și acceptat în totalitate prezenții Termeni. Dacă nu sunteți de acord cu oricare dintre prevederi, vă rugăm să nu utilizați Serviciul.</p>
                        <p className="font-semibold pt-2">Legislația aplicabilă include:</p>
                        <List items={[
                            'Codul Civil al Republicii Bulgaria',
                            'Legea bulgară nr. 361/2006 privind comerțul electronic',
                            'Regulamentul UE 2016/679 (GDPR)',
                            'Codul Civil al Republicii Moldova (Legea nr. 1107/2002)',
                            'Legea RM nr. 284/2004 privind comerțul electronic',
                            'Legea RM nr. 133/2011 privind protecția datelor cu caracter personal',
                            'Legea RM nr. 105/2003 privind protecția consumatorilor',
                            'Legea RM nr. 39/1993 privind drepturile consumatorilor',
                        ]} />
                    </Section>

                    <Section id="1" title="1. Părțile contractante">
                        <Sub title="1.1 Furnizorul">
                            <List items={[
                                'Denumire juridică: BRR GRUP Ltd.',
                                'Țara de înregistrare: Republica Bulgaria',
                                'Cod de înregistrare (EIK/UIC): 207691210',
                                'Adresa juridică: Sartsevo, Tvartitsa, Sliven region, 8896, Bulgaria',
                                'Email: contact@realtix.app',
                                'Website: www.realtix.eu',
                            ]} />
                        </Sub>
                        <Sub title="1.2 Utilizatorul">
                            <p>Orice persoană fizică cu capacitate deplină de exercițiu (cel puțin 18 ani) sau persoană juridică, reprezentată legal, care accesează sau utilizează Serviciul. Prin crearea unui cont, Utilizatorul confirmă că are capacitatea legală de a încheia prezentul contract.</p>
                            <Info>Dacă utilizați Serviciul în numele unei companii sau agenții imobiliare, confirmați că aveți autoritatea de a angaja acea entitate juridică prin acceptarea prezenților Termeni.</Info>
                        </Sub>
                    </Section>

                    <Section id="2" title="2. Descrierea Serviciului">
                        <p>REALTIX este o platformă software de tip SaaS (Software as a Service) destinată profesioniștilor din domeniul imobiliar: agenți imobiliari, agenții și dezvoltatori imobiliari. Platforma oferă:</p>
                        <List items={[
                            'CRM imobiliar: gestionarea clienților, contactelor și istoricului comunicărilor',
                            'Portofoliu proprietăți: adăugarea, gestionarea și prezentarea proprietăților',
                            'Sincronizare contacte din dispozitivul mobil',
                            'Jurnal apeluri cu clienții',
                            'Management sarcini și termene-limită',
                            'Calendar și întâlniri',
                            'Notificări pentru sarcini și activități importante',
                            'Statistici și rapoarte de performanță',
                            'Management echipă (multi-utilizator în cadrul agenției)',
                        ]} />
                        <p>Compania își rezervă dreptul de a adăuga, modifica sau elimina funcționalități, cu notificarea prealabilă a Utilizatorilor conform Secțiunii 15.</p>
                    </Section>

                    <Section id="3" title="3. Înregistrarea și administrarea contului">
                        <Sub title="3.1 Condiții de înregistrare">
                            <p>Pentru a utiliza funcțiile complete ale Serviciului, este necesară crearea unui cont. La înregistrare, Utilizatorul confirmă că:</p>
                            <List items={[
                                'are cel puțin 18 ani și capacitate juridică deplină',
                                'informațiile furnizate la înregistrare sunt reale, corecte și actualizate',
                                'utilizează Serviciul în scop profesional legal',
                                'nu a fost suspendat sau exclus anterior din Serviciu',
                            ]} />
                        </Sub>
                        <Sub title="3.2 Securitatea contului">
                            <p>Utilizatorul este pe deplin responsabil pentru:</p>
                            <List items={[
                                'păstrarea confidențialității credentialelor de acces (email și parolă)',
                                'toate activitățile desfășurate din contul său, autorizate sau nu',
                                'notificarea imediată a Companiei la security@realtix.app în cazul oricărui acces neautorizat suspectat',
                            ]} />
                            <p>Compania nu va fi răspunzătoare pentru pierderile cauzate de utilizarea neautorizată a contului dvs., dacă nu ați notificat Compania de îndată ce ați aflat despre accesul neautorizat.</p>
                        </Sub>
                        <Sub title="3.3 Cont de echipă / agenție">
                            <p>Utilizatorii cu rol de Administrator pot invita și gestiona alți utilizatori în cadrul aceluiași cont de agenție. Administratorul este responsabil pentru activitatea tuturor utilizatorilor gestionați și pentru nivelurile de acces acordate acestora.</p>
                        </Sub>
                    </Section>

                    <Section id="4" title="4. Abonamente, tarifare și facturare">
                        <Sub title="4.1 Planuri disponibile">
                            <p>Serviciul este disponibil pe bază de abonament plătit. Detaliile planurilor tarifare (preț, funcționalități, număr de utilizatori, stocare) sunt publicate pe www.realtix.eu și pot fi actualizate periodic.</p>
                            <p>Poate fi disponibilă o perioadă de probă gratuită (trial), ale cărei condiții specifice sunt precizate la momentul activării.</p>
                        </Sub>
                        <Sub title="4.2 Facturare și plată">
                            <p>Abonamentele sunt facturate anticipat, lunar sau anual, în funcție de planul ales. Plățile sunt procesate prin <strong>Stripe Inc.</strong>, procesator certificat PCI DSS. Prin furnizarea datelor de plată, autorizați Compania să debiteze suma corespunzătoare abonamentului ales.</p>
                            <p>Utilizatorul este responsabil pentru corectitudinea informațiilor de facturare. Facturile fiscale sunt emise electronic și transmise la adresa de email asociată contului.</p>
                        </Sub>
                        <Sub title="4.3 Reînnoire automată">
                            <p>Abonamentele se reînnoiesc automat la expirarea perioadei curente. Veți fi notificat prin email cu cel puțin 7 zile înainte de reînnoirea automată. Anularea se face din Setări → Abonament sau prin contactarea echipei de suport.</p>
                        </Sub>
                        <Sub title="4.4 Modificarea prețurilor">
                            <p>Compania poate modifica prețurile planurilor cu un preaviz de minim 30 de zile calendaristice, prin email și/sau notificare în platformă. Continuarea utilizării după data intrării în vigoare a noilor prețuri constituie acceptarea acestora.</p>
                        </Sub>
                        <Sub title="4.5 Rambursări">
                            <p>Toate plățile efectuate sunt, în principiu, nerambursabile, cu excepția cazurilor prevăzute expres de legislația aplicabilă sau cu acordul explicit al Companiei.</p>
                        </Sub>
                        <Sub title="4.6 Suspendarea la neplată">
                            <p>În cazul eșecului procesării plății, Compania va notifica Utilizatorul și va acorda o perioadă de grație de 7 zile calendaristice pentru regularizare. După această perioadă, accesul poate fi suspendat. Datele rămân stocate pe durata suspendării.</p>
                        </Sub>
                    </Section>

                    <Section id="5" title="5. Politica de utilizare acceptabilă">
                        <p>Utilizatorul se obligă să utilizeze Serviciul exclusiv în scopuri legale și profesionale. Sunt interzise:</p>
                        <Sub title="5.1 Activități interzise tehnic">
                            <List items={[
                                'tentative de acces neautorizat la sistemele Companiei sau ale altor utilizatori',
                                'utilizarea de instrumente automate (boți, scrapers) pentru extragerea datelor',
                                'interferarea cu funcționarea normală a Serviciului (atacuri DDoS etc.)',
                                'distribuirea sau instalarea de malware prin platformă',
                                'copierea, decompilarea sau dezasamblarea software-ului',
                            ]} />
                        </Sub>
                        <Sub title="5.2 Activități interzise de conținut">
                            <List items={[
                                'uploadarea de conținut ilegal, obscen, defăimător sau care încalcă drepturile terților',
                                'utilizarea Platformei pentru trimiterea de spam',
                                'stocarea datelor unor persoane fără consimțământ sau temei legal',
                                'utilizarea datelor extrase în scopuri incompatibile',
                            ]} />
                        </Sub>
                        <Sub title="5.3 Activități comerciale interzise">
                            <List items={[
                                'revânzarea, sublicențierea sau redistribuirea accesului la Serviciu',
                                'utilizarea Serviciului pentru a crea un produs concurent',
                                'utilizarea datelor Platformei pentru publicitate neautorizată sau profilare comercială',
                            ]} />
                        </Sub>
                        <Info>Încălcarea politicii de utilizare acceptabilă poate conduce la suspendarea sau închiderea imediată a contului, fără rambursare, și poate angaja răspunderea civilă sau penală a Utilizatorului.</Info>
                    </Section>

                    <Section id="6" title="6. Datele clienților Utilizatorului (date prelucrate în Platformă)">
                        <Sub title="6.1 Responsabilitatea Utilizatorului ca operator">
                            <p>În cadrul activității sale imobiliare, Utilizatorul introduce în Platformă date cu caracter personal ale propriilor clienți. Utilizatorul acționează în calitate de <strong>Operator de date</strong> conform GDPR și Legii RM nr. 133/2011, fiind responsabil pentru: legalitatea colectării, consimțământul clienților, informarea acestora, respectarea drepturilor și păstrarea dovezilor.</p>
                        </Sub>
                        <Sub title="6.2 Rolul Companiei ca procesator">
                            <p>Compania acționează în calitate de <strong>Procesator de date</strong>. Prelucrăm aceste date exclusiv conform instrucțiunilor Utilizatorului și în scopul furnizării Serviciului. Compania nu utilizează aceste date în alte scopuri, nu le vinde și nu le dezvăluie terților.</p>
                        </Sub>
                        <Sub title="6.3 Acord de procesare a datelor (DPA)">
                            <p>Prin acceptarea prezenților Termeni, Utilizatorul încheie implicit și un Acord de Procesare a Datelor (DPA) cu Compania, conform Art. 28 GDPR. Termenii specifici sunt incorporați în <Link href="/privacy" className="text-blue-700 hover:underline">Politica de Confidențialitate</Link>.</p>
                        </Sub>
                        <Sub title="6.4 Portabilitatea și exportul datelor">
                            <p>Utilizatorul poate exporta datele introduse în orice moment, în format electronic standard (CSV/Excel). La încetarea contractului, Utilizatorul are 90 de zile pentru a-și exporta datele.</p>
                        </Sub>
                    </Section>

                    <Section id="7" title="7. Permisiunile dispozitivului mobil">
                        <p>Aplicația mobilă REALTIX poate solicita acces la anumite resurse ale dispozitivului dvs.:</p>
                        <List items={[
                            'Contacte: pentru importul contactelor din telefon în CRM',
                            'Jurnal apeluri: pentru afișarea istoricului apelurilor cu clienții',
                            'Notificări push: pentru alertele privind sarcinile și întâlnirile',
                            'Camera / Galerie foto: pentru încărcarea fotografiilor proprietăților',
                            'Locație: opțional, pentru funcții de cartografiere',
                        ]} />
                        <Info>Toate permisiunile sunt opționale și pot fi gestionate din Setări → Aplicații pe dispozitivul dvs. Retragerea unei permisiuni nu dezactivează accesul la celelalte funcționalități.</Info>
                    </Section>

                    <Section id="8" title="8. Proprietatea intelectuală">
                        <Sub title="8.1 Drepturile Companiei">
                            <p>Platforma REALTIX, inclusiv software-ul, codul sursă, designul, graficele, mărcile comerciale, logoul și orice altă componentă, reprezintă proprietatea exclusivă a BRR GRUP Ltd. și sunt protejate de legislația privind drepturile de autor din Bulgaria, UE și, prin convenții internaționale, din Republica Moldova.</p>
                            <p>Utilizatorului i se acordă exclusiv o licență limitată, neexclusivă, netransferabilă și revocabilă de utilizare a Serviciului în scopuri profesionale proprii.</p>
                        </Sub>
                        <Sub title="8.2 Drepturile Utilizatorului asupra datelor proprii">
                            <p>Utilizatorul păstrează integral dreptul de proprietate asupra datelor introduse în Platformă (lista de clienți, proprietăți, note, documente etc.). Compania nu revendică niciun drept asupra acestor date.</p>
                        </Sub>
                        <Sub title="8.3 Feedback și sugestii">
                            <p>Dacă transmiteți sugestii, idei sau feedback privind îmbunătățirea Serviciului, acordați Companiei dreptul de a le utiliza fără nicio obligație de compensare.</p>
                        </Sub>
                    </Section>

                    <Section id="9" title="9. Confidențialitate și protecția datelor">
                        <p>Prelucrarea datelor cu caracter personal este reglementată de <Link href="/privacy" className="text-blue-700 hover:underline">Politica de Confidențialitate</Link>, document distinct care face parte integrantă din prezenții Termeni.</p>
                        <p>Politica de Confidențialitate descrie în detaliu: ce date colectăm și de ce, temeiurile legale ale prelucrării (GDPR, Legea RM 133/2011), drepturile dvs. ca persoană vizată, cum vă puteți exercita aceste drepturi și informații privind transferurile internaționale.</p>
                    </Section>

                    <Section id="10" title="10. Disponibilitatea Serviciului și mentenanță">
                        <Sub title="10.1 Disponibilitate">
                            <p>Compania depune eforturi rezonabile pentru a asigura disponibilitatea Serviciului 24/7, cu o țintă lunară de 99%. Nu garantăm funcționarea neîntreruptă; nu răspundem pentru întreruperile cauzate de mentenanță planificată, defecțiuni ale furnizorilor cloud, atacuri cibernetice, forță majoră sau probleme de conectivitate ale Utilizatorului.</p>
                        </Sub>
                        <Sub title="10.2 Mentenanță planificată">
                            <p>Lucrările de mentenanță planificată se efectuează, pe cât posibil, în afara orelor de vârf, și sunt anunțate în platformă sau prin email cu cel puțin 24 de ore înainte.</p>
                        </Sub>
                        <Sub title="10.3 Asistență tehnică">
                            <p>Disponibilă prin email <a href="mailto:support@realtix.app" className="text-blue-700 hover:underline">support@realtix.app</a>, chat în platformă și centrul de ajutor online. Timpii de răspuns diferă în funcție de planul ales.</p>
                        </Sub>
                    </Section>

                    <Section id="11" title="11. Limitarea răspunderii">
                        <Sub title="11.1 Excluderi de garanții">
                            <p>Serviciul este furnizat „as is" (așa cum este), fără garanții exprese sau implicite. Compania nu garantează că Serviciul va satisface integral cerințele specifice ale fiecărui Utilizator.</p>
                        </Sub>
                        <Sub title="11.2 Limitarea răspunderii financiare">
                            <p>În măsura permisă de legislație, răspunderea totală a Companiei față de Utilizator este limitată la suma plătită de Utilizator pentru Serviciu în ultimele 3 luni calendaristice anterioare evenimentului generator al prejudiciului.</p>
                            <p>Compania nu va fi răspunzătoare pentru pierderi indirecte, incidentale sau consecvente (pierderi de profit, de date, de clienți), prejudicii cauzate de utilizarea incorectă, acțiunile terților sau întreruperi din forță majoră.</p>
                        </Sub>
                        <Sub title="11.3 Răspunderea Utilizatorului">
                            <p>Utilizatorul răspunde integral pentru legalitatea datelor introduse, prejudiciile cauzate Companiei sau terților prin încălcarea Termenilor, și orice reclamație a terților legată de prelucrarea datelor lor prin Platformă.</p>
                        </Sub>
                        <Info>Limitările de răspundere se aplică în măsura permisă de legislația obligatorie aplicabilă. Legislația RM privind protecția consumatorilor poate acorda drepturi suplimentare care nu pot fi excluse contractual.</Info>
                    </Section>

                    <Section id="12" title="12. Încetarea contractului">
                        <Sub title="12.1 Încetarea de către Utilizator">
                            <p>Utilizatorul poate înceta contractul oricând prin anularea abonamentului din Setări → Abonament, prin solicitarea ștergerii contului la contact@realtix.app sau prin nereînnoirea abonamentului la expirare.</p>
                        </Sub>
                        <Sub title="12.2 Încetarea de către Companie">
                            <p>Compania își rezervă dreptul de a suspenda sau închide contul Utilizatorului în caz de: încălcare a Termenilor, neplată după perioada de grație, utilizare în scopuri frauduloase, la cererea autorităților competente sau la încetarea activității Companiei (cu preaviz de 60 de zile).</p>
                        </Sub>
                        <Sub title="12.3 Efectele încetării">
                            <p>La încetarea contractului, Utilizatorul are 90 de zile pentru a-și exporta datele. După această perioadă, datele vor fi șterse conform Politicii de Confidențialitate.</p>
                        </Sub>
                    </Section>

                    <Section id="13" title="13. Forța majoră">
                        <p>Niciuna dintre părți nu va fi răspunzătoare pentru neexecutarea obligațiilor în cazul unui eveniment de forță majoră. Sunt considerate forță majoră: dezastre naturale, epidemii, războaie, acte teroriste, decizii guvernamentale, atacuri cibernetice de amploare, întreruperi ale internetului la nivel național sau internațional, defecțiuni ale furnizorilor cloud.</p>
                    </Section>

                    <Section id="14" title="14. Legea aplicabilă și soluționarea litigiilor">
                        <Sub title="14.1 Legea aplicabilă">
                            <p>Prezenții Termeni sunt guvernați de legislația Republicii Bulgaria, completată cu prevederile relevante ale dreptului UE (GDPR, Directiva privind comerțul electronic).</p>
                            <p>Pentru Utilizatorii din RM, în măsura în care legislația moldovenească imperativă acordă drepturi superioare, aceste drepturi se vor aplica prioritar.</p>
                        </Sub>
                        <Sub title="14.2 Soluționarea pe cale amiabilă">
                            <p>În cazul oricărui litigiu, părțile se angajează să încerce mai întâi soluționarea amiabilă prin negocieri directe, într-un termen de 30 de zile calendaristice.</p>
                        </Sub>
                        <Sub title="14.3 Instanța competentă">
                            <p>Competența de soluționare revine instanțelor judecătorești din Sofia, Bulgaria, cu excepția cazurilor în care legislația obligatorie aplicabilă impune competența altei instanțe (de exemplu, instanța de la domiciliul consumatorului în RM).</p>
                        </Sub>
                        <Sub title="14.4 SAL pentru Utilizatorii din Moldova">
                            <p>Utilizatorii din RM pot apela la:</p>
                            <List items={[
                                'Agenția pentru Protecția Consumatorilor și Supravegherea Pieței (APCSP) — www.apcsp.md',
                                'Centrul de Mediere al RM — www.mediere.gov.md',
                                'Platforma europeană de soluționare online (UE) — ec.europa.eu/consumers/odr',
                            ]} />
                        </Sub>
                    </Section>

                    <Section id="15" title="15. Modificarea prezenților Termeni">
                        <p>Compania își rezervă dreptul de a modifica prezenții Termeni. Pentru modificările semnificative, vom notifica Utilizatorii prin email cu cel puțin 30 de zile calendaristice înainte de intrarea în vigoare și vom afișa un anunț vizibil în platformă.</p>
                        <p>Continuarea utilizării Serviciului după intrarea în vigoare constituie acceptarea modificărilor minore. Pentru modificări esențiale, este necesară acceptarea explicită.</p>
                    </Section>

                    <Section id="16" title="16. Cesiunea contractului">
                        <p>Utilizatorul nu poate ceda drepturile sau obligațiile fără acordul scris prealabil al Companiei.</p>
                        <p>Compania poate ceda prezentul contract în cazul unei fuziuni, achiziții sau vânzări a activelor, cu notificarea prealabilă a Utilizatorilor cu cel puțin 30 de zile înainte.</p>
                    </Section>

                    <Section id="17" title="17. Dispoziții finale">
                        <Sub title="17.1 Integralitatea acordului">
                            <p>Prezenții Termeni, împreună cu Politica de Confidențialitate și orice acorduri specifice încheiate în scris, constituie întreaga înțelegere între Companie și Utilizator.</p>
                        </Sub>
                        <Sub title="17.2 Independența clauzelor">
                            <p>Dacă orice clauză este declarată nulă sau inaplicabilă, aceasta va fi modificată în măsura minimă necesară pentru a deveni validă, iar celelalte clauze rămân pe deplin în vigoare.</p>
                        </Sub>
                        <Sub title="17.3 Renunțarea la drepturi">
                            <p>Nicio omisiune sau întârziere în exercitarea unui drept nu va constitui o renunțare la acel drept.</p>
                        </Sub>
                        <Sub title="17.4 Comunicări oficiale">
                            <p>Orice notificare oficială va fi transmisă în scris, prin email sau poștă. Comunicările prin email sunt considerate primite în ziua lucrătoare următoare trimiterii.</p>
                        </Sub>
                        <Sub title="17.5 Versiunea în limba română">
                            <p>În cazul unui conflict între versiuni în diferite limbi, versiunea în limba română va prevala.</p>
                        </Sub>
                    </Section>

                    <Section id="18" title="18. Date de contact">
                        <List items={[
                            'Email general: contact@realtix.app',
                            'Email juridic / litigii: legal@realtix.app',
                            'Email suport tehnic: support@realtix.app',
                            'Website: www.realtix.eu',
                            'Adresă poștală: Sartsevo, Tvartitsa, Sliven region, 8896, Bulgaria',
                            'Telefon: +359 884 898 930',
                        ]} />
                        <p>Program de lucru pentru suport: Luni — Vineri, 09:00 — 18:00 (ora Bulgariei / EET).</p>
                    </Section>

                    <div className="mt-16 pt-8 border-t border-slate-200 text-center">
                        <p className="font-bold text-slate-800 mb-2">Acceptarea Termenilor</p>
                        <p className="text-sm text-slate-600">Prin crearea unui cont sau utilizarea platformei REALTIX, confirmați că ați citit, înțeles și acceptat în totalitate prezenții Termeni și Condiții de Utilizare, precum și <Link href="/privacy" className="text-blue-700 hover:underline">Politica de Confidențialitate</Link>.</p>
                        <p className="text-xs text-slate-400 mt-6">© 2026 BRR GRUP Ltd. · Toate drepturile rezervate · Versiunea 1.0 · 10.05.2026</p>
                    </div>
                </main>
            </div>
        </>
    );
}
