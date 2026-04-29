<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\ContractTemplate;

/**
 * Setul implicit de șabloane REALTIX (13 documente — traduse RU → RO).
 * Apelat din butonul "Instalează setul implicit" din pagina /contracts.
 */
class DefaultContractTemplates
{
    public static function install(Agency $agency): int
    {
        $templates = self::all();
        $created   = 0;

        foreach ($templates as $tpl) {
            $existing = ContractTemplate::where('agency_id', $agency->id)
                ->where('name', $tpl['name'])
                ->first();

            if ($existing) {
                continue;
            }

            ContractTemplate::create(array_merge($tpl, [
                'agency_id'  => $agency->id,
                'is_default' => true,
            ]));
            $created++;
        }

        return $created;
    }

    public static function all(): array
    {
        return [
            self::avans(),
            self::arvuna(),
            self::recepisaDocumente(),
            self::actDocumente(),
            self::notificareReziliere(),
            self::actServiciiPrestate(),
            self::contractExclusiv(),
            self::procura(),
            self::actImobil(),
            self::serviciiCumparator(),
            self::serviciiVanzator(),
            self::asistentaTranzactie(),
            self::contractMandat(),
        ];
    }

    // 01 ─────────────────────────────────────────────────────────────────────
    private static function avans(): array
    {
        $content = <<<'EOT'
ACORD DE AVANS

mun. {oras}
Data: {data_contractului}

Noi, subsemnații:

PARTEA 1: {nume_vanzator}, IDNP {idnp_vanzator}, domiciliat(ă) la adresa: {adresa_vanzator}.

și

PARTEA 2: {nume_client}, IDNP {idnp_client}, domiciliat(ă) la adresa: {adresa_client}.

am încheiat prezentul Acord cu privire la următoarele:

1. Partea 1 transmite Părții 2 suma de bani în mărime de: {suma_avans} {valuta}.

2. Suma indicată reprezintă AVANS în contul tranzacției viitoare cu privire la imobilul situat la adresa:
{adresa_proprietate}.

3. Valoarea totală a imobilului este: {pret} {valuta}.

4. Părțile intenționează să încheie contractul principal până la data de: {data_contract_principal}.

5. În cazul neîncheierii contractului principal, suma transmisă este restituită Părții 1, dacă părțile nu convin altceva în scris.

6. Prezentul Acord este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

PARTEA 1: ___________________________ / {nume_vanzator} /

PARTEA 2: ___________________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Acord de avans',
            'type'    => 'advance',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 02 ─────────────────────────────────────────────────────────────────────
    private static function arvuna(): array
    {
        $content = <<<'EOT'
ACORD DE ARVUNĂ

mun. {oras}
Data: {data_contractului}

Noi, subsemnații:

PARTEA 1: {nume_vanzator}, IDNP {idnp_vanzator}, domiciliat(ă) la adresa: {adresa_vanzator}.

și

PARTEA 2: {nume_client}, IDNP {idnp_client}, domiciliat(ă) la adresa: {adresa_client}.

am încheiat prezentul Acord cu privire la următoarele:

1. Partea 1 transmite Părții 2 suma de bani în mărime de: {suma_arvuna} {valuta}.

2. Suma indicată este transmisă cu titlu de ARVUNĂ în contul tranzacției viitoare cu privire la imobilul situat la adresa:
{adresa_proprietate}.

3. Valoarea totală a imobilului este: {pret} {valuta}.

4. Părțile se obligă să încheie contractul principal până la data de: {data_contract_principal}.

5. În cazul refuzului Părții 1 de a încheia contractul principal, arvuna rămâne la Partea 2.

6. În cazul refuzului Părții 2 de a încheia contractul principal, Partea 2 se obligă să restituie arvuna în mărime DUBLĂ, dacă legislația Republicii Moldova nu prevede altfel.

7. Prezentul Acord este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

PARTEA 1: ___________________________ / {nume_vanzator} /

PARTEA 2: ___________________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Acord de arvună',
            'type'    => 'advance',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 03 ─────────────────────────────────────────────────────────────────────
    private static function recepisaDocumente(): array
    {
        $content = <<<'EOT'
RECIPISĂ PRIVIND PRIMIREA DOCUMENTELOR

mun. {oras}
Data: {data_contractului}

Eu, subsemnatul(a):
{nume_primitor}, IDNP {idnp_primitor}, domiciliat(ă) la adresa: {adresa_primitor},

prin prezenta confirm că am primit de la:
{nume_predator}, IDNP {idnp_predator}, domiciliat(ă) la adresa: {adresa_predator},

următoarele documente, referitoare la imobilul situat la adresa:
{adresa_proprietate}.

Lista documentelor primite:
1) ____________________________________________________________
2) ____________________________________________________________
3) ____________________________________________________________
4) ____________________________________________________________
5) ____________________________________________________________

Documentele au fost primite în volum complet, nu am pretenții cu privire la transmiterea acestora.

Prezenta Recipisă este întocmită în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

A predat: ___________________________ / {nume_predator} /

A primit: ___________________________ / {nume_primitor} /
EOT;

        return [
            'name'    => 'Recipisă privind primirea documentelor',
            'type'    => 'handover',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 04 ─────────────────────────────────────────────────────────────────────
    private static function actDocumente(): array
    {
        $content = <<<'EOT'
ACT DE PREDARE-PRIMIRE A DOCUMENTELOR

mun. {oras}
Data: {data_contractului}

Noi, subsemnații:

PARTEA PREDĂTOARE: {nume_predator}, IDNP {idnp_predator}, domiciliat(ă) la: {adresa_predator}.

și

PARTEA PRIMITOARE: {nume_primitor}, IDNP {idnp_primitor}, domiciliat(ă) la: {adresa_primitor}.

am întocmit prezentul Act cu privire la următoarele:

Partea predătoare a transmis, iar Partea primitoare a primit următoarele documente referitoare la imobilul situat la adresa:
{adresa_proprietate}.

Lista documentelor transmise:
1) ____________________________________________________________
2) ____________________________________________________________
3) ____________________________________________________________
4) ____________________________________________________________
5) ____________________________________________________________

Documentele au fost transmise în: original / copie / copie legalizată (selectați).

Părțile confirmă că la momentul semnării prezentului Act nu au pretenții reciproce cu privire la transmiterea documentelor.

Prezentul Act este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

PARTEA PREDĂTOARE: ___________________________ / {nume_predator} /

PARTEA PRIMITOARE: ___________________________ / {nume_primitor} /
EOT;

        return [
            'name'    => 'Act de predare-primire a documentelor',
            'type'    => 'handover',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 05 ─────────────────────────────────────────────────────────────────────
    private static function notificareReziliere(): array
    {
        $content = <<<'EOT'
NOTIFICARE DE REZILIERE A CONTRACTULUI

mun. {oras}
Data: {data_contractului}

DE LA:
{nume_expeditor}, IDNP {idnp_expeditor}, adresa: {adresa_expeditor}.

CĂTRE:
{nume_destinatar}, IDNP {idnp_destinatar}, adresa: {adresa_destinatar}.

Prin prezenta Vă notific despre rezilierea contractului nr. {numar_contract} din data de {data_contract_initial}, încheiat între părți.

Obiectul contractului:
{obiect_contract}

Contractul se consideră reziliat începând cu data de: {data_reziliere}.

Solicit efectuarea tuturor decontărilor reciproce, restituirea bunurilor, documentelor și mijloacelor bănești (dacă există obligații în acest sens) în termen până la data de: {data_decontare}.

Prezenta Notificare este întocmită în două exemplare, dintre care unul se transmite celeilalte părți.

Semnătură: ___________________________ / {nume_expeditor} /
EOT;

        return [
            'name'    => 'Notificare de reziliere a contractului',
            'type'    => 'termination',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 06 ─────────────────────────────────────────────────────────────────────
    private static function actServiciiPrestate(): array
    {
        $content = <<<'EOT'
ACT NR. {numar_act}
PRIVIND SERVICIILE PRESTATE

la Contractul nr. {numar_contract} din data de {data_contract_initial}

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE

PRESTATOR: {nume_agentie}
care acționează în baza: {temei_juridic}
IDNO / nr. de înregistrare: {idno_agentie}
adresa: {adresa_agentie}
telefon: {telefon_agentie}, e-mail: {email_agentie}

și

BENEFICIAR: {nume_client}
IDNP / serie și nr. act de identitate: {idnp_client}
eliberat de: {act_identitate_eliberat}
adresa de domiciliu: {adresa_client}
telefon: {telefon_client}, e-mail: {email_client}

denumiți în continuare „Părțile", au întocmit prezentul Act cu privire la următoarele:

2. TEMEIUL ÎNTOCMIRII ACTULUI

2.1. Prezentul Act este întocmit în executarea:
- Contractului de prestare a serviciilor imobiliare nr. {numar_contract} din {data_contract_initial};
- altui contract: {alt_contract}.

2.2. Perioada prestării serviciilor: de la {data_inceput} până la {data_sfarsit}.

3. LISTA SERVICIILOR PRESTATE

Prestatorul a prestat Beneficiarului următoarele servicii:
- consultații cu privire la tranzacția imobiliară;
- selecția / căutarea obiectului imobiliar;
- căutarea cumpărătorului;
- plasarea anunțurilor publicitare;
- organizarea și efectuarea vizionărilor;
- efectuarea negocierilor;
- verificarea completivității documentelor;
- asistare avans / arvună;
- asistare la notar;
- coordonarea cu banca / evaluatorul / oficiul cadastral;
- pregătirea și transmiterea documentelor;
- alte servicii: {alte_servicii}.

4. REZULTATUL SERVICIILOR PRESTATE

4.1. În urma prestării serviciilor:
- a fost găsit cumpărător / obiect imobiliar;
- au fost organizate vizionări ale obiectului;
- au fost efectuate negocieri între părți;
- a fost pregătit setul de documente pentru tranzacție;
- a fost asistată tranzacția de vânzare-cumpărare / locațiune / alta;
- a fost semnat contractul: {contract_semnat};
- alt rezultat: {alt_rezultat}.

4.2. Obiectul imobiliar / tranzacția la care se referă serviciile:
- Tip obiect: {tip_proprietate}
- Adresă obiect: {adresa_proprietate}
- Nr. cadastral: {numar_cadastral}
- Preț tranzacție / preț convenit: {pret} {valuta}

5. COSTUL SERVICIILOR PRESTATE

5.1. Costul serviciilor prestate pentru perioada indicată: {suma_totala} {valuta}.
5.2. Suma achitată anterior: {suma_achitata} {valuta}.
5.3. Suma de plată conform prezentului Act: {suma_de_plata} {valuta}.
5.4. Termen de plată: {termen_plata}.
5.5. Modalitatea de plată: numerar / transfer bancar / altă modalitate: {alta_modalitate}.

6. PRETENȚIILE PĂRȚILOR

6.1. Beneficiarul confirmă că serviciile au fost prestate:
- în volum complet;
- parțial: {prestare_partiala};
- cu observații: {observatii}.

6.2. În lipsa observațiilor, Beneficiarul confirmă că nu are pretenții cu privire la volumul, calitatea și termenele serviciilor prestate.

7. DISPOZIȚII FINALE

7.1. Prezentul Act este întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.
7.2. Prezentul Act este parte integrantă a contractului indicat în pct. 2.

8. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

PRESTATOR: {nume_agentie}
IDNO: {idno_agentie}
Adresă: {adresa_agentie}
Telefon: {telefon_agentie}, E-mail: {email_agentie}
Semnătură: ______________________ / {nume_agent} /

BENEFICIAR: {nume_client}
IDNP: {idnp_client}
Adresă: {adresa_client}
Telefon: {telefon_client}, E-mail: {email_client}
Semnătură: ______________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Act privind serviciile prestate',
            'type'    => 'service_act',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 07 ─────────────────────────────────────────────────────────────────────
    private static function contractExclusiv(): array
    {
        $content = <<<'EOT'
CONTRACT NR. {numar_contract}
DE PRESTARE EXCLUSIVĂ A SERVICIILOR IMOBILIARE PENTRU VÂNZAREA IMOBILULUI

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE CONTRACTANTE

PRESTATOR: {nume_agentie}, care acționează în baza {temei_juridic}, IDNO {idno_agentie},
adresa: {adresa_agentie}, telefon: {telefon_agentie}, e-mail: {email_agentie}.

și

BENEFICIAR: {nume_client}, IDNP {idnp_client}, eliberat de {act_identitate_eliberat},
domiciliat(ă) la: {adresa_client}, telefon: {telefon_client}, e-mail: {email_client}.

denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele:

2. OBIECTUL CONTRACTULUI

2.1. Beneficiarul împuternicește, iar Prestatorul își asumă obligația, în condiții de exclusivitate, să presteze serviciile imobiliare necesare vânzării următorului obiect:
- Tip obiect: {tip_proprietate}
- Adresă: {adresa_proprietate}
- Nr. cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Etaj / nr. etaje: {etaj}
- Nr. camere: {numar_camere}
- Documentul ce confirmă dreptul de proprietate: {document_proprietate}

2.2. Prestatorul se obligă să caute cumpărător, să promoveze obiectul, să organizeze vizionări, să poarte negocieri și să asigure asistarea tranzacției.

2.3. Beneficiarul acordă Prestatorului dreptul EXCLUSIV de a presta serviciile de vânzare a obiectului pe durata prezentului contract.

2.4. Prezentul contract NU este contract de vânzare-cumpărare, contract preliminar sau procură de înstrăinare.

3. CONDIȚIILE DE EXCLUSIVITATE

3.1. Pe durata prezentului contract, Beneficiarul se obligă:
- să nu încheie contracte similare cu alți agenți / agenții / intermediari pentru același obiect;
- să nu încredințeze terților căutarea cumpărătorului în condiții care contravin prezentului contract;
- să nu plaseze de sine stătător anunțuri de vânzare fără acordul Prestatorului;
- să comunice imediat Prestatorului fiecare adresare a unui potențial cumpărător;
- să direcționeze toate persoanele interesate către Prestator;
- să nu poarte negocieri de înstrăinare a obiectului ocolind Prestatorul, dacă cumpărătorul a fost identificat prin acțiunile Prestatorului.

3.2. Dacă Beneficiarul găsește cumpărătorul de sine stătător în perioada de valabilitate a contractului, modalitatea de plată a remunerației Prestatorului se stabilește astfel: {clauza_cumparator_propriu}.

3.3. Dacă tranzacția este încheiată cu o persoană care:
- a fost atrasă de Prestator;
- a primit informații despre obiect prin Prestator;
- a vizionat obiectul prin Prestator;
- a purtat negocieri prin Prestator;
- a fost înregistrată în registrul de adresări / lista de vizionări / CRM-ul Prestatorului,

remunerația Prestatorului se achită conform prezentului contract.

3.4. Termen de post-acțiune a exclusivității după încetarea contractului: {durata_post_actiune} zile calendaristice.

4. LISTA SERVICIILOR PRESTATORULUI

Prestatorul se obligă să presteze următoarele servicii:
- analiza valorii de piață a obiectului;
- consultații pentru pregătirea obiectului în vederea vânzării;
- foto- și video-realizare a obiectului;
- pregătirea materialelor publicitare;
- plasarea anunțurilor pe site-uri, rețele sociale, baze de date partenere și alte canale;
- procesarea adresărilor primite;
- negocieri cu potențialii cumpărători;
- organizarea și efectuarea vizionărilor;
- verificarea completivității documentelor;
- coordonarea pregătirii avansului / arvunei / acordurilor preliminare;
- asistarea tranzacției la notar, bancă, evaluator;
- alte servicii: {alte_servicii}.

5. OBLIGAȚIILE PRESTATORULUI

5.1. Să acționeze cu bună-credință și diligență în interesele Beneficiarului.
5.2. Să depună eforturi pentru găsirea cumpărătorului în condițiile convenite.
5.3. Să informeze Beneficiarul cu privire la executarea contractului.
5.4. Să coordoneze cu Beneficiarul vizionările obiectului.
5.5. Să respecte confidențialitatea datelor personale ale Beneficiarului.
5.6. La cererea Beneficiarului, să prezinte raport despre activitatea desfășurată.

6. OBLIGAȚIILE BENEFICIARULUI

6.1. Să prezinte informații veridice despre obiect și documentele aferente.
6.2. Să prezinte Prestatorului următoarele documente:
- act de identitate;
- document care confirmă dreptul de proprietate;
- documente cadastrale / de înregistrare;
- acordul soțului/soției, dacă se aplică;
- acordul coproprietarilor / reprezentanților, dacă se aplică;
- alte documente: {alte_documente}.
6.3. Să asigure accesul la obiect pentru vizionări conform graficului convenit.
6.4. Să nu efectueze acțiuni ce încalcă condițiile de exclusivitate.
6.5. Să comunice imediat Prestatorului despre:
- modificarea prețului obiectului;
- modificarea intenției de a vinde obiectul;
- existența grevărilor, litigiilor, sechestrelor, drepturilor terților;
- orice adresări directe ale persoanelor interesate.
6.6. Să achite serviciile Prestatorului conform prezentului contract.

7. PREȚUL OBIECTULUI ȘI CONDIȚIILE DE VÂNZARE

7.1. Prețul de ofertă convenit al obiectului: {pret} {valuta}.
7.2. Prețul minim admis de vânzare: {pret_minim} {valuta}.
7.3. Condiții suplimentare de vânzare:
- formă de plată: {forma_plata};
- eliberarea obiectului: {eliberare_obiect};
- transmiterea mobilierului / tehnicii: {transmitere_mobilier};
- alte condiții: {alte_conditii}.

8. REMUNERAȚIA PRESTATORULUI ȘI MODALITATEA DE PLATĂ

8.1. Remunerația Prestatorului constituie:
- sumă fixă: {suma_fixa} {valuta}; și/sau
- {comision_procent}% din prețul efectiv al vânzării; și/sau
- altă modalitate: {alta_modalitate_calcul}.

8.2. Remunerația este datorată în cazul:
- încheierii contractului de vânzare-cumpărare / înstrăinare;
- semnării acordului preliminar cu cumpărătorul;
- depunerii avansului / arvunei;
- încheierii tranzacției cu cumpărătorul atras de Prestator în perioada contractuală sau de post-acțiune (pct. 3.4).

8.3. Termen de plată: {termen_plata}.
8.4. Modalitate de plată: numerar / transfer bancar / altă modalitate.

9. CONFIRMAREA ACȚIUNILOR PRESTATORULUI

Prestarea serviciilor poate fi confirmată prin: act privind serviciile prestate, liste de vizionări, corespondență, rapoarte, registru de adresări, CRM, publicații publicitare.

10. TERMENUL CONTRACTULUI

10.1. Contractul intră în vigoare la data semnării.
10.2. Termen de valabilitate: de la {data_inceput} până la {data_sfarsit}.
10.3. Prelungirea contractului: {modalitate_prelungire}.

11. ÎNCETAREA ANTICIPATĂ ȘI SANCȚIUNI

11.1. Contractul poate fi reziliat:
- prin acordul părților;
- la inițiativa unei părți cu notificare scrisă cu {zile_notificare} zile înainte;
- pentru alte temeiuri prevăzute de legislația Republicii Moldova.

11.2. În caz de încălcare a exclusivității de către Beneficiar, se aplică:
- plata integrală / parțială a remunerației Prestatorului;
- compensarea cheltuielilor confirmate;
- penalitate în mărime de: {suma_penalitate};
- altă procedură: {alta_procedura}.

12. RĂSPUNDEREA PĂRȚILOR

12.1. Pentru neîndeplinirea obligațiilor, părțile răspund conform legislației Republicii Moldova și prezentului contract.
12.2. Prestatorul nu răspunde pentru: refuzul cumpărătorului, modificarea pieței, informații false transmise de Beneficiar, acțiuni ale notarului / băncii / autorităților, alte circumstanțe externe.
12.3. Beneficiarul răspunde pentru veridicitatea documentelor și informațiilor transmise.

13. CONFIDENȚIALITATE ȘI DATE PERSONALE

13.1. Părțile se obligă să nu divulge informațiile cunoscute în cadrul contractului.
13.2. Beneficiarul își exprimă consimțământul pentru prelucrarea datelor sale personale în volumul necesar executării contractului.

14. FORȚĂ MAJORĂ

14.1. Părțile sunt eliberate de răspundere în cazul forței majore.
14.2. Partea afectată notifică cealaltă parte în termen de {termen_notificare_fm}.

15. SOLUȚIONAREA LITIGIILOR

15.1. Litigiile se soluționează prin negocieri.
15.2. În lipsa acordului, litigiul se examinează în instanța competentă din Republica Moldova.

16. DISPOZIȚII FINALE

16.1. Prezentul contract este întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.
16.2. Anexe la contract:
- Anexa nr. 1 — date despre obiect;
- Anexa nr. 2 — lista documentelor transmise;
- Anexa nr. 3 — condițiile de promovare publicitară;
- Anexa nr. 4 — graficul vizionărilor;
- Anexa nr. 5 — forma raportului Prestatorului.

17. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

PRESTATOR: {nume_agentie}, IDNO {idno_agentie}
Adresă: {adresa_agentie}
Telefon: {telefon_agentie}, E-mail: {email_agentie}
Semnătură: ______________________ / {nume_agent} /

BENEFICIAR: {nume_client}, IDNP {idnp_client}
Adresă: {adresa_client}
Telefon: {telefon_client}, E-mail: {email_client}
Semnătură: ______________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Contract exclusiv de servicii imobiliare (vânzare)',
            'type'    => 'exclusive',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 08 ─────────────────────────────────────────────────────────────────────
    private static function procura(): array
    {
        $content = <<<'EOT'
PROCURĂ
PENTRU REPREZENTAREA INTERESELOR

mun. {oras}
Data: {data_contractului}

Eu, subsemnatul(a):
{nume_mandant}, IDNP {idnp_mandant},
data nașterii: {data_nasterii_mandant},
adresa de domiciliu: {adresa_mandant},

prin prezenta procură împuternicesc:

{nume_mandatar}, IDNP {idnp_mandatar},
data nașterii: {data_nasterii_mandatar},
adresa de domiciliu: {adresa_mandatar},

să-mi reprezinte interesele în chestiuni legate de imobilul situat la adresa:
{adresa_proprietate}.

Mandatarului i se acordă următoarele împuterniciri:

1. Să depună cereri, solicitări și să primească documente.
2. Să reprezinte interesele în autoritățile publice, instituții și organizații.
3. Să semneze documentele necesare în limitele împuternicirilor acordate.
4. Să primească certificate, extrase și alte documente.
5. Să efectueze alte acțiuni necesare pentru executarea prezentei procuri.

Termen de valabilitate al procurii: până la data de {data_expirare_procura}.

Dreptul de substituire: {drept_substituire}.

Prezenta procură este semnată personal de mandant.

MANDANT: ___________________________ / {nume_mandant} /

MANDATAR: ___________________________ / {nume_mandatar} /
EOT;

        return [
            'name'    => 'Procură pentru reprezentarea intereselor',
            'type'    => 'power_of_attorney',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 09 ─────────────────────────────────────────────────────────────────────
    private static function actImobil(): array
    {
        $content = <<<'EOT'
ACT DE PREDARE-PRIMIRE A IMOBILULUI
CU INVENTARUL BUNURILOR

mun. {oras}
Data: {data_contractului}

Noi, subsemnații:

PARTEA PREDĂTOARE: {nume_predator}, IDNP {idnp_predator}, domiciliat(ă) la: {adresa_predator}.

și

PARTEA PRIMITOARE: {nume_primitor}, IDNP {idnp_primitor}, domiciliat(ă) la: {adresa_primitor}.

am întocmit prezentul Act cu privire la următoarele:

Partea predătoare a transmis, iar Partea primitoare a primit imobilul situat la adresa:
{adresa_proprietate}.

STAREA IMOBILULUI LA MOMENTUL TRANSMITERII:
{stare_imobil}

INVENTARUL BUNURILOR AFLATE ÎN IMOBIL:
(mobilier, electrocasnice, instalații sanitare, chei, contoare, alte bunuri)

1) ____________________________________________________________
2) ____________________________________________________________
3) ____________________________________________________________
4) ____________________________________________________________
5) ____________________________________________________________
6) ____________________________________________________________
7) ____________________________________________________________
8) ____________________________________________________________
9) ____________________________________________________________
10) ___________________________________________________________

INDICAȚIILE CONTOARELOR LA MOMENTUL TRANSMITERII:
- Energie electrică: {contor_electric}
- Gaz: {contor_gaz}
- Apă (rece): {contor_apa_rece}
- Apă (caldă): {contor_apa_calda}
- Altele: {alte_contoare}

CHEI PREDATE:
- de la ușa de la intrare: {chei_intrare} buc.
- de la încuietori suplimentare: {chei_suplimentare} buc.
- de la cutia poștală: {chei_postala} buc.
- alte chei: {alte_chei}

Părțile confirmă lipsa pretențiilor reciproce cu privire la starea imobilului și a bunurilor transmise.

Prezentul Act este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

PARTEA PREDĂTOARE: ___________________________ / {nume_predator} /

PARTEA PRIMITOARE: ___________________________ / {nume_primitor} /
EOT;

        return [
            'name'    => 'Act de predare-primire a imobilului (cu inventar)',
            'type'    => 'handover',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 10 ─────────────────────────────────────────────────────────────────────
    private static function serviciiCumparator(): array
    {
        $content = <<<'EOT'
CONTRACT NR. {numar_contract}
DE PRESTARE A SERVICIILOR IMOBILIARE
PENTRU SELECȚIA ȘI ASISTAREA ACHIZIȚIONĂRII IMOBILULUI

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE

PRESTATOR: {nume_agentie}, IDNO {idno_agentie},
adresa: {adresa_agentie}, telefon: {telefon_agentie}, e-mail: {email_agentie}.

și

BENEFICIAR (CUMPĂRĂTOR): {nume_client}, IDNP {idnp_client},
domiciliat la: {adresa_client}, telefon: {telefon_client}, e-mail: {email_client}.

denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele.

2. OBIECTUL CONTRACTULUI

2.1. Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii imobiliare:
- selecția obiectului imobiliar conform criteriilor Beneficiarului;
- organizarea vizionărilor;
- negocieri cu vânzătorii / reprezentanții acestora;
- asistarea procedurii de achiziționare a imobilului;
- alte acțiuni convenite: {alte_actiuni}.

2.2. Prezentul contract NU este contract preliminar / contract de vânzare-cumpărare și NU obligă Prestatorul să garanteze încheierea tranzacției.

3. CRITERII DE SELECȚIE A IMOBILULUI

- Tip obiect: {tip_proprietate}
- Localitate / sector: {oras}, {sector}
- Nr. camere: {numar_camere}
- Suprafață: {suprafata} m²
- Etaj preferat: {etaj}
- Buget maxim: {pret_maxim} {valuta}
- Caracteristici suplimentare: {caracteristici}

4. LISTA SERVICIILOR PRESTATORULUI

- selecția ofertelor pe piață;
- prezentarea anunțurilor pertinente;
- coordonarea vizionărilor;
- analiza juridică preliminară a obiectelor;
- consultații privind prețul și negocierile;
- asistarea avansului / arvunei;
- asistarea la notar, bancă, evaluator;
- alte servicii: {alte_servicii}.

5. OBLIGAȚIILE PRESTATORULUI

- să acționeze cu bună-credință;
- să selecteze obiecte conform criteriilor;
- să informeze Beneficiarul despre rezultate;
- să respecte confidențialitatea.

6. OBLIGAȚIILE BENEFICIARULUI

- să prezinte criterii clare de selecție;
- să fie disponibil pentru vizionări;
- să nu poarte negocieri ocolind Prestatorul cu obiectele prezentate de acesta;
- să achite remunerația conform contractului.

7. REMUNERAȚIA ȘI PLATA

7.1. Remunerația Prestatorului: {comision_procent}% din prețul tranzacției / sumă fixă: {suma_fixa} {valuta}.
7.2. Termen de plată: {termen_plata}.
7.3. Modalitate de plată: numerar / transfer bancar.

8. INTERACȚIUNEA PE OBIECTE

8.1. Lista obiectelor prezentate de Prestator se înregistrează în lista de vizionări / CRM.
8.2. Dacă Beneficiarul achiziționează un obiect prezentat anterior de Prestator (chiar prin alt agent), remunerația Prestatorului se datorează în întregime.

9. PREDAREA SERVICIILOR

9.1. Serviciile se confirmă prin Act privind serviciile prestate.

10. RĂSPUNDERE ȘI LIMITE

10.1. Prestatorul nu răspunde pentru calitatea juridică a obiectelor selectate, dar verifică documentele prezentate.

11. TERMENUL CONTRACTULUI

11.1. De la {data_inceput} până la {data_sfarsit}.

12. CONFIDENȚIALITATE ȘI DATE PERSONALE

12.1. Beneficiarul își dă consimțământul pentru prelucrarea datelor personale.

13. FORȚĂ MAJORĂ

13.1. Conform legislației Republicii Moldova.

14. MODIFICAREA ȘI REZILIEREA

14.1. Prin acord scris al părților sau cu notificare cu {zile_notificare} zile înainte.

15. SOLUȚIONAREA LITIGIILOR

15.1. Prin negocieri; în caz de eșec — instanța competentă din RM.

16. DISPOZIȚII FINALE

16.1. Întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.

17. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

PRESTATOR: {nume_agentie}, IDNO {idno_agentie}
Adresă: {adresa_agentie}, telefon: {telefon_agentie}
Semnătură: ______________________ / {nume_agent} /

BENEFICIAR: {nume_client}, IDNP {idnp_client}
Adresă: {adresa_client}, telefon: {telefon_client}
Semnătură: ______________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Contract de servicii imobiliare (cumpărător)',
            'type'    => 'service_buyer',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 11 ─────────────────────────────────────────────────────────────────────
    private static function serviciiVanzator(): array
    {
        $content = <<<'EOT'
CONTRACT NR. {numar_contract}
DE PRESTARE A SERVICIILOR IMOBILIARE
PENTRU VÂNZAREA IMOBILULUI

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE

PRESTATOR: {nume_agentie}, IDNO {idno_agentie},
adresa: {adresa_agentie}, telefon: {telefon_agentie}, e-mail: {email_agentie}.

și

BENEFICIAR (VÂNZĂTOR): {nume_client}, IDNP {idnp_client},
domiciliat la: {adresa_client}, telefon: {telefon_client}, e-mail: {email_client}.

denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele.

2. OBIECTUL CONTRACTULUI

2.1. Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii imobiliare orientate spre găsirea cumpărătorului și asistarea vânzării imobilului:
- Tip obiect: {tip_proprietate}
- Adresă: {adresa_proprietate}
- Nr. cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Etaj / nr. etaje: {etaj}
- Nr. camere: {numar_camere}
- Documentul de proprietate: {document_proprietate}

2.2. Prezentul contract NU este contract de vânzare-cumpărare.

3. LISTA SERVICIILOR PRESTATORULUI

- analiza pieței și a prețului;
- pregătirea materialelor publicitare;
- plasarea anunțurilor pe portaluri și rețele sociale;
- procesarea adresărilor;
- organizarea vizionărilor;
- negocieri cu cumpărătorii;
- verificarea documentelor;
- asistarea avansului / arvunei;
- asistarea la notar / bancă;
- alte servicii: {alte_servicii}.

4. OBLIGAȚIILE PRESTATORULUI

- bună-credință și diligență;
- promovare activă a obiectului;
- raportare la cererea Beneficiarului;
- confidențialitate.

5. OBLIGAȚIILE BENEFICIARULUI

- date veridice despre obiect;
- documente ale obiectului;
- acces pentru vizionări;
- comunicarea schimbărilor (preț, intenție de vânzare);
- plata remunerației.

6. REMUNERAȚIA ȘI PLATA

6.1. Remunerația Prestatorului: {comision_procent}% din prețul vânzării / sumă fixă: {suma_fixa} {valuta}.
6.2. Termen de plată: {termen_plata}.
6.3. Modalitate: numerar / transfer bancar.

7. TERMENUL CONTRACTULUI

7.1. De la {data_inceput} până la {data_sfarsit}.

8. EXCLUSIVITATEA

8.1. Prezentul contract este: cu / fără exclusivitate.
8.2. Dacă este cu exclusivitate, se aplică restricțiile specifice prevăzute în Anexa nr. 1.

9. PREDAREA SERVICIILOR

9.1. Confirmare prin Act privind serviciile prestate.

10. RĂSPUNDERE

10.1. Conform legislației Republicii Moldova și prezentului contract.

11. CONFIDENȚIALITATE ȘI DATE PERSONALE

12. FORȚĂ MAJORĂ

13. MODIFICARE ȘI REZILIERE

13.1. Cu notificare cu {zile_notificare} zile înainte.

14. SOLUȚIONAREA LITIGIILOR

14.1. Prin negocieri / instanța din RM.

15. DISPOZIȚII FINALE

15.1. Întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.

16. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

PRESTATOR: {nume_agentie}, IDNO {idno_agentie}
Adresă: {adresa_agentie}, telefon: {telefon_agentie}
Semnătură: ______________________ / {nume_agent} /

BENEFICIAR: {nume_client}, IDNP {idnp_client}
Adresă: {adresa_client}, telefon: {telefon_client}
Semnătură: ______________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Contract de servicii imobiliare (vânzător)',
            'type'    => 'service_seller',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 12 ─────────────────────────────────────────────────────────────────────
    private static function asistentaTranzactie(): array
    {
        $content = <<<'EOT'
CONTRACT NR. {numar_contract}
DE PRESTARE A SERVICIILOR
DE ASISTARE A TRANZACȚIEI IMOBILIARE

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE

PRESTATOR: {nume_agentie}, IDNO {idno_agentie},
adresa: {adresa_agentie}, telefon: {telefon_agentie}, e-mail: {email_agentie}.

și

BENEFICIAR: {nume_client}, IDNP {idnp_client},
domiciliat la: {adresa_client}, telefon: {telefon_client}, e-mail: {email_client}.

denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele.

2. OBIECTUL CONTRACTULUI

2.1. Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii organizatorice, informaționale și de asistare documentală a tranzacției imobiliare.

2.2. Tranzacția supusă asistării:
- Tip tranzacție: {tip_tranzactie} (vânzare-cumpărare / locațiune / alta)
- Tip obiect: {tip_proprietate}
- Adresă: {adresa_proprietate}
- Nr. cadastral: {numar_cadastral}
- Calitatea Beneficiarului: vânzător / cumpărător / locator / locatar / alta
- Preț estimat al tranzacției: {pret} {valuta}

2.3. Prezentul contract reglementează ASISTAREA tranzacției și NU înseamnă că Prestatorul este parte a tranzacției, notar, avocat, evaluator, bancă sau autoritate publică.

2.4. Prestatorul NU garantează încheierea tranzacției.

3. LISTA SERVICIILOR PRESTATORULUI

- analiza inițială a obiectului și documentelor;
- consultații pe parcursul tranzacției;
- coordonarea cu părțile, notarul, banca, evaluatorul, oficiul cadastral;
- pregătirea documentelor necesare tranzacției;
- asistarea la încheierea avansului / arvunei;
- asistarea la semnarea contractului principal;
- coordonarea predării-primirii imobilului;
- alte servicii: {alte_servicii}.

4. OBLIGAȚIILE PRESTATORULUI

- bună-credință;
- informare regulată a Beneficiarului;
- confidențialitate;
- coordonare profesionistă.

5. OBLIGAȚIILE BENEFICIARULUI

- prezentarea documentelor și informațiilor veridice;
- prezența la acțiunile programate;
- plata remunerației la termen.

6. DOCUMENTELE PREZENTATE DE BENEFICIAR

- act de identitate;
- document de proprietate;
- documente cadastrale;
- acordul soțului/soției / coproprietarilor (dacă se aplică);
- alte documente: {alte_documente}.

7. REMUNERAȚIA ȘI PLATA

7.1. Remunerația: {suma_fixa} {valuta} sau {comision_procent}% din valoarea tranzacției.
7.2. Termen de plată: {termen_plata}.
7.3. Modalitate: numerar / transfer bancar.

8. PREDAREA-PRIMIREA SERVICIILOR

8.1. Prin Act privind serviciile prestate.

9. LIMITE ALE RĂSPUNDERII PRESTATORULUI

9.1. Prestatorul NU răspunde pentru:
- refuzul celeilalte părți a tranzacției;
- acțiunile notarului / băncii / autorităților;
- circumstanțe ce nu țin de el.

10. CONFIDENȚIALITATE ȘI DATE PERSONALE

11. TERMENUL CONTRACTULUI

11.1. De la {data_inceput} până la {data_sfarsit}.

12. MODIFICARE ȘI REZILIERE

12.1. Cu notificare cu {zile_notificare} zile.

13. FORȚĂ MAJORĂ

14. SOLUȚIONAREA LITIGIILOR

14.1. Prin negocieri / instanța din RM.

15. DISPOZIȚII FINALE

15.1. Întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.

16. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

PRESTATOR: {nume_agentie}, IDNO {idno_agentie}
Adresă: {adresa_agentie}, telefon: {telefon_agentie}
Semnătură: ______________________ / {nume_agent} /

BENEFICIAR: {nume_client}, IDNP {idnp_client}
Adresă: {adresa_client}, telefon: {telefon_client}
Semnătură: ______________________ / {nume_client} /
EOT;

        return [
            'name'    => 'Contract de asistare a tranzacției imobiliare',
            'type'    => 'transaction_assist',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 13 ─────────────────────────────────────────────────────────────────────
    private static function contractMandat(): array
    {
        $content = <<<'EOT'
CONTRACT NR. {numar_contract}
DE MANDAT
PENTRU REPREZENTAREA INTERESELOR ÎN DOMENIUL IMOBILIAR

mun. {oras}
Data: {data_contractului}

1. PĂRȚILE

MANDANT: {nume_client}, IDNP {idnp_client},
domiciliat la: {adresa_client}, telefon: {telefon_client}, e-mail: {email_client}.

și

MANDATAR: {nume_agentie}, IDNO {idno_agentie},
adresa: {adresa_agentie}, telefon: {telefon_agentie}, e-mail: {email_agentie}.

denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele.

2. OBIECTUL CONTRACTULUI

2.1. Mandantul împuternicește, iar Mandatarul își asumă obligația de a efectua, în numele și interesul Mandantului, acțiuni juridice și/sau de fapt legate de obiectul imobiliar / tranzacția imobiliară, în limitele prezentului contract și, după caz, ale procurii.

2.2. Obiectul imobiliar:
- Tip: {tip_proprietate}
- Adresă: {adresa_proprietate}
- Nr. cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²

2.3. Mandatul se acordă pentru:
- pregătirea documentelor;
- obținerea de certificate, extrase, duplicate;
- depunerea documentelor în autoritățile publice;
- reprezentare în fața notarului / băncii / oficiului cadastral;
- alte scopuri: {alte_scopuri}.

3. VOLUMUL ÎMPUTERNICIRILOR MANDATARULUI

- depunerea cererilor și solicitărilor;
- primirea documentelor;
- semnarea documentelor în limitele împuternicirilor;
- reprezentarea în fața autorităților;
- alte împuterniciri: {alte_imputerniciri}.

4. OBLIGAȚIILE MANDATARULUI

- acționează cu bună-credință și în interesul Mandantului;
- raportează periodic Mandantului;
- nu cesionează împuternicirile fără acord scris (dacă se aplică);
- păstrează confidențialitatea.

5. OBLIGAȚIILE MANDANTULUI

- furnizează documente veridice;
- pune la dispoziție mijloacele necesare;
- achită remunerația la termen.

6. REMUNERAȚIA ȘI DECONTĂRILE

6.1. Remunerația Mandatarului: {suma_fixa} {valuta} / {comision_procent}%.
6.2. Compensarea cheltuielilor: la prezentarea documentelor justificative.
6.3. Termen de plată: {termen_plata}.

7. TERMENUL MANDATULUI

7.1. De la {data_inceput} până la {data_sfarsit}.
7.2. Mandatul poate fi prelungit prin acord scris al părților.

8. RAPORTUL MANDATARULUI ȘI PREDAREA DOCUMENTELOR

8.1. La sfârșitul mandatului, Mandatarul prezintă raport scris și transmite toate documentele obținute.

9. RĂSPUNDEREA PĂRȚILOR

9.1. Conform legislației Republicii Moldova și prezentului contract.

10. CONFIDENȚIALITATE ȘI DATE PERSONALE

11. ÎNCETAREA CONTRACTULUI

11.1. Prin acordul părților;
11.2. La inițiativa unei părți cu notificare scrisă cu {zile_notificare} zile;
11.3. Pentru alte temeiuri legale.

12. FORȚĂ MAJORĂ

13. SOLUȚIONAREA LITIGIILOR

13.1. Prin negocieri / instanța competentă din RM.

14. DISPOZIȚII FINALE

14.1. Întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.

15. RECHIZITELE ȘI SEMNĂTURILE PĂRȚILOR

MANDANT: {nume_client}, IDNP {idnp_client}
Adresă: {adresa_client}, telefon: {telefon_client}
Semnătură: ______________________ / {nume_client} /

MANDATAR: {nume_agentie}, IDNO {idno_agentie}
Adresă: {adresa_agentie}, telefon: {telefon_agentie}
Semnătură: ______________________ / {nume_agent} /
EOT;

        return [
            'name'    => 'Contract de mandat imobiliar',
            'type'    => 'mandate',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }
}
