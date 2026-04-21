<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\ContractTemplate;
use Illuminate\Database\Seeder;

class ContractTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $agency = Agency::first();
        if (! $agency) {
            return;
        }

        $templates = [
            [
                'name'   => 'Contract Vânzare-Cumpărare',
                'type'   => 'sale',
                'locale' => 'ro',
                'content' => <<<'EOT'
CONTRACT DE VÂNZARE-CUMPĂRARE

Încheiat astăzi, {data_contractului}, în mun. {oras}.

VÂNZĂTORUL: {nume_vanzator}, CNP {cnp_vanzator}, domiciliat în {adresa_vanzator}.

CUMPĂRĂTORUL: {nume_client}, domiciliat la {adresa_client}, tel. {telefon_client}, e-mail: {email_client}.

OBIECTUL CONTRACTULUI

Art. 1. Vânzătorul vinde, iar Cumpărătorul cumpără imobilul situat la adresa:
{adresa_proprietate}, compus din {numar_camere} camere, suprafața totală {suprafata} m².

PREȚUL TRANZACȚIEI

Art. 2. Prețul convenit al imobilului este de {pret} {valuta}, achitat integral la semnarea prezentului contract.

GARANȚII

Art. 3. Vânzătorul garantează că imobilul este liber de orice sarcini, ipoteci sau revendicări ale terților.

DISPOZIȚII FINALE

Art. 4. Prezentul contract a fost redactat în 2 (două) exemplare originale, câte unul pentru fiecare parte.

Vânzător: _______________________     Cumpărător: _______________________
EOT,
            ],
            [
                'name'   => 'Contract de Închiriere',
                'type'   => 'rent',
                'locale' => 'ro',
                'content' => <<<'EOT'
CONTRACT DE ÎNCHIRIERE

Încheiat astăzi, {data_contractului}, în mun. {oras}.

LOCATORUL (Proprietarul): {nume_proprietar}, CNP {cnp_proprietar}.

LOCATARUL (Chiriașul): {nume_client}, tel. {telefon_client}, e-mail: {email_client}.

OBIECTUL CONTRACTULUI

Art. 1. Locatorul dă în chirie Locatarului imobilul situat la:
{adresa_proprietate}, compus din {numar_camere} camere, suprafața {suprafata} m².

CHIRIA

Art. 2. Chiria lunară este de {pret} {valuta}, achitată până la data de 5 a fiecărei luni.

TERMENUL CONTRACTULUI

Art. 3. Contractul se încheie pe o perioadă de {durata_luni} luni, începând cu {data_start} până la {data_sfarsit}.

GARANȚIE (DEPOZIT)

Art. 4. Locatarul achită un depozit de garanție în valoare de {depozit} {valuta}, rambursabil la expirarea contractului.

Locator: _______________________     Locatar: _______________________
EOT,
            ],
            [
                'name'   => 'Contract de Mandat Imobiliar',
                'type'   => 'mandate',
                'locale' => 'ro',
                'content' => <<<'EOT'
CONTRACT DE MANDAT IMOBILIAR

Încheiat astăzi, {data_contractului}.

MANDANTUL: {nume_client}, tel. {telefon_client}, e-mail: {email_client}.

MANDATARUL: Agenția REALTIX, reprezentată de {nume_agent}.

OBIECTUL MANDATULUI

Art. 1. Mandantul împuternicește Mandatarul să intermedieze {tipul_tranzactiei} imobilului situat la:
{adresa_proprietate}, la prețul de {pret} {valuta}.

OBLIGAȚIILE MANDATARULUI

Art. 2. Mandatarul se obligă să promoveze imobilul, să organizeze vizionări și să prezinte oferte serioase.

COMISIONUL

Art. 3. Comisionul agenției este de {comision_procent}% din valoarea tranzacției finalizate.

DURATA MANDATULUI

Art. 4. Prezentul contract este valabil {durata_zile} zile de la data semnării.

Mandant: _______________________     Mandatar: _______________________
EOT,
            ],
        ];

        foreach ($templates as $tpl) {
            ContractTemplate::firstOrCreate(
                ['agency_id' => $agency->id, 'name' => $tpl['name']],
                array_merge($tpl, ['agency_id' => $agency->id, 'is_default' => true])
            );
        }
    }
}
