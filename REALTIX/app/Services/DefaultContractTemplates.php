<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\ContractTemplate;

/**
 * Setul implicit de șabloane REALTIX (14 documente — traduse RU → RO).
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
            self::contractInchiriere(),
        ];
    }

    // 01 ─────────────────────────────────────────────────────────────────────
    private static function avans(): array
    {
        // Aspect vizual conform `Sablon_Acord_de_avans.pdf` — folosește aceleași
        // convenții ca șablonul de închiriere: header bleumarin pe tabele,
        // `## ALL CAPS` ca antet de tabel, `@sig` pentru grila de semnături.
        $content = <<<'EOT'
încheiat astăzi, {data_contractului}, în {oras}, Republica Moldova

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", am convenit încheierea prezentului Acord de avans cu privire la următoarele:

PĂRȚILE CONTRACTANTE

PARTEA 1 (CUMPĂRĂTOR / PERSOANĂ CARE ACHITĂ AVANSUL)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}

PARTEA 2 (VÂNZĂTOR / PERSOANĂ CARE PRIMEȘTE AVANSUL)
- Nume, Prenume: {nume_vanzator}
- IDNP: {idnp_vanzator}
- Domiciliu: {adresa_vanzator}
- Telefon: {telefon_vanzator}

1. OBIECTUL ACORDULUI

1.1 Partea 1 transmite Părții 2 o sumă de bani cu titlu de AVANS, în contul tranzacției viitoare având ca obiect imobilul descris în tabelul de mai jos. Condițiile concrete ale tranzacției sunt sintetizate astfel:

OBIECTUL TRANZACȚIEI
- Adresa imobilului: {adresa_proprietate}
- Tip imobil: {tip_proprietate}
- Număr cadastral: {numar_cadastral}
- Valoare totală imobil: {pret} {valuta}
- Suma avansului: {suma_avans} {valuta}
- Modalitate de plată: {modalitate_plata}
- Data plății avansului: {data_plata_avans}
- Termen încheiere contract: {data_contract_principal}

1.2 Suma indicată la rubrica „Suma avansului" se consideră primită de Partea 2 la data semnării prezentului Acord, în condițiile prevăzute la rubrica „Modalitate de plată".

2. ÎNCHEIEREA CONTRACTULUI PRINCIPAL

2.1 Părțile se obligă să încheie contractul principal de vânzare-cumpărare al imobilului în formă autentică, la notar, până la data prevăzută în tabelul de la pct. 1.1.

2.2 La momentul încheierii contractului principal, suma achitată cu titlu de avans se include în prețul total al imobilului.

3. EFECTELE NEÎNCHEIERII CONTRACTULUI

3.1 În cazul în care contractul principal nu se încheie din motive neimputabile niciuneia dintre Părți, suma transmisă cu titlu de avans se restituie integral Părții 1, în termen de 5 zile.

3.2 În cazul în care contractul principal nu se încheie din culpa Părții 2, aceasta restituie Părții 1 dublul sumei primite ca avans, în termen de 10 zile.

3.3 În cazul în care contractul principal nu se încheie din culpa Părții 1, suma transmisă rămâne în beneficiul Părții 2 cu titlu de despăgubire.

3.4 Părțile pot conveni în scris alte modalități de soluționare, derogatorii de la prezentul articol.

4. DISPOZIȚII FINALE

4.1 Prezentul Acord este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare Parte.

4.2 Modificările Acordului se fac prin acte adiționale semnate de ambele Părți.

4.3 Litigiile se soluționează pe cale amiabilă, iar în caz contrar, în instanța de judecată competentă din Republica Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PARTEA 1 | PARTEA 2
- Nume, Prenume: {nume_client} | Nume, Prenume: {nume_vanzator}
- IDNP: {idnp_client} | IDNP: {idnp_vanzator}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Acord_de_arvuna.pdf`.
        $content = <<<'EOT'
încheiat astăzi, {data_contractului}, în {oras}, Republica Moldova

@callout Notă juridică: Arvuna se distinge de avans. Conform art. 631 din Codul civil al Republicii Moldova, în cazul neîncheierii contractului principal: dacă renunță Partea care a dat arvuna, aceasta o pierde; dacă renunță Partea care a primit-o, ea restituie dublul sumei. Dacă acordul nu se realizează din motive neimputabile, arvuna se restituie integral.

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", am convenit încheierea prezentului Acord de arvună cu privire la următoarele:

PĂRȚILE CONTRACTANTE

PARTEA 1 (CUMPĂRĂTOR — PARTEA CARE DĂ ARVUNA)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}

PARTEA 2 (VÂNZĂTOR — PARTEA CARE PRIMEȘTE ARVUNA)
- Nume, Prenume: {nume_vanzator}
- IDNP: {idnp_vanzator}
- Domiciliu: {adresa_vanzator}
- Telefon: {telefon_vanzator}

1. OBIECTUL ACORDULUI

1.1 Partea 1 transmite Părții 2 o sumă de bani cu titlu de ARVUNĂ, în contul tranzacției viitoare având ca obiect imobilul descris în tabelul de mai jos. Condițiile concrete ale tranzacției sunt sintetizate astfel:

OBIECTUL TRANZACȚIEI
- Adresa imobilului: {adresa_proprietate}
- Tip imobil: {tip_proprietate}
- Număr cadastral: {numar_cadastral}
- Valoare totală imobil: {pret} {valuta}
- Suma arvunei: {suma_arvuna} {valuta}
- Modalitate de plată: {modalitate_plata}
- Data plății arvunei: {data_plata_arvuna}
- Termen încheiere contract principal: {data_contract_principal}

1.2 Suma indicată la rubrica „Suma arvunei" se consideră primită de Partea 2 la data semnării prezentului Acord, în condițiile prevăzute la rubrica „Modalitate de plată".

1.3 Arvuna are dublu rol: confirmă încheierea acordului dintre Părți cu privire la tranzacția viitoare și garantează executarea obligației de a încheia contractul principal în condițiile convenite.

2. ÎNCHEIEREA CONTRACTULUI PRINCIPAL

2.1 Părțile se obligă să încheie contractul principal de vânzare-cumpărare a imobilului în formă autentică, la notar, până la data prevăzută în tabelul de la pct. 1.1.

2.2 La momentul încheierii contractului principal, suma achitată cu titlu de arvună se include în prețul total al imobilului.

3. EFECTELE NEÎNCHEIERII CONTRACTULUI

3.1 În conformitate cu art. 631 din Codul civil al Republicii Moldova, efectele neîncheierii contractului principal se stabilesc după cum urmează:

3.2 În cazul în care contractul principal nu se încheie din culpa Părții 1 (cea care a dat arvuna), suma transmisă cu titlu de arvună rămâne în beneficiul Părții 2.

3.3 În cazul în care contractul principal nu se încheie din culpa Părții 2 (cea care a primit arvuna), aceasta este obligată să restituie Părții 1 dublul sumei primite cu titlu de arvună, în termen de 10 zile de la data scadenței prevăzute pentru încheierea contractului principal.

3.4 În cazul în care contractul principal nu se încheie din motive neimputabile niciuneia dintre Părți (forță majoră, imposibilitate obiectivă, acordul Părților), arvuna se restituie integral Părții 1, în termen de 5 zile.

3.5 Părțile pot conveni în scris alte modalități de soluționare a efectelor neîncheierii contractului, derogatorii de la prezentul articol.

4. DISPOZIȚII FINALE

4.1 Prezentul Acord este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare Parte.

4.2 Modificările Acordului se fac prin acte adiționale semnate de ambele Părți.

4.3 Litigiile se soluționează pe cale amiabilă, iar în caz contrar, în instanța de judecată competentă din Republica Moldova.

4.4 Pentru aspectele nereglementate prin prezentul Acord, Părțile se vor conduce după prevederile Codului civil al Republicii Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PARTEA 1 (a dat arvuna) | PARTEA 2 (a primit arvuna)
- Nume, Prenume: {nume_client} | Nume, Prenume: {nume_vanzator}
- IDNP: {idnp_client} | IDNP: {idnp_vanzator}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
EOT;
        // Sentinel — keep the closing block recognizable to future edits.
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
        // Aspect vizual conform `Sablon_Recipisa_documente.pdf`.
        $content = <<<'EOT'
@title RECIPISĂ
@subtitle privind primirea documentelor
@subtitle întocmită astăzi, {data_contractului}, în {oras}, Republica Moldova

Eu, subsemnatul(a), identificat(ă) în tabelul de mai jos, denumit(ă) în continuare „Primitor",

PRIMITOR (CEL CARE PRIMEȘTE ȘI EMITE RECIPISA)
- Nume, Prenume: {nume_primitor}
- IDNP: {idnp_primitor}
- Domiciliu: {adresa_primitor}
- Telefon: {telefon_primitor}

prin prezenta CONFIRM că am primit de la persoana identificată în tabelul de mai jos, denumită în continuare „Predător",

PREDĂTOR (CEL CARE A TRANSMIS DOCUMENTELE)
- Nume, Prenume: {nume_predator}
- IDNP: {idnp_predator}
- Domiciliu: {adresa_predator}
- Telefon: {telefon_predator}

următoarele documente, referitoare la cauza descrisă mai jos:

CAUZA DOCUMENTELOR PRIMITE
- Tip cauză: {tip_cauza}
- Adresa imobilului (dacă e cazul): {adresa_proprietate}
- Număr cadastral (dacă e cazul): {numar_cadastral}

1. LISTA DOCUMENTELOR PRIMITE

@empty-grid 5 | Nr. | Denumirea documentului | Forma | Nr. exemplare

@note Notă: la rubrica „Forma" se indică una din variantele: original / copie simplă / copie legalizată.

2. DECLARAȚII ALE PRIMITORULUI

2.1 Confirm că am primit documentele enumerate în tabelul de la pct. 1, în starea, forma și numărul de exemplare indicate.

2.2 Documentele au fost primite în volum complet, nu am pretenții cu privire la transmiterea acestora.

2.3 Mă oblig să folosesc documentele primite exclusiv în scopul pentru care au fost transmise și să le restitui Predătorului la cerere, dacă au fost primite în original.

2.4 Prezenta Recipisă este întocmită în două exemplare cu aceeași forță juridică, câte unul pentru fiecare parte.

SEMNĂTURI

@sig PRIMITOR (obligatoriu) | PREDĂTOR (opțional — confirmare)
- Nume, Prenume: {nume_primitor} | Nume, Prenume: {nume_predator}
- IDNP: {idnp_primitor} | IDNP: {idnp_predator}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura

@note Semnătura Predătorului este opțională și are doar valoare de confirmare a transmiterii. Recipisa produce efecte juridice prin semnătura Primitorului, care recunoaște astfel primirea documentelor.
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
        // Aspect vizual conform `Sablon_Act_predare_primire.pdf`.
        $content = <<<'EOT'
întocmit astăzi, {data_contractului}, în {oras}, Republica Moldova

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", am întocmit prezentul Act prin care se constată predarea și, respectiv, primirea documentelor enumerate mai jos, în următoarele condiții:

PĂRȚILE

PARTEA PREDĂTOARE (CEA CARE TRANSMITE DOCUMENTELE)
- Nume, Prenume: {nume_predator}
- IDNP: {idnp_predator}
- Domiciliu: {adresa_predator}
- Telefon: {telefon_predator}

PARTEA PRIMITOARE (CEA CARE PREIA DOCUMENTELE)
- Nume, Prenume: {nume_primitor}
- IDNP: {idnp_primitor}
- Domiciliu: {adresa_primitor}
- Telefon: {telefon_primitor}

1. OBIECTUL ACTULUI

1.1 Partea predătoare a transmis, iar Partea primitoare a primit, documentele enumerate la pct. 2, referitoare la cauza descrisă în tabelul de mai jos:

OBIECTUL TRANSMITERII
- Tip dosar / cauză: {tip_dosar}
- Adresa imobilului (dacă e cazul): {adresa_proprietate}
- Număr cadastral (dacă e cazul): {numar_cadastral}
- Scopul transmiterii: {scop_transmitere}

2. LISTA DOCUMENTELOR TRANSMISE

Părțile constată transmiterea următoarelor documente:

@empty-grid 5 | Nr. | Denumirea documentului | Forma | Nr. exemplare

@note Notă: la rubrica „Forma" se indică una din variantele: original / copie simplă / copie legalizată.

3. DECLARAȚII ȘI DISPOZIȚII FINALE

3.1 Partea primitoare confirmă primirea documentelor enumerate în tabelul de la pct. 2, în starea și forma indicate.

3.2 Părțile confirmă că la momentul semnării prezentului Act nu au pretenții reciproce cu privire la transmiterea documentelor.

3.3 Partea primitoare se obligă să folosească documentele exclusiv în scopul indicat la pct. 1 și să le restituie la cerere, dacă au fost transmise în original.

3.4 Prezentul Act este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare Parte.

SEMNĂTURILE PĂRȚILOR

@sig PARTEA PREDĂTOARE | PARTEA PRIMITOARE
- Nume, Prenume: {nume_predator} | Nume, Prenume: {nume_primitor}
- IDNP: {idnp_predator} | IDNP: {idnp_primitor}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Notificare_reziliere.pdf`.
        $content = <<<'EOT'
emisă astăzi, {data_contractului}, în {oras}, Republica Moldova

PĂRȚILE

DE LA (EXPEDITOR — PARTEA CARE NOTIFICĂ REZILIEREA)
- Nume, Prenume: {nume_expeditor}
- IDNP: {idnp_expeditor}
- Adresa: {adresa_expeditor}
- Telefon: {telefon_expeditor}
- E-mail: {email_expeditor}

CĂTRE (DESTINATAR — PARTEA NOTIFICATĂ)
- Nume, Prenume: {nume_destinatar}
- IDNP: {idnp_destinatar}
- Adresa: {adresa_destinatar}
- Telefon: {telefon_destinatar}
- E-mail: {email_destinatar}

1. OBIECTUL NOTIFICĂRII

1.1 Prin prezenta, Expeditorul notifică Destinatarul cu privire la rezilierea contractului identificat în tabelul de mai jos:

CONTRACTUL VIZAT
- Tip contract: {tip_contract}
- Număr contract: {numar_contract}
- Data încheierii: {data_contract_initial}
- Obiectul contractului: {obiect_contract}
- Data rezilierii: {data_reziliere}
- Termen decontări reciproce: {data_decontare}

2. MOTIVELE REZILIERII

2.1 Rezilierea este solicitată în baza următoarelor motive: {motive_reziliere}

2.2 Rezilierea operează în condițiile prevăzute de contract și de legislația aplicabilă a Republicii Moldova.

3. EFECTELE REZILIERII

3.1 Contractul se consideră reziliat începând cu data indicată la rubrica „Data rezilierii" din tabelul de la pct. 1.1.

3.2 Părțile sunt obligate să efectueze decontările reciproce, să restituie bunurile, documentele și mijloacele bănești datorate (dacă există asemenea obligații) până la data indicată la rubrica „Termen decontări reciproce".

3.3 Drepturile și obligațiile născute anterior datei rezilierii rămân în vigoare și se execută în continuare.

4. DISPOZIȚII FINALE

4.1 Prezenta Notificare este întocmită în două exemplare cu aceeași forță juridică, dintre care unul se transmite Destinatarului, iar al doilea rămâne la Expeditor.

4.2 În cazul neexecutării obligațiilor de decontare în termenul indicat, Expeditorul își rezervă dreptul de a se adresa instanței de judecată competente din Republica Moldova.

4.3 Prezenta Notificare nu necesită răspuns scris pentru a-și produce efectele juridice.

SEMNĂTURA EXPEDITORULUI

@sig EXPEDITOR
- Nume, Prenume: {nume_expeditor}
- IDNP: {idnp_expeditor}
- Data semnării: {data_contractului}
- Semnătura

@center CONFIRMARE DE PRIMIRE

@note Se completează de către Destinatar la primirea prezentei Notificări. Semnarea acestei rubrici atestă exclusiv primirea documentului și nu reprezintă acceptarea conținutului.

- Numele destinatarului: {nume_destinatar_primire}
- Data primirii: {data_primire}
- Modalitate de transmitere: {modalitate_transmitere}
- Semnătura destinatarului: {semnatura_destinatar}
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
        // Aspect vizual conform `Sablon_Act_servicii.pdf`.
        $content = <<<'EOT'
Nr. {numar_act} · emis astăzi, {data_contractului}, în {oras}

la Contractul nr. {numar_contract} din data de {data_contract_initial}

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au întocmit prezentul Act cu privire la următoarele:

1. PĂRȚILE

PRESTATOR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO / nr. înregistrare: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

BENEFICIAR (PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP / serie act identitate: {idnp_client}
- Eliberat de: {act_identitate_eliberat}
- Adresa de domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

2. TEMEIUL ÎNTOCMIRII ACTULUI

2.1 Prezentul Act este întocmit în executarea contractului identificat în antetul documentului. Perioada de prestare a serviciilor este următoarea:

PERIOADA PRESTĂRII SERVICIILOR
- De la: {data_inceput}
- Până la: {data_sfarsit}

3. LISTA SERVICIILOR PRESTATE

Prestatorul a prestat Beneficiarului următoarele servicii (se bifează cele aplicabile):
☐ consultații cu privire la tranzacția imobiliară
☐ selecția / căutarea obiectului imobiliar
☐ căutarea cumpărătorului
☐ plasarea anunțurilor publicitare
☐ organizarea și efectuarea vizionărilor
☐ efectuarea negocierilor
☐ verificarea completivității documentelor
☐ asistare la transmiterea avansului / arvunei
☐ asistare la notar
☐ coordonarea cu banca / evaluatorul / oficiul cadastral
☐ pregătirea și transmiterea documentelor
☐ alte servicii: {alte_servicii}

4. REZULTATUL SERVICIILOR PRESTATE

4.1 În urma prestării serviciilor (se bifează cele aplicabile):
☐ a fost găsit cumpărător / obiect imobiliar
☐ au fost organizate vizionări ale obiectului
☐ au fost efectuate negocieri între părți
☐ a fost pregătit setul de documente pentru tranzacție
☐ a fost asistată tranzacția de vânzare-cumpărare / locațiune / alta
☐ a fost semnat contractul: {contract_semnat}
☐ alt rezultat: {alt_rezultat}

4.2 Obiectul imobiliar / tranzacția la care se referă serviciile:

OBIECTUL IMOBILIAR / TRANZACȚIA
- Tip obiect: {tip_proprietate}
- Adresă obiect: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Tip tranzacție: {tip_tranzactie}
- Preț tranzacție: {pret} {valuta}

5. COSTUL SERVICIILOR PRESTATE

5.1 Costul serviciilor prestate pentru perioada indicată și modalitatea de achitare sunt sintetizate în tabelul de mai jos:

ELEMENT | SUMĂ / DETALII
- Costul total al serviciilor: {suma_totala} {valuta}
- Suma achitată anterior: {suma_achitata} {valuta}
- Suma de plată conform prezentului Act: {suma_de_plata} {valuta}
- Termen de plată: {termen_plata}
- Modalitate de plată: {modalitate_plata}

6. PRETENȚIILE PĂRȚILOR

6.1 Beneficiarul confirmă că serviciile au fost prestate (se bifează una):
☐ în volum complet
☐ parțial: {prestare_partiala}
☐ cu observații: {observatii}

6.2 În lipsa observațiilor, Beneficiarul confirmă că nu are pretenții cu privire la volumul, calitatea și termenele serviciilor prestate.

7. DISPOZIȚII FINALE

7.1 Prezentul Act este întocmit în {numar_exemplare} exemplare cu aceeași forță juridică.

7.2 Prezentul Act este parte integrantă a contractului indicat în pct. 2 și nu modifică clauzele acestuia decât în limitele constatărilor de mai sus.

7.3 Litigiile decurgând din prezentul Act se soluționează pe cale amiabilă, iar în caz contrar, în instanța de judecată competentă din Republica Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PRESTATOR | BENEFICIAR
- Denumire: {nume_agentie} | Nume, Prenume: {nume_client}
- IDNO: {idno_agentie} | IDNP: {idnp_client}
- Reprezentant: {reprezentant_agentie} |
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Contract_exclusiv_vanzare.pdf`.
        $content = <<<'EOT'
@title CONTRACT EXCLUSIV DE SERVICII IMOBILIARE
@subtitle pentru vânzarea imobilului
@subtitle Nr. {numar_contract} · încheiat astăzi, {data_contractului}, în {oras}

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele:

1. PĂRȚILE CONTRACTANTE

PRESTATOR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

BENEFICIAR (PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP / serie act identitate: {idnp_client}
- Eliberat de: {act_identitate_eliberat}
- Adresa de domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

2. OBIECTUL CONTRACTULUI

2.1 Beneficiarul împuternicește, iar Prestatorul își asumă obligația, în condiții de exclusivitate, să presteze serviciile imobiliare necesare vânzării obiectului descris în tabelul de mai jos:

OBIECTUL VÂNZĂRII
- Tip obiect: {tip_proprietate}
- Adresa: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Etaj / nr. etaje: {etaj}
- Număr camere: {numar_camere}
- Document drept proprietate: {document_proprietate}

2.2 Prestatorul se obligă să caute cumpărător, să promoveze obiectul, să organizeze vizionări, să poarte negocieri și să asigure asistarea tranzacției.

2.3 Beneficiarul acordă Prestatorului dreptul EXCLUSIV de a presta serviciile de vânzare a obiectului pe durata prezentului contract.

2.4 Prezentul contract NU este contract de vânzare-cumpărare, contract preliminar sau procură de înstrăinare.

3. CONDIȚIILE DE EXCLUSIVITATE

3.1 Pe durata prezentului contract, Beneficiarul se obligă:
* să nu încheie contracte similare cu alți agenți / agenții / intermediari pentru același obiect;
* să nu încredințeze terților căutarea cumpărătorului în condiții care contravin prezentului contract;
* să nu plaseze de sine stătător anunțuri de vânzare fără acordul Prestatorului;
* să comunice imediat Prestatorului fiecare adresare a unui potențial cumpărător;
* să direcționeze toate persoanele interesate către Prestator;
* să nu poarte negocieri de înstrăinare a obiectului ocolind Prestatorul, dacă cumpărătorul a fost identificat prin acțiunile Prestatorului.

3.2 Dacă Beneficiarul găsește cumpărătorul de sine stătător în perioada de valabilitate a contractului, modalitatea de plată a remunerației Prestatorului se stabilește astfel: {clauza_cumparator_propriu}.

3.3 Dacă tranzacția este încheiată cu o persoană care a fost atrasă de Prestator, a primit informații despre obiect prin Prestator, a vizionat obiectul prin Prestator, a purtat negocieri prin Prestator, sau a fost înregistrată în registrul de adresări / lista de vizionări / CRM-ul Prestatorului — remunerația Prestatorului se achită conform prezentului contract.

3.4 Termenul de post-acțiune a exclusivității după încetarea contractului este stabilit în tabelul de la pct. 10.

4. LISTA SERVICIILOR PRESTATORULUI

Prestatorul se obligă să presteze următoarele servicii (se bifează cele aplicabile):
☐ analiza valorii de piață a obiectului
☐ consultații pentru pregătirea obiectului în vederea vânzării
☐ foto- și video-realizare a obiectului
☐ pregătirea materialelor publicitare
☐ plasarea anunțurilor pe site-uri, rețele sociale, baze de date partenere
☐ procesarea adresărilor primite
☐ negocieri cu potențialii cumpărători
☐ organizarea și efectuarea vizionărilor
☐ verificarea completivității documentelor
☐ coordonarea pregătirii avansului / arvunei / acordurilor preliminare
☐ asistarea tranzacției la notar, bancă, evaluator
☐ alte servicii: {alte_servicii}

5. OBLIGAȚIILE PRESTATORULUI

5.1 Să acționeze cu bună-credință și diligență în interesele Beneficiarului.

5.2 Să depună eforturi pentru găsirea cumpărătorului în condițiile convenite.

5.3 Să informeze periodic Beneficiarul cu privire la executarea contractului.

5.4 Să coordoneze cu Beneficiarul vizionările obiectului.

5.5 Să respecte confidențialitatea datelor personale ale Beneficiarului.

5.6 La cererea Beneficiarului, să prezinte raport scris despre activitatea desfășurată.

6. OBLIGAȚIILE BENEFICIARULUI

6.1 Să prezinte informații veridice despre obiect și documentele aferente.

6.2 Să prezinte Prestatorului următoarele documente (se bifează cele aplicabile):
☐ act de identitate
☐ document care confirmă dreptul de proprietate
☐ documente cadastrale / de înregistrare
☐ acordul soțului / soției
☐ acordul coproprietarilor / reprezentanților
☐ alte documente: {alte_documente}

6.3 Să asigure accesul la obiect pentru vizionări conform graficului convenit.

6.4 Să nu efectueze acțiuni ce încalcă condițiile de exclusivitate.

6.5 Să comunice imediat Prestatorului despre:
* modificarea prețului obiectului;
* modificarea intenției de a vinde obiectul;
* existența grevărilor, litigiilor, sechestrelor, drepturilor terților;
* orice adresări directe ale persoanelor interesate.

6.6 Să achite serviciile Prestatorului conform prezentului contract.

7. PREȚUL OBIECTULUI ȘI CONDIȚIILE DE VÂNZARE

7.1 Prețul de ofertă și condițiile de vânzare convenite sunt prezentate în tabelul de mai jos:

PREȚUL ȘI CONDIȚIILE DE VÂNZARE
- Preț de ofertă: {pret} {valuta}
- Preț minim admis: {pret_minim} {valuta}
- Formă de plată: {forma_plata}
- Eliberarea obiectului: {eliberare_obiect}
- Transmiterea mobilierului / tehnicii: {transmitere_mobilier}
- Alte condiții: {alte_conditii}

8. REMUNERAȚIA PRESTATORULUI

8.1 Remunerația Prestatorului și modalitatea de plată sunt prezentate în tabelul de mai jos:

REMUNERAȚIA PRESTATORULUI
- Sumă fixă (dacă se aplică): {suma_fixa} {valuta}
- Procent din prețul vânzării: {comision_procent}%
- Altă modalitate: {alta_modalitate_calcul}
- Termen de plată: {termen_plata}
- Modalitate de plată: {modalitate_plata}

8.2 Remunerația este datorată în cazul:
* încheierii contractului de vânzare-cumpărare / înstrăinare;
* semnării acordului preliminar cu cumpărătorul;
* depunerii avansului / arvunei;
* încheierii tranzacției cu cumpărătorul atras de Prestator în perioada contractuală sau de post-acțiune (pct. 10).

9. CONFIRMAREA ACȚIUNILOR PRESTATORULUI

9.1 Prestarea serviciilor poate fi confirmată prin: act privind serviciile prestate, liste de vizionări, corespondență scrisă sau electronică, rapoarte periodice, registru de adresări, sistem CRM, publicații publicitare în mediul online sau tipărit.

10. TERMENUL CONTRACTULUI

10.1 Contractul intră în vigoare la data semnării. Termenele și condițiile asociate sunt prezentate în tabelul de mai jos:

TERMENUL CONTRACTULUI
- Data începerii: {data_inceput}
- Data expirării: {data_sfarsit}
- Termen post-acțiune exclusivitate: {durata_post_actiune} zile calendaristice
- Termen de preaviz reziliere: {zile_notificare} zile
- Penalitate încălcare exclusivitate: {suma_penalitate}
- Termen notificare forță majoră: {termen_notificare_fm} zile de la apariție
- Nr. exemplare: {numar_exemplare}

10.2 Prelungirea contractului: {modalitate_prelungire}.

11. ÎNCETAREA ANTICIPATĂ ȘI SANCȚIUNI

11.1 Contractul poate fi reziliat:
* prin acordul scris al părților;
* la inițiativa unei părți, cu notificare scrisă cu termenul de preaviz indicat în tabelul de la pct. 10;
* pentru alte temeiuri prevăzute de legislația Republicii Moldova.

11.2 În caz de încălcare a exclusivității de către Beneficiar, se aplică una sau mai multe dintre măsurile de mai jos (cumulativ, după caz):
* plata integrală sau parțială a remunerației Prestatorului conform pct. 8;
* compensarea cheltuielilor confirmate prin documente justificative;
* plata penalității indicate în tabelul de la pct. 10;
* alte sancțiuni convenite în scris.

12. RĂSPUNDEREA PĂRȚILOR

12.1 Pentru neîndeplinirea obligațiilor, părțile răspund conform legislației Republicii Moldova și prezentului contract.

12.2 Prestatorul nu răspunde pentru: refuzul cumpărătorului, modificările pieței imobiliare, informațiile false transmise de Beneficiar, acțiunile notarului / băncii / autorităților publice, precum și pentru alte circumstanțe externe sferei sale de control.

12.3 Beneficiarul răspunde pentru veridicitatea documentelor și informațiilor transmise Prestatorului.

13. CONFIDENȚIALITATE ȘI DATE PERSONALE

13.1 Părțile se obligă să nu divulge informațiile cunoscute în cadrul executării prezentului contract, cu excepția cazurilor prevăzute de lege.

13.2 Beneficiarul își exprimă consimțământul pentru prelucrarea datelor sale personale în volumul necesar executării contractului, în conformitate cu Legea nr. 133/2011 privind protecția datelor cu caracter personal.

14. FORȚĂ MAJORĂ

14.1 Părțile sunt eliberate de răspundere în cazul apariției unor circumstanțe de forță majoră (calamități naturale, război, stare de urgență, acte ale autorităților etc.).

14.2 Partea afectată notifică cealaltă parte în termenul indicat în tabelul de la pct. 10, sub sancțiunea decăderii din dreptul de a invoca forța majoră.

15. SOLUȚIONAREA LITIGIILOR

15.1 Litigiile se soluționează prioritar prin negocieri directe între părți.

15.2 În lipsa unui acord, litigiul se examinează în instanța de judecată competentă din Republica Moldova.

16. DISPOZIȚII FINALE

16.1 Prezentul contract este întocmit în numărul de exemplare indicat în tabelul de la pct. 10, cu aceeași forță juridică, câte unul pentru fiecare parte.

16.2 Anexele la contract (dacă există) sunt parte integrantă a acestuia:
☐ Anexa nr. 1 — fișa detaliată a obiectului
☐ Anexa nr. 2 — lista documentelor transmise
☐ Anexa nr. 3 — condițiile de promovare publicitară
☐ Anexa nr. 4 — graficul vizionărilor
☐ Anexa nr. 5 — forma raportului Prestatorului

16.3 Modificările prezentului contract se fac prin acte adiționale semnate de ambele părți.

SEMNĂTURILE PĂRȚILOR

@sig PRESTATOR | BENEFICIAR
- Denumire: {nume_agentie} | Nume, Prenume: {nume_client}
- IDNO: {idno_agentie} | IDNP: {idnp_client}
- Reprezentant: {reprezentant_agentie} |
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Procura_reprezentare.pdf`.
        $content = <<<'EOT'
@title PROCURĂ
@subtitle pentru reprezentarea intereselor
@subtitle emisă astăzi, {data_contractului}, în {oras}, Republica Moldova

@callout Notă juridică: Procura pentru încheierea actelor juridice care necesită formă autentică (notarială) — în special înstrăinarea sau dobândirea imobilelor — trebuie autentificată la notar (art. 1033 alin. (2) Cod civil RM). Prezenta procură, dacă include împuterniciri ce depășesc simpla reprezentare administrativă, urmează a fi prezentată la notar pentru autentificare.

Eu, subsemnatul(a), identificat(ă) în tabelul de mai jos, denumit(ă) în continuare „Mandant",

MANDANT (CEL CARE ÎMPUTERNICEȘTE)
- Nume, Prenume: {nume_mandant}
- IDNP: {idnp_mandant}
- Data nașterii: {data_nasterii_mandant}
- Act de identitate: {act_identitate_mandant}
- Domiciliu: {adresa_mandant}
- Telefon: {telefon_mandant}

prin prezenta procură ÎMPUTERNICESC persoana identificată în tabelul de mai jos, denumită în continuare „Mandatar",

MANDATAR (CEL ÎMPUTERNICIT)
- Nume, Prenume: {nume_mandatar}
- IDNP: {idnp_mandatar}
- Data nașterii: {data_nasterii_mandatar}
- Act de identitate: {act_identitate_mandatar}
- Domiciliu: {adresa_mandatar}
- Telefon: {telefon_mandatar}

1. OBIECTUL PROCURII

1.1 Mandatarul este împuternicit să reprezinte interesele Mandantului în chestiunile legate de cauza descrisă în tabelul de mai jos:

OBIECTUL PROCURII
- Tip cauză: {tip_cauza}
- Adresa imobilului (dacă e cazul): {adresa_proprietate}
- Număr cadastral (dacă e cazul): {numar_cadastral}
- Descriere obiect: {descriere_obiect}

2. ÎMPUTERNICIRI ACORDATE

Mandatarul este împuternicit să exercite, în numele și pe contul Mandantului, următoarele acțiuni (se bifează cele aplicabile):

@subhead Împuterniciri administrative de bază:
☐ să depună cereri, solicitări și să primească documente
☐ să reprezinte interesele în autoritățile publice, instituții și organizații
☐ să semneze documentele necesare în limitele împuternicirilor acordate
☐ să primească certificate, extrase și alte documente
☐ să obțină informații, copii și duplicate de la registre publice și private
☐ să achite taxe, contribuții și alte plăți datorate în legătură cu cauza

@subhead Împuterniciri extinse (necesită autentificare notarială):
☐ să încheie, modifice și să rezilieze contracte privind imobilul
☐ să semneze contractul de vânzare-cumpărare al imobilului
☐ să semneze contractul de închiriere / locațiune al imobilului
☐ să primească sume de bani provenite din tranzacțiile cu imobilul
☐ să înregistreze drepturile la oficiul cadastral
☐ să reprezinte interesele în instanțele de judecată
☐ alte împuterniciri: {alte_imputerniciri}

3. TERMENUL ȘI DREPTUL DE SUBSTITUIRE

3.1 Termenul de valabilitate al prezentei procuri și dreptul de substituire al Mandatarului sunt prezentate în tabelul de mai jos:

TERMENUL ȘI DREPTUL DE SUBSTITUIRE
- Data emiterii: {data_contractului}
- Termen de valabilitate: {data_expirare_procura}
- Drept de substituire: {drept_substituire}
- Procura este autentificată notarial: {autentificare_notariala}

3.2 În cazul neindicării termenului, procura este valabilă timp de un an de la data emiterii, conform art. 1031 din Codul civil al Republicii Moldova. Termenul maxim de valabilitate este de 3 ani.

3.3 Dreptul de substituire permite Mandatarului să transmită împuternicirile primite unei terțe persoane, în condițiile prevăzute de art. 1037 din Codul civil al Republicii Moldova. În lipsa acordului expres, dreptul de substituire este considerat NEACORDAT.

4. ÎNCETAREA PROCURII

4.1 Prezenta procură încetează în următoarele cazuri:
☐ expirarea termenului de valabilitate
☐ revocarea de către Mandant, prin notificare scrisă
☐ renunțarea Mandatarului la împuterniciri
☐ decesul sau punerea sub interdicție a uneia dintre părți
☐ realizarea completă a obiectului procurii

4.2 Revocarea procurii se face în aceeași formă în care a fost încheiată (procura autentificată notarial se revocă tot în formă autentică). Mandantul este obligat să comunice revocarea atât Mandatarului, cât și terților cunoscuți care au tratat cu acesta.

5. DISPOZIȚII FINALE

5.1 Prezenta procură este semnată personal de Mandant și exprimă voința sa liberă și neviciată.

5.2 Mandatarul este obligat să acționeze cu bună-credință, în interesul Mandantului, și să dea seamă despre executarea împuternicirilor primite, la cererea Mandantului.

5.3 Pentru aspectele nereglementate prin prezenta procură, părțile se vor conduce după prevederile Codului civil al Republicii Moldova (art. 1030-1064).

SEMNĂTURI

@sig MANDANT (obligatoriu) | MANDATAR (opțional — confirmare)
- Nume, Prenume: {nume_mandant} | Nume, Prenume: {nume_mandatar}
- IDNP: {idnp_mandant} | IDNP: {idnp_mandatar}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura

@note Semnătura Mandatarului este opțională și are doar valoare de confirmare a acceptării împuternicirilor. Procura produce efecte juridice prin semnătura Mandantului (sau autentificarea notarială, după caz).

@boxed RUBRICĂ PENTRU AUTENTIFICARE NOTARIALĂ (SE COMPLETEAZĂ DE NOTAR)
Autentificat la {data_autentificare} de notarul {nume_notar}, licență nr. {licenta_notar}, biroul notarial din {birou_notar}.
Înregistrat în registrul actelor notariale sub nr. {nr_inregistrare_notar}.
Semnătura și ștampila notarului:
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
        // Aspect vizual conform `Sablon_Act_predare_imobil_inventar.pdf`.
        $content = <<<'EOT'
@title ACT DE PREDARE-PRIMIRE A IMOBILULUI
@subtitle cu inventarul bunurilor
@subtitle întocmit astăzi, {data_contractului}, în {oras}, Republica Moldova

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", am întocmit prezentul Act prin care se constată predarea și, respectiv, primirea imobilului descris mai jos, împreună cu bunurile aflate în acesta, în următoarele condiții:

PĂRȚILE

PARTEA PREDĂTOARE (CEA CARE TRANSMITE IMOBILUL)
- Nume, Prenume: {nume_predator}
- IDNP: {idnp_predator}
- Domiciliu: {adresa_predator}
- Telefon: {telefon_predator}

PARTEA PRIMITOARE (CEA CARE PREIA IMOBILUL)
- Nume, Prenume: {nume_primitor}
- IDNP: {idnp_primitor}
- Domiciliu: {adresa_primitor}
- Telefon: {telefon_primitor}

1. CONTEXTUL PREDĂRII

CONTEXTUL PREDĂRII
- Scopul transmiterii: {scop_transmitere}
- Temeiul predării: {temei_predare}

2. IMOBILUL TRANSMIS

2.1 Partea predătoare a transmis, iar Partea primitoare a preluat imobilul cu următoarele caracteristici:

IMOBILUL TRANSMIS
- Tip imobil: {tip_proprietate}
- Adresa: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Etaj / nr. etaje: {etaj}
- Număr camere: {numar_camere}
- Starea generală: {stare_imobil}
- Observații generale: {observatii_imobil}

3. INVENTARUL BUNURILOR DIN IMOBIL

3.1 În imobil se află și se transmit Părții primitoare următoarele bunuri (mobilier, electrocasnice, instalații sanitare, alte bunuri):

@empty-grid 5 | Nr. | Denumirea bunului | Cantitate | Stare | Observații

@note Notă: categorii uzuale — mobilier (canapea, masă, scaune), electrocasnice (frigider, aragaz, mașină de spălat), instalații sanitare (chiuvetă, cabină duș, baterii). La rubrica „Stare" se indică: nou / bun / uzat / defect / lipsă.

4. INDICAȚIILE CONTOARELOR LA MOMENTUL TRANSMITERII

4.1 La momentul predării-primirii imobilului, contoarele de utilități indicau următoarele valori:

INDICAȚIILE CONTOARELOR
- Energie electrică (kWh): {contor_electric}
- Gaz natural (m³): {contor_gaz}
- Apă rece (m³): {contor_apa_rece}
- Apă caldă (m³): {contor_apa_calda}
- Energie termică (Gcal): {contor_termic}
- Altele: {alte_contoare}

@note Notă: indicațiile servesc drept punct de referință pentru repartizarea facturilor de utilități. Părțile pot anexa fotografii ale contoarelor.

5. CHEILE PREDATE

5.1 Partea predătoare transmite Părții primitoare următoarele chei și mijloace de acces:

CHEILE ȘI MIJLOACELE DE ACCES
- Cheie ușa de la intrare: {chei_intrare} buc.
- Cheie încuietori suplimentare: {chei_suplimentare} buc.
- Cheie cutie poștală: {chei_postala} buc.
- Cheie / cartelă acces bloc: {chei_acces}
- Telecomenzi (poartă, garaj): {chei_telecomenzi}
- Alte chei: {alte_chei}

6. DECLARAȚII ȘI DISPOZIȚII FINALE

6.1 Părțile confirmă că imobilul, bunurile inventariate, indicațiile contoarelor și cheile au fost verificate împreună la momentul semnării prezentului Act.

6.2 Părțile confirmă lipsa pretențiilor reciproce cu privire la starea imobilului și a bunurilor transmise, cu excepția observațiilor menționate explicit în tabelele de mai sus.

6.3 Eventualele defecte sau lipsuri descoperite ulterior și care nu sunt menționate în prezentul Act se prezumă a fi imputabile Părții primitoare, dacă nu sunt comunicate Părții predătoare în termen de 7 zile de la data prezentului Act.

6.4 Prezentul Act este parte integrantă a contractului indicat la pct. 1 (Contextul predării) și nu poate fi interpretat separat de acesta.

6.5 Actul este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare Parte. Fotografiile imobilului, bunurilor și contoarelor pot fi anexate ca probe.

SEMNĂTURILE PĂRȚILOR

@sig PARTEA PREDĂTOARE | PARTEA PRIMITOARE
- Nume, Prenume: {nume_predator} | Nume, Prenume: {nume_primitor}
- IDNP: {idnp_predator} | IDNP: {idnp_primitor}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Contract_servicii_cumparator.pdf`.
        $content = <<<'EOT'
@title CONTRACT DE SERVICII IMOBILIARE
@subtitle pentru selecția și asistarea achiziționării imobilului
@subtitle Nr. {numar_contract} · încheiat astăzi, {data_contractului}, în {oras}

@callout Notă juridică: Prezentul contract reglementează serviciile de selecție și asistare pentru cumpărător. Prestatorul NU este parte a tranzacției finale, NU garantează încheierea achiziției și NU îl reprezintă juridic pe Beneficiar (pentru reprezentare juridică, vezi „Contract de mandat imobiliar").

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele:

1. PĂRȚILE

PRESTATOR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

BENEFICIAR (CUMPĂRĂTOR — PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

2. OBIECTUL CONTRACTULUI

2.1 Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii imobiliare orientate spre selecția obiectului și asistarea procedurii de achiziționare.

2.2 Prezentul contract NU este contract preliminar de vânzare-cumpărare și NU îl obligă pe Prestator să garanteze încheierea tranzacției — Prestatorul are obligație de mijloace, nu de rezultat.

3. CRITERIILE DE SELECȚIE A IMOBILULUI

3.1 Beneficiarul comunică Prestatorului următoarele criterii de selecție a obiectului dorit:

CRITERIILE DE SELECȚIE A IMOBILULUI
- Tip obiect: {tip_proprietate}
- Localitate / sector: {oras}, {sector}
- Număr camere: {numar_camere}
- Suprafață: {suprafata} m²
- Etaj preferat: {etaj}
- Buget maxim: {pret_maxim} {valuta}
- Stare imobil: {stare_imobil}
- Caracteristici suplimentare: {caracteristici}

3.2 Criteriile pot fi modificate ulterior prin acord scris al Părților.

4. LISTA SERVICIILOR PRESTATORULUI

Prestatorul se obligă să presteze următoarele servicii (se bifează cele aplicabile):
☐ selecția ofertelor pe piață conform criteriilor de la pct. 3
☐ prezentarea anunțurilor pertinente Beneficiarului
☐ coordonarea și efectuarea vizionărilor
☐ analiza juridică preliminară a obiectelor identificate
☐ consultații privind prețul și strategia de negociere
☐ purtarea negocierilor cu vânzătorii / reprezentanții acestora
☐ asistarea la încheierea acordului de avans / arvună
☐ asistarea la notar, bancă, evaluator
☐ alte servicii: {alte_servicii}

5. OBLIGAȚIILE PRESTATORULUI

5.1 Să acționeze cu bună-credință, diligență profesională și în interesul Beneficiarului.

5.2 Să selecteze obiecte conform criteriilor convenite la pct. 3, fără a propune oferte vădit nepotrivite.

5.3 Să informeze regulat Beneficiarul despre rezultatele căutării și ofertele identificate.

5.4 Să țină evidența obiectelor prezentate Beneficiarului în lista de vizionări / CRM intern.

5.5 Să respecte confidențialitatea datelor și informațiilor cunoscute.

6. OBLIGAȚIILE BENEFICIARULUI

6.1 Să prezinte criterii clare și veridice de selecție și să comunice orice modificare a acestora.

6.2 Să fie disponibil pentru vizionări la termenele rezonabile propuse de Prestator.

6.3 Să nu poarte negocieri ocolind Prestatorul cu vânzătorii / reprezentanții obiectelor prezentate de acesta.

6.4 Să comunice Prestatorului achiziția oricărui obiect prezentat de acesta, indiferent de canalul prin care s-a încheiat tranzacția.

6.5 Să achite remunerația Prestatorului conform pct. 7.

7. REMUNERAȚIA ȘI TERMEN

7.1 Remunerația Prestatorului, termenul contractului și alte condiții esențiale sunt prezentate în tabelul de mai jos:

REMUNERAȚIE ȘI TERMEN
- Sumă fixă (dacă se aplică): {suma_fixa} {valuta}
- Procent din prețul tranzacției: {comision_procent}%
- Termen de plată: {termen_plata}
- Modalitate de plată: {modalitate_plata}
- Data începerii: {data_inceput}
- Data expirării: {data_sfarsit}
- Termen preaviz reziliere: {zile_notificare} zile
- Termen post-acțiune obiecte prezentate: {durata_post_actiune} zile după expirare
- Nr. exemplare: {numar_exemplare}

8. INTERACȚIUNEA PE OBIECTE PREZENTATE

8.1 Lista obiectelor prezentate Beneficiarului de către Prestator se înregistrează în lista de vizionări sau CRM-ul Prestatorului, cu indicarea datei prezentării și a canalului de comunicare.

8.2 Dacă Beneficiarul achiziționează un obiect prezentat anterior de Prestator (chiar prin alt agent, direct de la vânzător sau prin altă cale), remunerația Prestatorului se datorează în întregime, conform pct. 7.

8.3 Această regulă se aplică și pe durata termenului de post-acțiune prevăzut în tabelul de la pct. 7, după expirarea sau încetarea contractului.

9. PREDAREA SERVICIILOR

9.1 Serviciile prestate se confirmă printr-un Act privind serviciile prestate, semnat de ambele Părți la încheierea tranzacției sau la solicitarea oricăreia dintre Părți.

10. RĂSPUNDERE ȘI LIMITE

10.1 Prestatorul verifică documentele prezentate de vânzători, dar nu garantează calitatea juridică deplină a obiectelor selectate — pentru aceasta se recomandă verificare suplimentară la notar.

10.2 Prestatorul nu răspunde pentru refuzul vânzătorilor de a încheia tranzacția, modificările pieței, sau alte circumstanțe externe sferei sale de control.

10.3 Beneficiarul răspunde pentru veridicitatea criteriilor și informațiilor transmise Prestatorului.

11. CONFIDENȚIALITATE ȘI DATE PERSONALE

11.1 Părțile se obligă să nu divulge informațiile cunoscute în cadrul executării prezentului contract.

11.2 Beneficiarul își exprimă consimțământul pentru prelucrarea datelor sale personale conform Legii nr. 133/2011.

12. FORȚĂ MAJORĂ

12.1 Părțile sunt eliberate de răspundere în cazul apariției unor circumstanțe de forță majoră, cu notificare scrisă în termen de 7 zile.

13. MODIFICAREA ȘI REZILIEREA

13.1 Contractul poate fi modificat prin acord scris al Părților sau reziliat cu termenul de preaviz indicat în tabelul de la pct. 7.

13.2 Rezilierea nu afectează obligația Beneficiarului de a achita remunerația pentru obiectele prezentate anterior dacă acestea sunt achiziționate ulterior, conform pct. 8.

14. SOLUȚIONAREA LITIGIILOR

14.1 Litigiile se soluționează prin negocieri; în caz de eșec — în instanța de judecată competentă din Republica Moldova.

15. DISPOZIȚII FINALE

15.1 Prezentul contract este întocmit în numărul de exemplare indicat în tabelul de la pct. 7, cu aceeași forță juridică.

15.2 Pentru aspectele nereglementate, Părțile se vor conduce după prevederile legislației Republicii Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PRESTATOR | BENEFICIAR (CUMPĂRĂTOR)
- Denumire: {nume_agentie} | Nume, Prenume: {nume_client}
- IDNO: {idno_agentie} | IDNP: {idnp_client}
- Reprezentant: {reprezentant_agentie} |
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Contract_servicii_vanzator.pdf`.
        $content = <<<'EOT'
@title CONTRACT DE SERVICII IMOBILIARE
@subtitle pentru vânzarea imobilului
@subtitle Nr. {numar_contract} · încheiat astăzi, {data_contractului}, în {oras}

@callout Notă juridică: Prezentul contract reglementează serviciile de vânzare a imobilului — varianta cu sau fără exclusivitate (vezi pct. 8). Pentru exclusivitate cu sancțiuni specifice, recomandare să se folosească „Contract exclusiv de servicii imobiliare (vânzare)". Prestatorul NU este parte a tranzacției și NU îl reprezintă juridic pe Beneficiar.

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele:

1. PĂRȚILE

PRESTATOR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

BENEFICIAR (VÂNZĂTOR — PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

2. OBIECTUL CONTRACTULUI

2.1 Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii imobiliare orientate spre găsirea cumpărătorului și asistarea vânzării imobilului descris în tabelul de mai jos:

OBIECTUL VÂNZĂRII
- Tip obiect: {tip_proprietate}
- Adresa: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Etaj / nr. etaje: {etaj} din {total_etaje}
- Număr camere: {numar_camere}
- Document drept proprietate: {document_proprietate}
- Preț de ofertă: {pret} {valuta}
- Preț minim admis: {pret_minim} {valuta}

2.2 Prezentul contract NU este contract de vânzare-cumpărare. Prestatorul are obligație de mijloace (diligență profesională), nu de rezultat — nu garantează încheierea tranzacției.

3. LISTA SERVICIILOR PRESTATORULUI

Prestatorul se obligă să presteze următoarele servicii:
@cbx:srv_analiza analiza pieței și a prețului de ofertă
@cbx:srv_publicitate pregătirea materialelor publicitare (foto, video, descriere)
@cbx:srv_anunturi plasarea anunțurilor pe portaluri, rețele sociale și baze de date partenere
@cbx:srv_adresari procesarea adresărilor primite de la potențiali cumpărători
@cbx:srv_vizionari organizarea și efectuarea vizionărilor
@cbx:srv_negocieri purtarea negocierilor cu cumpărătorii
@cbx:srv_documente verificarea completivității documentelor obiectului
@cbx:srv_avans asistarea la încheierea acordului de avans / arvună
@cbx:srv_notar asistarea la notar, bancă, evaluator
@cbx:srv_alte alte servicii

4. OBLIGAȚIILE PRESTATORULUI

4.1 Să acționeze cu bună-credință, diligență profesională și în interesul Beneficiarului.

4.2 Să promoveze activ obiectul prin canalele convenite.

4.3 Să prezinte Beneficiarului raport scris la cerere, despre activitatea desfășurată și rezultatele obținute.

4.4 Să respecte confidențialitatea datelor și informațiilor cunoscute.

5. OBLIGAȚIILE BENEFICIARULUI

5.1 Să prezinte Prestatorului date veridice și complete despre obiect.

5.2 Să transmită Prestatorului documentele aferente obiectului (acte de identitate, drept de proprietate, documente cadastrale).

5.3 Să asigure accesul la obiect pentru vizionări conform graficului convenit.

5.4 Să comunice imediat Prestatorului orice modificare a prețului, intenției de vânzare, existența grevărilor sau adresări directe ale terților.

5.5 Să achite remunerația Prestatorului conform pct. 6.

6. REMUNERAȚIA, EXCLUSIVITATEA ȘI TERMENUL

6.1 Remunerația Prestatorului, regimul de exclusivitate, termenul contractului și alte condiții esențiale sunt prezentate în tabelul de mai jos:

REMUNERAȚIE, EXCLUSIVITATE ȘI TERMEN
- Sumă fixă (dacă se aplică): {suma_fixa} {valuta}
- Procent din prețul vânzării: {comision_procent}%
- Termen de plată: {termen_plata}
- Modalitate de plată: {modalitate_plata}
- Regim exclusivitate: {regim_exclusivitate}
- Data începerii: {data_inceput}
- Data expirării: {data_sfarsit}
- Termen preaviz reziliere: {zile_notificare} zile
- Nr. exemplare: {numar_exemplare}

7. REGIMUL DE EXCLUSIVITATE

7.1 Prezentul contract poate fi încheiat în regim cu sau fără exclusivitate, conform rubricii „Regim exclusivitate" din tabelul de la pct. 6.

7.2 Fără exclusivitate: Beneficiarul poate încheia contracte similare cu alți intermediari și poate negocia direct cu cumpărători identificați de sine stătător. Remunerația se datorează doar dacă tranzacția se realizează cu un cumpărător atras de Prestator.

7.3 Cu exclusivitate: Beneficiarul se obligă să direcționeze toți potențialii cumpărători către Prestator, iar remunerația se datorează indiferent de canalul prin care s-a încheiat tranzacția. Pentru exclusivitate cu sancțiuni detaliate, recomandare să se folosească „Contract exclusiv de servicii imobiliare (vânzare)".

8. PREDAREA SERVICIILOR

8.1 Serviciile prestate se confirmă printr-un Act privind serviciile prestate, semnat de ambele Părți la încheierea tranzacției sau la solicitarea oricăreia dintre Părți.

9. RĂSPUNDERE ȘI LIMITE

9.1 Prestatorul nu răspunde pentru: refuzul cumpărătorilor, modificările pieței, informațiile false transmise de Beneficiar, acțiunile notarului/băncii/autorităților, sau alte circumstanțe externe sferei sale de control.

9.2 Beneficiarul răspunde pentru veridicitatea documentelor și informațiilor transmise Prestatorului.

10. CONFIDENȚIALITATE ȘI DATE PERSONALE

10.1 Părțile se obligă să nu divulge informațiile cunoscute în cadrul executării prezentului contract.

10.2 Beneficiarul își exprimă consimțământul pentru prelucrarea datelor sale personale conform Legii nr. 133/2011.

11. FORȚĂ MAJORĂ

11.1 Părțile sunt eliberate de răspundere în cazul apariției unor circumstanțe de forță majoră, cu notificare scrisă în termen de 7 zile de la apariție.

12. MODIFICARE ȘI REZILIERE

12.1 Contractul poate fi modificat prin acord scris al Părților sau reziliat cu termenul de preaviz indicat în tabelul de la pct. 6.

13. SOLUȚIONAREA LITIGIILOR

13.1 Litigiile se soluționează prin negocieri; în caz de eșec — în instanța de judecată competentă din Republica Moldova.

14. DISPOZIȚII FINALE

14.1 Prezentul contract este întocmit în numărul de exemplare indicat în tabelul de la pct. 6, cu aceeași forță juridică.

14.2 Pentru aspectele nereglementate, Părțile se vor conduce după prevederile legislației Republicii Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PRESTATOR | BENEFICIAR (VÂNZĂTOR)
- Denumire: {nume_agentie} | Nume, Prenume: {nume_client}
- IDNO: {idno_agentie} | IDNP: {idnp_client}
- Reprezentant: {reprezentant_agentie} |
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Contract_asistare_tranzactie.pdf`.
        $content = <<<'EOT'
@title CONTRACT DE ASISTARE A TRANZACȚIEI IMOBILIARE
@subtitle servicii organizatorice, informaționale și documentare
@subtitle Nr. {numar_contract} · încheiat astăzi, {data_contractului}, în {oras}

@callout Notă juridică: Asistarea tranzacției este un serviciu de coordonare și suport documentar — Prestatorul NU este parte a tranzacției, NU este notar, avocat, evaluator sau autoritate publică, și NU îl reprezintă juridic pe Beneficiar (pentru reprezentare juridică, vezi „Contract de mandat imobiliar"). Prestatorul nu garantează încheierea tranzacției.

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au încheiat prezentul contract cu privire la următoarele:

1. PĂRȚILE

PRESTATOR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

BENEFICIAR (PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

2. OBIECTUL CONTRACTULUI

2.1 Beneficiarul împuternicește, iar Prestatorul își asumă obligația de a presta servicii organizatorice, informaționale și de asistare documentală a tranzacției imobiliare descrise în tabelul de mai jos:

TRANZACȚIA SUPUSĂ ASISTĂRII
- Tip tranzacție: {tip_tranzactie}
- Calitatea Beneficiarului: {calitate_beneficiar}
- Tip obiect: {tip_proprietate}
- Adresa: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Preț estimat al tranzacției: {pret} {valuta}

2.2 Prezentul contract reglementează ASISTAREA tranzacției. Prestatorul nu este parte a tranzacției, nu acționează în calitate de notar, avocat, evaluator, bancă sau autoritate publică, și nu îl reprezintă juridic pe Beneficiar în relațiile cu terții.

2.3 Prestatorul NU garantează încheierea tranzacției. Obligația sa este de mijloace (diligență profesională), nu de rezultat.

3. LISTA SERVICIILOR PRESTATORULUI

Prestatorul se obligă să presteze următoarele servicii (se bifează cele aplicabile):
☐ analiza inițială a obiectului și a documentelor
☐ consultații pe parcursul tranzacției
☐ coordonarea cu părțile, notarul, banca, evaluatorul, oficiul cadastral
☐ pregătirea documentelor necesare tranzacției
☐ asistarea la încheierea acordului de avans / arvună
☐ asistarea la semnarea contractului principal
☐ coordonarea predării-primirii imobilului
☐ verificarea documentelor și a istoricului juridic al imobilului
☐ alte servicii: {alte_servicii}

4. OBLIGAȚIILE PRESTATORULUI

4.1 Să acționeze cu bună-credință, diligență profesională și în interesele Beneficiarului.

4.2 Să informeze regulat Beneficiarul despre stadiul tranzacției și acțiunile întreprinse.

4.3 Să respecte confidențialitatea datelor și informațiilor cunoscute în executarea contractului.

4.4 Să coordoneze profesionist relațiile cu terții implicați (notar, bancă, evaluator, oficiu cadastral).

4.5 Să avertizeze Beneficiarul cu privire la eventualele riscuri identificate în legătură cu tranzacția.

5. OBLIGAȚIILE BENEFICIARULUI

5.1 Să prezinte Prestatorului documentele și informațiile veridice necesare pentru asistarea tranzacției.

5.2 Să fie prezent la acțiunile programate (vizionări, întâlniri la notar, semnături).

5.3 Să nu efectueze acțiuni paralele care ar putea prejudicia executarea contractului fără a-l anunța în prealabil pe Prestator.

5.4 Să achite remunerația Prestatorului la termen.

6. DOCUMENTELE PREZENTATE DE BENEFICIAR

6.1 Beneficiarul prezintă Prestatorului următoarele documente (se bifează cele aplicabile):
☐ act de identitate
☐ document care confirmă dreptul de proprietate (dacă e cazul)
☐ documente cadastrale / de înregistrare
☐ acordul soțului / soției
☐ acordul coproprietarilor / reprezentanților
☐ alte documente: {alte_documente}

7. REMUNERAȚIA ȘI TERMEN

7.1 Remunerația Prestatorului, modalitatea de plată și termenul contractului sunt prezentate în tabelul de mai jos:

REMUNERAȚIA ȘI TERMEN
- Sumă fixă (dacă se aplică): {suma_fixa} {valuta}
- Procent din valoarea tranzacției: {comision_procent}%
- Termen de plată: {termen_plata}
- Modalitate de plată: {modalitate_plata}
- Data începerii: {data_inceput}
- Data expirării: {data_sfarsit}
- Termen preaviz reziliere: {zile_notificare} zile
- Nr. exemplare: {numar_exemplare}

7.2 Remunerația este datorată indiferent dacă tranzacția se încheie sau nu, dacă neîncheierea nu este imputabilă Prestatorului. Părțile pot conveni în scris condiții diferite de plată.

8. PREDAREA-PRIMIREA SERVICIILOR

8.1 Predarea-primirea serviciilor prestate se constată printr-un Act privind serviciile prestate, semnat de ambele Părți la încheierea contractului sau la solicitarea oricăreia dintre Părți.

9. LIMITE ALE RĂSPUNDERII PRESTATORULUI

9.1 Prestatorul NU răspunde pentru:
* refuzul celeilalte părți a tranzacției de a încheia contractul;
* acțiunile sau inacțiunile notarului, băncii, evaluatorului, oficiului cadastral sau altor autorități publice;
* modificările legislative sau de piață care afectează tranzacția;
* informațiile false sau incomplete transmise de Beneficiar;
* alte circumstanțe externe sferei sale de control.

9.2 Beneficiarul răspunde pentru veridicitatea documentelor și informațiilor transmise Prestatorului.

10. CONFIDENȚIALITATE ȘI DATE PERSONALE

10.1 Părțile se obligă să nu divulge informațiile cunoscute în cadrul executării prezentului contract, cu excepția cazurilor prevăzute de lege.

10.2 Beneficiarul își exprimă consimțământul pentru prelucrarea datelor sale personale în volumul necesar executării contractului, în conformitate cu Legea nr. 133/2011 privind protecția datelor cu caracter personal.

11. TERMENUL ȘI ÎNCETAREA CONTRACTULUI

11.1 Termenul de valabilitate este indicat în tabelul de la pct. 7. Contractul poate înceta și prin:
* acordul scris al Părților;
* la inițiativa unei Părți, cu notificare scrisă cu termenul de preaviz indicat în tabelul de la pct. 7;
* îndeplinirea completă a obiectului contractului (încheierea tranzacției);
* alte temeiuri prevăzute de legislația Republicii Moldova.

11.2 În cazul rezilierii din inițiativa Beneficiarului fără justă cauză, acesta achită Prestatorului remunerația corespunzătoare serviciilor efectiv prestate până la data rezilierii, în baza unui Act privind serviciile prestate.

12. FORȚĂ MAJORĂ

12.1 Părțile sunt eliberate de răspundere în cazul apariției unor circumstanțe de forță majoră (calamități naturale, război, stare de urgență, acte ale autorităților etc.).

12.2 Partea afectată notifică cealaltă parte în termen de cel mult 7 zile de la apariția evenimentului, sub sancțiunea decăderii din dreptul de a invoca forța majoră.

13. SOLUȚIONAREA LITIGIILOR

13.1 Litigiile se soluționează prioritar prin negocieri directe între Părți.

13.2 În lipsa unui acord, litigiul se examinează în instanța de judecată competentă din Republica Moldova.

14. DISPOZIȚII FINALE

14.1 Prezentul contract este întocmit în numărul de exemplare indicat în tabelul de la pct. 7, cu aceeași forță juridică, câte unul pentru fiecare Parte.

14.2 Modificările prezentului contract se fac prin acte adiționale semnate de ambele Părți.

14.3 Pentru aspectele nereglementate prin prezentul contract, Părțile se vor conduce după prevederile legislației Republicii Moldova.

SEMNĂTURILE PĂRȚILOR

@sig PRESTATOR | BENEFICIAR
- Denumire: {nume_agentie} | Nume, Prenume: {nume_client}
- IDNO: {idno_agentie} | IDNP: {idnp_client}
- Reprezentant: {reprezentant_agentie} |
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
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
        // Aspect vizual conform `Sablon_Contract_mandat_imobiliar.pdf`.
        $content = <<<'EOT'
@subtitle pentru reprezentarea intereselor în domeniul imobiliar
@subtitle Nr. {numar_contract} · încheiat astăzi, {data_contractului}, în {oras}

@callout Notă juridică: Mandatul (art. 1430-1452 Cod civil RM) este contractul prin care Mandatarul se obligă să încheie acte juridice în numele și pe contul Mandantului. Pentru actele care necesită formă autentică (vânzare-cumpărare imobil), prezentul contract trebuie completat cu o procură notarială separată — vezi „Procură pentru reprezentarea intereselor".

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", au încheiat prezentul Contract de mandat cu privire la următoarele:

1. PĂRȚILE

MANDANT (PERSOANĂ FIZICĂ)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}
- E-mail: {email_client}

MANDATAR (PERSOANĂ JURIDICĂ)
- Denumire: {nume_agentie}
- Acționează în baza: {temei_juridic}
- IDNO: {idno_agentie}
- Adresa juridică: {adresa_agentie}
- Telefon: {telefon_agentie}
- E-mail: {email_agentie}
- Reprezentant: {reprezentant_agentie}

2. OBIECTUL CONTRACTULUI

2.1 Mandantul împuternicește, iar Mandatarul își asumă obligația de a efectua, în numele și pe contul Mandantului, acțiuni juridice și/sau de fapt legate de obiectul imobiliar descris mai jos, în limitele prezentului contract și, după caz, ale procurii notariale anexate:

OBIECTUL IMOBILIAR
- Tip imobil: {tip_proprietate}
- Adresa: {adresa_proprietate}
- Număr cadastral: {numar_cadastral}
- Suprafață totală: {suprafata} m²
- Document drept proprietate: {document_proprietate}

2.2 Mandatul se acordă pentru următoarele scopuri (se bifează cele aplicabile):
☐ pregătirea documentelor necesare tranzacției imobiliare
☐ obținerea de certificate, extrase, duplicate de la registre publice
☐ depunerea documentelor în autoritățile publice
☐ reprezentarea în fața notarului, băncii, oficiului cadastral
☐ identificarea cumpărătorului / vânzătorului / chiriașului
☐ organizarea și efectuarea vizionărilor imobilului
☐ purtarea negocierilor cu terții în limitele convenite
☐ alte scopuri: {alte_scopuri}

3. VOLUMUL ÎMPUTERNICIRILOR MANDATARULUI

3.1 În executarea mandatului, Mandatarul este împuternicit să exercite următoarele acțiuni (se bifează cele aplicabile):
☐ să depună cereri, solicitări și să primească documente
☐ să primească certificate, extrase și alte documente
☐ să semneze documentele necesare în limitele împuternicirilor
☐ să reprezinte interesele în autoritățile publice, instituții, organizații
☐ să achite taxe, contribuții și plăți datorate în legătură cu cauza
☐ alte împuterniciri: {alte_imputerniciri}

3.2 Pentru actele juridice care necesită formă autentică (înstrăinare / dobândire de imobile), Mandantul va elibera o procură notarială separată Mandatarului, conform art. 1033 alin. (2) Cod civil RM.

4. OBLIGAȚIILE MANDATARULUI

4.1 Să acționeze cu bună-credință, diligență și în interesul exclusiv al Mandantului.

4.2 Să execute personal împuternicirile primite, fără a le cesiona unor terțe persoane, decât cu acordul scris al Mandantului.

4.3 Să raporteze Mandantului periodic, la cerere sau la încheierea mandatului, despre acțiunile întreprinse.

4.4 Să predea Mandantului toate documentele obținute și sumele primite în executarea mandatului, în termen de 5 zile de la solicitare.

4.5 Să respecte confidențialitatea informațiilor și datelor personale cunoscute în executarea mandatului.

4.6 Să comunice imediat Mandantului orice circumstanță care ar putea afecta executarea mandatului sau interesele Mandantului.

5. OBLIGAȚIILE MANDANTULUI

5.1 Să prezinte Mandatarului informații complete și veridice despre obiectul imobiliar și despre cauza pentru care se acordă mandatul.

5.2 Să transmită Mandatarului documentele necesare executării mandatului, în original sau copie certificată, după caz.

5.3 Să elibereze, dacă este necesar, o procură notarială care să acopere actele juridice ce necesită formă autentică.

5.4 Să achite Mandatarului remunerația convenită, la termen, și să compenseze cheltuielile suportate în executarea mandatului, în baza documentelor justificative.

5.5 Să nu acționeze de sine stătător în domeniul mandatului dacă acest lucru ar prejudicia executarea contractului, fără a anunța în prealabil Mandatarul.

6. CONDIȚII FINANCIARE ȘI TERMEN

6.1 Remunerația Mandatarului, modalitatea de plată, termenul mandatului și alte condiții esențiale sunt prezentate în tabelul de mai jos:

CONDIȚII FINANCIARE ȘI TERMEN
- Remunerația Mandatarului: {suma_fixa} {valuta}
- Modalitate de plată: {modalitate_plata}
- Termen de plată: {termen_plata}
- Compensare cheltuieli: {compensare_cheltuieli}
- Data începerii mandatului: {data_inceput}
- Data expirării mandatului: {data_sfarsit}
- Termen preaviz reziliere: {zile_notificare} zile
- Termen notificare forță majoră: {termen_notificare_fm} zile de la apariție
- Nr. exemplare: {numar_exemplare}

6.2 Mandatul poate fi prelungit prin acord scris al Părților, înainte de data expirării.

7. RAPORTUL MANDATARULUI ȘI PREDAREA DOCUMENTELOR

7.1 La cererea Mandantului, precum și la încheierea mandatului, Mandatarul prezintă un raport scris detaliat despre acțiunile întreprinse, sumele cheltuite și rezultatele obținute.

7.2 La predarea raportului, Mandatarul transmite Mandantului toate documentele originale obținute, conform unui Act de predare-primire semnat de ambele Părți.

8. RĂSPUNDEREA PĂRȚILOR

8.1 Pentru neîndeplinirea sau îndeplinirea necorespunzătoare a obligațiilor, Părțile răspund conform legislației Republicii Moldova și prezentului contract.

8.2 Mandatarul nu răspunde pentru: refuzul terților de a încheia tranzacția, modificările pieței, informațiile false transmise de Mandant, acțiunile autorităților publice, precum și pentru alte circumstanțe externe sferei sale de control.

8.3 Mandantul răspunde pentru veridicitatea documentelor și informațiilor transmise Mandatarului.

9. CONFIDENȚIALITATE ȘI DATE PERSONALE

9.1 Părțile se obligă să nu divulge informațiile cunoscute în cadrul executării prezentului contract, cu excepția cazurilor prevăzute de lege.

9.2 Mandantul își exprimă consimțământul pentru prelucrarea datelor sale personale în volumul necesar executării contractului, în conformitate cu Legea nr. 133/2011 privind protecția datelor cu caracter personal.

10. ÎNCETAREA CONTRACTULUI

10.1 Prezentul contract încetează prin:
* expirarea termenului prevăzut în tabelul de la pct. 6;
* acordul scris al Părților;
* revocarea mandatului de către Mandant, cu notificare scrisă (preaviz conform tabelului de la pct. 6);
* renunțarea Mandatarului la mandat, cu același termen de preaviz;
* îndeplinirea completă a obiectului mandatului;
* decesul, declararea dispariției sau punerea sub interdicție a Mandantului (persoană fizică);
* dizolvarea, falimentul sau radierea Mandatarului (persoană juridică);
* alte temeiuri prevăzute de legislația Republicii Moldova.

10.2 În cazul revocării mandatului fără justă cauză, Mandantul achită Mandatarului remunerația cuvenită pentru acțiunile deja întreprinse, precum și cheltuielile suportate.

11. FORȚĂ MAJORĂ

11.1 Părțile sunt eliberate de răspundere în cazul apariției unor circumstanțe de forță majoră (calamități naturale, război, stare de urgență, acte ale autorităților etc.).

11.2 Partea afectată notifică cealaltă parte în termenul indicat în tabelul de la pct. 6, sub sancțiunea decăderii din dreptul de a invoca forța majoră.

12. SOLUȚIONAREA LITIGIILOR

12.1 Litigiile se soluționează prioritar prin negocieri directe între Părți.

12.2 În lipsa unui acord, litigiul se examinează în instanța de judecată competentă din Republica Moldova, conform legislației aplicabile.

13. DISPOZIȚII FINALE

13.1 Prezentul contract este întocmit în numărul de exemplare indicat în tabelul de la pct. 6, cu aceeași forță juridică, câte unul pentru fiecare Parte.

13.2 Modificările prezentului contract se fac prin acte adiționale semnate de ambele Părți.

13.3 Pentru aspectele nereglementate prin prezentul contract, Părțile se vor conduce după prevederile Codului civil al Republicii Moldova (art. 1430-1452).

13.4 Anexele la contract (procură notarială, alte documente) sunt parte integrantă a acestuia.

SEMNĂTURILE PĂRȚILOR

@sig MANDANT | MANDATAR
- Nume, Prenume: {nume_client} | Denumire: {nume_agentie}
- IDNP: {idnp_client} | IDNO: {idno_agentie}
- | Reprezentant: {reprezentant_agentie}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
EOT;

        return [
            'name'    => 'Contract de mandat imobiliar',
            'type'    => 'mandate',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }

    // 14 ─────────────────────────────────────────────────────────────────────
    private static function contractInchiriere(): array
    {
        // Aspect vizual conform `Sablon_Contract_de_inchiriere.pdf`:
        //   - blocuri de părți și caracteristici sunt tabele cu antet bleumarin
        //   - `ALL CAPS LINE` urmată de `- key: value` declanșează kv_table cu header
        //   - `ALL CAPS A | ALL CAPS B` declanșează tabel cu 2 antete (ELEMENT | SUMĂ)
        //   - `* item` declanșează listă cu bullet •
        //   - `@sig A | B` declanșează blocul de semnături 2-coloane
        $content = <<<'EOT'
încheiat astăzi, {data_contractului}, în {oras}, Republica Moldova

Subsemnații, identificați în tabelele de mai jos, denumiți în continuare „Părțile", am convenit încheierea prezentului Contract de închiriere cu privire la următoarele:

PĂRȚILE CONTRACTANTE

LOCATORUL (PROPRIETAR)
- Nume, Prenume: {nume_proprietar}
- IDNP: {idnp_proprietar}
- Domiciliu: {adresa_proprietar}
- Telefon: {telefon_proprietar}
- Email: {email_proprietar}

LOCATARUL (CHIRIAȘ)
- Nume, Prenume: {nume_client}
- IDNP: {idnp_client}
- Domiciliu: {adresa_client}
- Telefon: {telefon_client}
- Email: {email_client}

1. OBIECTUL CONTRACTULUI

1.1 Locatorul transmite în folosință temporară, iar Locatarul preia spre folosință imobilul cu caracteristicile prezentate în tabelul de mai jos.

CARACTERISTICILE IMOBILULUI
- Adresa: {adresa_proprietate}, sect. {sector}, mun. {oras}
- Tip imobil: {tip_proprietate}
- Suprafață totală: {suprafata} m²
- Suprafață locativă: {suprafata_locuibila} m²
- Număr camere: {numar_camere}
- Etaj: {etaj} din {total_etaje}
- Număr cadastral: {numar_cadastral}
- Destinație: locativă

1.2 Imobilul este destinat exclusiv folosinței prevăzute la rubrica „Destinație" din tabelul de mai sus și nu poate fi utilizat în alt scop fără acordul scris al Locatorului.

2. TERMENUL CONTRACTULUI

2.1 Prezentul contract se încheie pe termen de la {data_inceput_chirie} până la {data_sfarsit_chirie}.

2.2 La expirarea termenului, contractul poate fi prelungit prin acordul scris al ambelor Părți.

3. CHIRIA ȘI MODALITATEA DE PLATĂ

3.1 Condițiile financiare ale prezentului contract sunt sintetizate în tabelul de mai jos:

ELEMENT | SUMĂ / DETALII
- Chirie lunară: {pret} {valuta}
- Scadența lunară: data {scadenta_zi} a fiecărei luni
- Modalitate de plată: {modalitate_plata}
- Plata primei luni: {pret} {valuta} la semnare
- Depozit de garanție: {depozit} {valuta} la semnare
- Utilități: în sarcina Locatarului

3.2 Depozitul de garanție se restituie Locatarului la finalul contractului dacă imobilul este predat în stare bună, conform procesului-verbal de predare-primire.

3.3 Cheltuielile pentru utilități (apă, gaz, electricitate, internet, taxe comunale) sunt suportate de către Locatar, în baza facturilor furnizorilor.

4. OBLIGAȚIILE LOCATORULUI

4.1 Să predea Locatarului imobilul în stare bună, curat și apt pentru locuit.
4.2 Să garanteze folosirea netulburată a imobilului pe toată durata contractului.
4.3 Să asigure reparațiile capitale și defecțiunile structurale (acoperiș, instalații, fundație etc.).
4.4 Să nu pătrundă în imobil fără anunțarea prealabilă a Locatarului (minim 24 ore), cu excepția situațiilor de urgență.

5. OBLIGAȚIILE LOCATARULUI

5.1 Să folosească imobilul exclusiv în scopurile prevăzute la pct. 1.2.
5.2 Să achite chiria și utilitățile la termen.
5.3 Să mențină imobilul în stare bună și să efectueze reparațiile curente.
5.4 Să nu cesioneze contractul și să nu subînchirieze imobilul fără acordul scris al Locatorului.
5.5 Să restituie imobilul la finalul contractului în aceeași stare în care l-a primit, ținând cont de uzura normală.
5.6 Să anunțe Locatorul cu cel puțin 30 de zile înainte despre intenția de a rezilia contractul.

6. ÎNCETAREA CONTRACTULUI

6.1 Contractul încetează prin:
* expirarea termenului;
* acordul scris al ambelor Părți;
* rezilierea unilaterală pentru neîndeplinirea obligațiilor, cu notificare de 30 zile;
* imposibilitatea folosirii imobilului din motive obiective (incendiu, calamități etc.).

6.2 La încetarea contractului, Locatarul predă imobilul Locatorului pe baza unui proces-verbal, iar Locatorul restituie depozitul de garanție în termen de 5 zile, dacă nu există daune.

7. RĂSPUNDEREA PĂRȚILOR

7.1 Pentru întârzierea plății chiriei, Locatarul achită o penalitate de 0,1% din suma datorată pentru fiecare zi de întârziere.
7.2 Pentru pagubele produse imobilului din vina Locatarului, acesta despăgubește integral Locatorul.
7.3 Părțile răspund conform legislației Republicii Moldova pentru obligațiile asumate.

8. DISPOZIȚII FINALE

8.1 Prezentul contract este întocmit în două exemplare cu aceeași forță juridică, câte unul pentru fiecare Parte.
8.2 Modificările contractului se fac prin acte adiționale semnate de ambele Părți.
8.3 Litigiile se soluționează pe cale amiabilă, iar în caz contrar, în instanța de judecată competentă din Republica Moldova.

SEMNĂTURILE PĂRȚILOR

@sig LOCATOR | LOCATAR
- Nume, Prenume: {nume_proprietar} | Nume, Prenume: {nume_client}
- IDNP: {idnp_proprietar} | IDNP: {idnp_client}
- Data semnării: {data_contractului} | Data semnării: {data_contractului}
- Semnătura | Semnătura
EOT;

        return [
            'name'    => 'Contract de închiriere a imobilului',
            'type'    => 'rent',
            'locale'  => 'ro',
            'content' => $content,
        ];
    }
}
