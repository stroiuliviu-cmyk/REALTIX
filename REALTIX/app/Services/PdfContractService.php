<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\ContractTemplate;
use App\Models\GeneratedContract;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PdfContractService
{
    private const RO_MONTHS = [
        'ianuarie','februarie','martie','aprilie','mai','iunie',
        'iulie','august','septembrie','octombrie','noiembrie','decembrie',
    ];

    /**
     * Descriptive placeholder labels matching Sablon_*.pdf reference style.
     * Exact field-name overrides; falls back to PLACEHOLDER_PATTERNS, then to
     * the raw variable name. Used by stylePlaceholders() and the DOCX path.
     */
    private const PLACEHOLDER_LABELS = [
        'oras'                  => 'localitate',
        'data_contractului'     => 'ZZ luna AAAA',
        'data_inceput'          => 'ZZ.LL.AAAA',
        'data_sfarsit'          => 'ZZ.LL.AAAA',
        'data_inceput_chirie'   => 'data început',
        'data_sfarsit_chirie'   => 'data sfârșit',
        'data_inceput_servicii' => 'data început',
        'data_sfarsit_servicii' => 'data sfârșit',
        'data_plata'            => 'data plății',
        'data_plata_avans'      => 'ZZ.LL.AAAA',
        'data_contract_principal' => 'ZZ.LL.AAAA',
        'data_inchiriere_inceput' => 'ZZ.LL.AAAA',
        'data_inchiriere_sfarsit' => 'ZZ.LL.AAAA',
        'numar_cadastral'       => 'se completează',
        'numar_contract'        => 'nr. contract',
        'numar_act'             => 'nr. act',
        'numar_exemplare'       => 'uzual 2',
        'numar_camere'          => '__',
        'tip_proprietate'       => 'apartament / casă / spațiu',
        'tip_cauza'             => 'descriere cauză',
        'tip_dosar'             => 'descriere dosar',
        'tip_tranzactie'        => 'vânzare-cumpărare / locațiune / altul',
        'calitate_beneficiar'   => 'vânzător / cumpărător / locator / locatar',
        'temei_juridic'         => 'statut / procură / extras CCS',
        'temei_predare'         => 'Contract de închiriere nr. ___',
        'scop_transmitere'      => 'predare / restituire / altul',
        'scop_predare'          => 'predare / restituire / altul',
        'modalitate_plata'      => 'numerar / transfer bancar',
        'regim_exclusivitate'   => 'cu / fără exclusivitate',
        'termen_plata'          => 'la încheierea tranzacției / în ___ zile',
        'comision_procent'      => '__',
        'suprafata'             => '__',
        'suprafata_locuibila'   => '__',
        'etaj'                  => '__',
        'total_etaje'           => '__',
        'sector'                => 'denumire sector',
        'destinatie'            => 'locativă / comercială',
        'stare_imobil'          => 'excelentă / bună / satisfăcătoare',
        'observatii_imobil'     => 'defecte, urme de uzură',
        'zile_notificare'       => '__',
        'scadenta_zi'           => '__',
        'reprezentant_agentie'  => 'nume, prenume, funcție',
        'puteri_acordate'       => 'descrierea împuternicirilor',
        'motiv_reziliere'       => 'descriere motiv',
        'suma_decontare'        => 'sumă',
        'descriere_servicii_prestate' => 'descrierea serviciilor',
        'rezultat_final'        => 'descriere rezultat',
        'valuta'                => 'monedă',
        'document_proprietate'  => 'Contract de vânzare-cumpărare / ...',
        'garantie'              => 'sumă la semnare',
        'chirie_luna'           => 'sumă',
        'pret_minim'            => 'sumă',
        'pret_maxim'            => 'sumă',
        // ── Acte / notar ──
        'act_identitate_eliberat' => 'instituția emitentă',
        'act_identitate_mandant'  => 'buletin / pașaport',
        'act_identitate_mandatar' => 'buletin / pașaport',
        'autentificare_notariala' => 'da / nu',
        'birou_notar'             => 'denumire birou notarial',
        'licenta_notar'           => 'număr licență',
        'nr_inregistrare_notar'   => 'număr înregistrare',
        // ── Clauze / descrieri libere ──
        'alt_rezultat'             => 'descriere rezultat',
        'alta_modalitate_calcul'   => 'descriere modalitate',
        'caracteristici'           => 'descriere caracteristici',
        'clauza_cumparator_propriu'=> 'se completează / nu se aplică',
        'compensare_cheltuieli'    => 'se completează / nu se aplică',
        'contract_semnat'          => 'data / nr.',
        'descriere_obiect'         => 'descrierea obiectului',
        'drept_substituire'        => 'cu / fără',
        'eliberare_obiect'         => 'se completează',
        'forma_plata'              => 'numerar / transfer bancar',
        'modalitate_prelungire'    => 'se completează',
        'modalitate_transmitere'   => 'predare-primire / poștă',
        'motive_reziliere'         => 'descriere motive',
        'obiect_contract'          => 'descrierea obiectului',
        'observatii'               => 'se completează',
        'prestare_partiala'        => 'da / nu',
        'semnatura_destinatar'     => 'semnătura',
        'transmitere_mobilier'     => 'se completează',
        // ── Durată / termene ──
        'durata_post_actiune'      => '__ luni',
        'termen_notificare_fm'     => '__ zile',
    ];

    /** Prefix-based fallback labels (regex → label). Order matters. */
    private const PLACEHOLDER_PATTERNS = [
        '/^idnp_/'      => '13 cifre',
        '/^idno_/'      => '13 cifre',
        '/^nume_/'      => 'se completează',
        '/^denumire/'   => 'denumirea companiei',
        '/^adresa_/'    => 'adresa completă',
        '/^domiciliu/'  => 'adresa completă',
        '/^telefon_/'   => '+373 ...',
        '/^email_/'     => 'adresa de e-mail',
        '/^data_/'      => 'ZZ.LL.AAAA',
        '/^pret/'       => 'sumă',
        '/^suma/'       => 'sumă',
        '/^chirie/'     => 'sumă',
        '/^depozit/'    => 'sumă',
        '/^contor_/'    => 'indicație',
        '/^chei_/'      => 'buc.',
        '/^alte_/'      => 'se descriu',
        '/^tip_/'       => 'descriere',
    ];

    public function generate(ContractTemplate $template, array $data, int $userId, ?Agency $agency = null): GeneratedContract
    {
        $data     = $this->normalizeData($data);
        $rendered = $this->renderContent($template->content, $data);
        $rendered = $this->postProcess($rendered);
        $rendered = $this->pairFieldValueLines($rendered);
        $rendered = $this->collapseSoftBreaks($rendered);
        $uuid     = (string) Str::uuid();
        $docxPath = 'contracts/' . $uuid . '.docx';

        // Allow templates to override the displayed title via `@title TEXT`.
        [$rendered, $displayTitle] = $this->extractTitleOverride($rendered, $template->name);

        $structure = $this->parseStructure($rendered, $displayTitle);

        // PDF generation disabled — agencies download editable .docx instead.
        // The PDF pipeline (DomPDF + wrapper view) is preserved further down
        // for the in-browser template preview route, which still renders HTML.
        $docxBytes = $this->buildDocx($structure, $template->name, $this->headerCity($data), $this->headerDate($data));
        Storage::disk('public')->put($docxPath, $docxBytes);

        return GeneratedContract::create([
            'agency_id'   => auth()->user()->agency_id,
            'user_id'     => $userId,
            'template_id' => $template->id,
            'property_id' => $data['property_id'] ?? null,
            'contact_id'  => $data['contact_id'] ?? null,
            'data'        => $data,
            'pdf_path'    => null,
            'docx_path'   => $docxPath,
        ]);
    }

    /**
     * Render the template through the same pipeline as a real PDF, but with
     * placeholders highlighted instead of filled. Returns [displayTitle, html].
     */
    public function previewHtml(ContractTemplate $template): array
    {
        // Wrap each {placeholder} in unique ASCII sentinels that survive
        // postProcess + htmlspecialchars unchanged, then swap them back into
        // styled <mark> tags after renderHtml has emitted the structure.
        $content = preg_replace('/\{(\w+)\}/', "\x02PH:\$1\x03", $template->content);

        $content = $this->postProcess($content);
        $content = $this->pairFieldValueLines($content);
        $content = $this->collapseSoftBreaks($content);
        [$content, $displayTitle] = $this->extractTitleOverride($content, $template->name);

        $structure   = $this->parseStructure($content, $displayTitle);
        $html        = $this->renderHtml($structure);

        $style = 'background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:1px 4px;font-style:normal;';
        $html  = preg_replace(
            '/\x02PH:(\w+)\x03/',
            '<mark style="' . $style . '">{$1}</mark>',
            $html
        );

        return [$displayTitle, $html];
    }

    public function generateDocxFor(GeneratedContract $contract): string
    {
        $tpl       = $contract->template;
        $rendered  = $this->collapseSoftBreaks($this->pairFieldValueLines($this->postProcess($this->renderContent($tpl?->content ?? '', $contract->data ?? []))));
        [$rendered, $displayTitle] = $this->extractTitleOverride($rendered, $tpl?->name ?? 'Contract');
        $structure = $this->parseStructure($rendered, $displayTitle);
        $uuid      = (string) Str::uuid();
        $docxPath  = 'contracts/' . $uuid . '.docx';
        $data      = $contract->data ?? [];
        Storage::disk('public')->put($docxPath, $this->buildDocx(
            $structure,
            $tpl?->name ?? $displayTitle,
            $this->headerCity($data),
            $this->headerDate($data),
        ));
        return $docxPath;
    }

    // ── 1) Placeholder fill + cosmetic post-processing ──────────────────────

    /**
     * Normalize submitted form data before it reaches the template:
     *   - title-case all-lowercase or all-uppercase person names (agency name
     *     is kept as-is — brand acronyms like "IMPERIO SRL" shouldn't change).
     *   - combine etaj + total_etaje into etaj when both are filled, so the
     *     template `{etaj}` line renders "5 din 9".
     */
    private function normalizeData(array $data): array
    {
        foreach ($data as $key => $value) {
            if (!is_string($value) || $value === '') continue;
            // Title-case person names — keep `nume_agentie` as-is (brand acronym).
            if (preg_match('/^nume_/', $key) && $key !== 'nume_agentie') {
                $low = mb_strtolower($value, 'UTF-8');
                $up  = mb_strtoupper($value, 'UTF-8');
                if ($low === $value || $up === $value) {
                    $data[$key] = mb_convert_case($value, MB_CASE_TITLE, 'UTF-8');
                }
            }
        }
        return $data;
    }

    private function renderContent(string $content, array $data): string
    {
        // Resolve `@cbx:KEY label` lines into ☑ or ☐ based on the form's
        // boolean field value. Lines like `@cbx:srv_analiza ...` become
        // `☑ ...` when data['srv_analiza'] is truthy, otherwise `☐ ...`.
        $content = preg_replace_callback('/^@cbx:(\w+)\s+(.+)$/mu', function ($m) use ($data) {
            $checked = !empty($data[$m[1]])
                && filter_var($data[$m[1]], FILTER_VALIDATE_BOOLEAN);
            return ($checked ? '☑' : '☐') . ' ' . $m[2];
        }, $content);

        foreach ($data as $key => $value) {
            $val = (string) ($value ?? '');
            if ($val === '') continue;
            $content = str_replace('{' . $key . '}', $val, $content);
        }
        // Remaining {placeholders} → sentinel that survives htmlspecialchars
        // unchanged; converted to styled italic-gray "[name]" in
        // stylePlaceholders() AFTER the HTML is built. This way the styling
        // applies uniformly to inline placeholders in prose AND to kv-values.
        return preg_replace('/\{([a-z_]+)\}/i', "\x02PH:\$1\x03", $content);
    }

    /**
     * Replace placeholder sentinels in the already-rendered HTML with styled
     * italic-gray "[descriptive label]" markers, matching the visual style of
     * unfilled fields in Sablon_*.pdf reference templates.
     */
    private function stylePlaceholders(string $html): string
    {
        return preg_replace_callback('/\x02PH:(\w+)\x03/', function ($m) {
            $label = htmlspecialchars($this->placeholderLabel($m[1]), ENT_QUOTES, 'UTF-8');
            return '<em style="color:#595959;font-style:italic;">[' . $label . ']</em>';
        }, $html);
    }

    /**
     * Map a raw placeholder variable name to its descriptive label.
     * Exact match (PLACEHOLDER_LABELS) > prefix pattern (PLACEHOLDER_PATTERNS)
     * > raw name as last resort.
     */
    private function placeholderLabel(string $name): string
    {
        if (isset(self::PLACEHOLDER_LABELS[$name])) {
            return self::PLACEHOLDER_LABELS[$name];
        }
        foreach (self::PLACEHOLDER_PATTERNS as $regex => $label) {
            if (preg_match($regex, $name)) return $label;
        }
        return $name;
    }

    /**
     * Polish rendered text before structure parsing:
     *   - "300.00 EUR" → "300 EUR" (strip trailing zero decimals)
     *   - "14.05.2026" / "2026-05-14" → "14 mai 2026" (Romanian month names)
     *   - "5 din \x02PH:total_etaje\x03" → "5" (drop "din [unfilled]" pair
     *     when the lead value is filled but its partner placeholder isn't —
     *     avoids "5 din [__]" cosmetic noise on the floor/total-floors row).
     */
    private function postProcess(string $text): string
    {
        // Dates first (before .00 strip): dd.mm.yyyy → "14 mai 2026"
        $text = preg_replace_callback('/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/', function ($m) {
            $mm = (int) $m[2];
            if ($mm < 1 || $mm > 12) return $m[0];
            return ltrim($m[1], '0') . ' ' . self::RO_MONTHS[$mm - 1] . ' ' . $m[3];
        }, $text);

        // Dates: yyyy-mm-dd
        $text = preg_replace_callback('/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/', function ($m) {
            $mm = (int) $m[2];
            if ($mm < 1 || $mm > 12) return $m[0];
            return ltrim($m[3], '0') . ' ' . self::RO_MONTHS[$mm - 1] . ' ' . $m[1];
        }, $text);

        // Drop "din [unfilled total_etaje]" when etaj is filled.
        // Pattern: "<word> din \x02PH:total_etaje\x03" → "<word>"
        $text = preg_replace('/(\b\w+\b)\s+din\s+\x02PH:total_etaje\x03/u', '$1', $text);

        // Numbers: strip trailing ".00" wherever it appears.
        //   60.00 m² → 60 m²    300.00 EUR → 300 EUR
        //   60.50    →  60.50  (kept — real fractional value)
        $text = preg_replace('/(\d+)\.00(?!\d)/', '$1', $text);

        return $text;
    }

    /**
     * Rescue paragraph-encoded pseudo-tables in template content. When an
     * ALL-CAPS heading is followed by alternating "label / value" short lines,
     * fold each pair into a `- label: value` row so parseStructure produces a
     * proper kv-table instead of a flat list of paragraphs (and so that the
     * heading isn't merged into the previous prose by collapseSoftBreaks).
     *
     * Mirror of ContractTemplateController::pairFieldValueLines — runs at
     * RENDER time so even templates saved without `- ` prefixes still display
     * as styled tables.
     */
    private function pairFieldValueLines(string $text): string
    {
        $lines = preg_split("/\r?\n/", $text);
        $out   = [];
        $n     = count($lines);
        $i     = 0;
        while ($i < $n) {
            $line = $lines[$i];
            $trim = trim($line);
            $out[] = $line;
            $i++;
            if (! $this->isAllCapsHeadingLine($trim)) continue;

            while ($i + 1 < $n) {
                $label = trim($lines[$i]     ?? '');
                $value = trim($lines[$i + 1] ?? '');
                if ($label === '' || $value === '')                                  break;
                if (mb_strlen($label) > 50 || mb_strlen($value) > 200)               break;
                if (str_starts_with($label, '- '))                                   break;
                if (str_starts_with($label, '* ') || str_starts_with($label, '☐ ')
                    || str_starts_with($label, '☑ '))                                break;
                if (preg_match('/^\d+\./', $label))                                  break;
                if (preg_match('/^\d+\.\d+/', $label))                               break;
                if (preg_match('/\.\s*$/u', $label))                                 break; // sentence end (allows "nr.", "et." inline)
                if (mb_strlen($label) >= 10 && $this->isAllCapsHeadingLine($label))  break;
                $out[] = '- ' . $label . ': ' . $value;
                $i += 2;
            }
        }
        return implode("\n", $out);
    }

    private function isAllCapsHeadingLine(string $s): bool
    {
        if ($s === '' || mb_strlen($s) > 80)             return false;
        if (mb_strtoupper($s, 'UTF-8') !== $s)           return false;
        return (bool) preg_match('/\p{L}/u', $s);
    }

    /**
     * Collapse "soft" newlines inside a paragraph: when the previous line ends
     * with a continuation marker (`,`, `:`, `;`, `–`), the next line is joined
     * onto it with a single space. Empty lines and list-item lines stay alone.
     *
     * Without this, every line in the template becomes its own <p> in the PDF,
     * giving each a first-line indent and breaking the multi-line paragraphs
     * intended by the template author.
     */
    private function collapseSoftBreaks(string $text): string
    {
        $lines  = preg_split("/\r?\n/", $text);
        $out    = [];
        $buffer = '';
        foreach ($lines as $line) {
            $line = rtrim($line);
            if ($line === '') {
                if ($buffer !== '') { $out[] = $buffer; $buffer = ''; }
                $out[] = '';
                continue;
            }
            // List / checkbox items always stand alone.
            if (preg_match('/^[-•*☐]\s/u', $line)) {
                if ($buffer !== '') { $out[] = $buffer; $buffer = ''; }
                $out[] = $line;
                continue;
            }
            if ($buffer === '') {
                $buffer = $line;
                continue;
            }
            // Continue paragraph only if buffer ends with a continuation marker
            // — but never absorb an ALL-CAPS line, since that's a section
            // heading (e.g. "OBIECTUL VÂNZĂRII") that must stay on its own.
            $last = mb_substr($buffer, -1);
            if (in_array($last, [',', ':', ';', '–'], true) && !$this->isAllCapsHeadingLine(trim($line))) {
                $buffer .= ' ' . $line;
            } else {
                $out[] = $buffer;
                $buffer = $line;
            }
        }
        if ($buffer !== '') $out[] = $buffer;
        return implode("\n", $out);
    }

    // ── 2) Structure parser ────────────────────────────────────────────────

    /**
     * Returns an array of typed items:
     *   ['type' => 'city_date', 'city' => '...', 'date' => '...']
     *   ['type' => 'section',   'text' => '1. OBIECTUL CONTRACTULUI']
     *   ['type' => 'subsection','text' => 'CARACTERISTICI:']
     *   ['type' => 'numbered',  'text' => '1.1. Locatorul transmite ...', 'gap' => bool]
     *   ['type' => 'field',     'text' => 'Nume: X', 'gap' => bool]
     *   ['type' => 'prose',     'text' => '...', 'gap' => bool]
     *   ['type' => 'signatures','left' => [role, name], 'right' => [role, name]]
     */
    private function parseStructure(string $text, string $docTitle): array
    {
        $lines = preg_split("/\r?\n/", trim($text));
        $items = [];

        // Skip a duplicate title line at the very start of the body.
        $startIdx = 0;
        $titleN   = $this->normalize($docTitle);
        if (isset($lines[0]) && $this->normalize($lines[0]) === $titleN) {
            $startIdx = 1;
            while (isset($lines[$startIdx]) && trim($lines[$startIdx]) === '') $startIdx++;
        }

        // Try city + date pair on adjacent lines.
        $cityM = isset($lines[$startIdx]) ? null : null;
        if (isset($lines[$startIdx]) && preg_match('/^mun\.\s+(.+)$/iu', trim($lines[$startIdx]), $cm)) {
            $next = trim($lines[$startIdx + 1] ?? '');
            if (preg_match('/^data:\s*(.+)$/iu', $next, $dm)) {
                $items[] = ['type' => 'city_date', 'city' => 'mun. ' . trim($cm[1]), 'date' => trim($dm[1])];
                $startIdx += 2;
                while (isset($lines[$startIdx]) && trim($lines[$startIdx]) === '') $startIdx++;
            }
        }

        // Detect trailing signature lines.
        $sigRe = '/^([A-ZĂÂÎȘȚ\(\)\s\/]+?)[:\s]*[_]{3,}[^\n]*$/u';
        $endLines = [];
        $endStart = count($lines);
        for ($i = count($lines) - 1; $i >= $startIdx; $i--) {
            $l = trim($lines[$i]);
            if ($l === '') {
                if (!empty($endLines)) continue;
                continue;
            }
            if (preg_match($sigRe, $l) && mb_strlen($l) < 200) {
                array_unshift($endLines, $l);
                $endStart = $i;
            } else {
                break;
            }
        }
        // Also pull the "SEMNĂTURILE PĂRȚILOR:" header above signatures if present.
        $sigHdrIdx = null;
        if (count($endLines) >= 2) {
            for ($j = $endStart - 1; $j >= $startIdx; $j--) {
                $l = trim($lines[$j]);
                if ($l === '') continue;
                if (preg_match('/^SEMN[ĂA]TURI[A-Z\s]*:?$/u', $l)) {
                    $sigHdrIdx = $j;
                }
                break;
            }
        }
        $contentEnd = $sigHdrIdx ?? $endStart;
        if (count($endLines) < 2) {
            $contentEnd = count($lines);
            $endLines = [];
        }

        // Subtitle: first line right after title, matching "încheiat astăzi…"
        if (isset($lines[$startIdx]) && preg_match('/^[Îî]ncheiat[ăa]?\s/u', trim($lines[$startIdx]))) {
            $items[] = ['type' => 'subtitle', 'text' => trim($lines[$startIdx])];
            $startIdx++;
            while (isset($lines[$startIdx]) && trim($lines[$startIdx]) === '') $startIdx++;
        }

        // Walk the body — first pass classification.
        $raw = [];
        $prevEmpty = false;
        for ($i = $startIdx; $i < $contentEnd; $i++) {
            $line = rtrim($lines[$i]);
            if ($line === '') { $prevEmpty = true; continue; }
            $gap = $prevEmpty;
            $prevEmpty = false;

            // @sig HEADER1 | HEADER2 — signature grid trigger
            if (preg_match('/^@sig\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'sig_header', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @empty-grid N | COL1 | COL2 | ... — N numbered empty rows
            if (preg_match('/^@empty-grid\s+(\d+)\s*\|\s*(.+)$/u', $line, $m)) {
                $rowCount = (int) $m[1];
                $cols = array_map('trim', explode('|', $m[2]));
                $raw[] = ['type' => 'empty_grid', 'cols' => $cols, 'row_count' => $rowCount, 'gap' => $gap];
                continue;
            }
            // @note TEXT — italic gray prose (small print)
            if (preg_match('/^@note\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'note', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @center TEXT — centered dark-blue subsection (e.g. CONFIRMARE DE PRIMIRE)
            if (preg_match('/^@center\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'center_heading', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @subtitle TEXT — explicit subtitle line (italic gray centered).
            // Used when a template needs multiple subtitle lines under the title.
            if (preg_match('/^@subtitle\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'subtitle', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @callout TEXT — highlighted note box (light blue bg + blue left border).
            // Bold "Notă...:" prefix is auto-detected and rendered bold.
            if (preg_match('/^@callout\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'callout', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @subhead TEXT — mixed-case dark-blue bold label (smaller than section).
            // Used for sub-headings inside numbered sections (e.g. "Împuterniciri extinse:").
            if (preg_match('/^@subhead\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'subhead', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // @boxed TITLE — opens an info-box. Subsequent prose lines become body
            // paragraphs of the box (until the next blank line or non-prose item).
            if (preg_match('/^@boxed\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'boxed_start', 'text' => trim($m[1]), 'gap' => $gap];
                continue;
            }
            // Section heading
            if (preg_match('/^\d+\.\s+[A-ZĂÂÎȘȚ]/u', $line) && !preg_match('/^\d+\.\d+/', $line)) {
                $raw[] = ['type' => 'section', 'text' => $line];
                continue;
            }
            // Numbered "1.1. ..." or "1.1 ..."
            if (preg_match('/^\d+\.\d+\.?\s+/', $line)) {
                $raw[] = ['type' => 'numbered', 'text' => $line, 'gap' => $gap];
                continue;
            }
            // Bullet item "* ..."
            if (str_starts_with($line, '* ')) {
                $raw[] = ['type' => 'bullet', 'text' => substr($line, 2), 'gap' => $gap];
                continue;
            }
            // Checkbox item "☐ ..." or "☑ ..." — preserves checked state so the
            // renderer can emit the correct symbol per row.
            if (preg_match('/^(☐|☑)\s+(.+)$/u', $line, $m)) {
                $raw[] = ['type' => 'checkbox', 'text' => trim($m[2]), 'checked' => $m[1] === '☑', 'gap' => $gap];
                continue;
            }
            // List item "- key: value" or "- value"
            if (str_starts_with($line, '- ')) {
                $raw[] = ['type' => 'list', 'text' => substr($line, 2), 'gap' => $gap];
                continue;
            }
            // Form field (Nume:/IDNP:/etc.)
            if (preg_match('/^(Nume|IDNP|CNP|Adres[ăa]|Telefon|Email|Tip|Suprafa[țt][ăa]|Etaj|Num[ăa]r|Domiciliat)[^\.]*:/iu', $line)) {
                $raw[] = ['type' => 'field', 'text' => $line, 'gap' => $gap];
                continue;
            }
            // Subsection ALL-CAPS (also allow `|` for 2-col table headers like
            // "ELEMENT | SUMĂ / DETALII", and `—`/`–` for parenthetical labels).
            if (preg_match('/^[A-ZĂÂÎȘȚ0-9\s\.,\(\)\|:\/\-—–]{4,}$/u', $line) && mb_strlen($line) <= 80) {
                $raw[] = ['type' => 'subsection', 'text' => rtrim($line, ':'), 'gap' => $gap];
                continue;
            }
            // Party block (legacy single-line "PROPRIETAR (LOCATOR): name, IDNP ...")
            if ($party = $this->parsePartyBlock($line)) {
                $raw[] = ['type' => 'party', 'data' => $party, 'gap' => $gap];
                continue;
            }
            $raw[] = ['type' => 'prose', 'text' => $line, 'gap' => $gap];
        }

        // Second pass: group consecutive `list`/`bullet` items, handle sig_header.
        $n = count($raw);
        for ($i = 0; $i < $n; $i++) {
            $t = $raw[$i]['type'];

            // Info box: @boxed TITLE + subsequent prose paragraphs become body.
            if ($t === 'boxed_start') {
                $body = [];
                $j = $i + 1;
                while ($j < $n && $raw[$j]['type'] === 'prose') {
                    $body[] = $raw[$j]['text'];
                    $j++;
                }
                $items[] = ['type' => 'boxed', 'title' => $raw[$i]['text'], 'body' => $body];
                $i = $j - 1;
                continue;
            }

            // Signature grid: @sig HEADER1 | HEADER2 + following list/bullet rows.
            // If only one header is given (no `|`), render as a single centered mini-table.
            // Each row may also be `- LABEL_LEFT | LABEL_RIGHT` for asymmetric grids.
            if ($t === 'sig_header') {
                $rows = [];
                $j = $i + 1;
                while ($j < $n && in_array($raw[$j]['type'], ['list', 'bullet'], true)) {
                    $txt = trim($raw[$j]['text']);
                    // Preserve "Label: value" syntax so the renderer can pre-fill
                    // signature rows with party data (e.g. `Denumire: IMPERIO SRL`).
                    if (str_contains($txt, '|')) {
                        $sides = array_map('trim', explode('|', $txt, 2));
                        $rows[] = ['left' => $sides[0] ?? '', 'right' => $sides[1] ?? ''];
                    } else {
                        $rows[] = ['left' => $txt, 'right' => $txt];
                    }
                    $j++;
                }
                $parts = array_map('trim', explode('|', $raw[$i]['text'], 2));
                $single = count($parts) < 2;
                $headers = $single ? [$parts[0]] : $parts;
                // Absorb a preceding "SEMNĂTURI(LE)" subsection as title.
                $title = $single ? 'SEMNĂTURA EXPEDITORULUI' : 'SEMNĂTURILE PĂRȚILOR';
                if (!empty($items) && end($items)['type'] === 'subsection'
                    && preg_match('/SEMN[ĂA]TUR/u', end($items)['text'])) {
                    $title = array_pop($items)['text'];
                }
                $items[] = [
                    'type'    => 'signature_grid',
                    'title'   => $title,
                    'headers' => $headers,
                    'rows'    => $rows,
                    'single'  => $single,
                ];
                $i = $j - 1;
                continue;
            }

            // Bulleted list (consecutive `*` items)
            if ($t === 'bullet') {
                $rows = [];
                $j = $i;
                while ($j < $n && $raw[$j]['type'] === 'bullet') {
                    $rows[] = $raw[$j]['text'];
                    $j++;
                }
                $items[] = ['type' => 'bulleted_list', 'rows' => $rows];
                $i = $j - 1;
                continue;
            }

            // Checkbox list (consecutive `☐` items)
            if ($t === 'checkbox') {
                $rows = [];
                $j = $i;
                while ($j < $n && $raw[$j]['type'] === 'checkbox') {
                    $rows[] = ['text' => $raw[$j]['text'], 'checked' => $raw[$j]['checked'] ?? false];
                    $j++;
                }
                $items[] = ['type' => 'checkbox_list', 'rows' => $rows];
                $i = $j - 1;
                continue;
            }

            if ($t !== 'list') {
                $items[] = $raw[$i];
                continue;
            }

            // Group `- ...` list items
            $rows = [];
            $j = $i;
            while ($j < $n && $raw[$j]['type'] === 'list') {
                $rows[] = $raw[$j]['text'];
                $j++;
            }

            // If the immediately preceding emitted item is a subsection, pop it
            // as the table header (1 column, or 2 columns when split by `|`).
            $headerLine = null;
            if (!empty($items) && end($items)['type'] === 'subsection') {
                $headerLine = array_pop($items)['text'];
            }

            // If no item carries a `:`, render the run as a plain bulleted list.
            $allHaveColon = true;
            foreach ($rows as $r) {
                if (!str_contains($r, ':')) { $allHaveColon = false; break; }
            }
            if (!$allHaveColon) {
                if ($headerLine !== null) {
                    $items[] = ['type' => 'subsection', 'text' => $headerLine, 'gap' => true];
                }
                $items[] = ['type' => 'bulleted_list', 'rows' => $rows];
                $i = $j - 1;
                continue;
            }

            $splitRows = array_map(fn ($r) => $this->splitListItem($r), $rows);
            $header = null;
            if ($headerLine !== null) {
                $parts = array_map('trim', explode('|', $headerLine, 2));
                $header = count($parts) >= 2 ? $parts : [$headerLine];
            }
            $items[] = ['type' => 'kv_table', 'header' => $header, 'rows' => $splitRows];
            $i = $j - 1;
        }

        if (count($endLines) >= 2) {
            $items[] = ['type' => 'signatures', 'lines' => array_slice($endLines, 0, 2)];
        }

        return $items;
    }

    private function normalize(string $s): string
    {
        return preg_replace('/\s+/u', ' ', mb_strtolower(trim($s)));
    }

    /** Split "Suprafață totală: 60 m²" → ['Suprafață totală', '60 m²']. */
    private function splitListItem(string $line): array
    {
        if (preg_match('/^(.+?):\s*(.+)$/u', $line, $m)) {
            return [trim($m[1]), trim($m[2])];
        }
        return [$line, ''];
    }

    private function extractSigRole(string $line): string
    {
        if (preg_match('/^([A-ZĂÂÎȘȚ\s\(\)\/]+?)[:\s]*_/u', $line, $m)) return trim($m[1]);
        return strtok($line, ':');
    }

    private function extractSigName(string $line): string
    {
        if (preg_match('/\/\s*([^\/]+?)\s*\//', $line, $m)) {
            $name = trim($m[1]);
            return $name !== '' ? $name : '_________________';
        }
        return '_________________';
    }

    /**
     * Detect a party block line like "PROPRIETAR (LOCATOR): Ion Popescu, IDNP 200,
     * domiciliat(ă) la adresa: str. X, telefon: +373." and break it down into a
     * structured map: role + key/value pairs. Returns null if not a party block.
     */
    private function parsePartyBlock(string $line): ?array
    {
        $rolePattern = '/^((?:LOCATOR(?:UL)?|LOCATAR(?:UL)?|PROPRIETAR(?:UL)?|CHIRIA[ȘS](?:UL)?|V[ÂA]NZ[ĂA]TOR(?:UL)?|CUMP[ĂA]R[ĂA]TOR(?:UL)?|MANDANT(?:UL)?|MANDATAR(?:UL)?|PARTEA\s*\d+|PARTEA\s*[IVX]+)[A-ZĂÂÎȘȚ\s\(\)\/]*):\s+(.+?)\.?\s*$/u';
        if (! preg_match($rolePattern, $line, $m)) return null;

        $role = trim($m[1]);
        $rest = trim($m[2]);

        $rows = [];
        // Match each field in any order; consume up to next key or end-of-string.
        $fieldRe = '/\b(?:IDNP|CNP|domiciliat(?:\(ă\))?\s+la\s+adresa|adresa|telefon|email|tel\.?)\s*:?\s*([^,]+?)(?=,\s*(?:IDNP|CNP|domiciliat|adresa|telefon|email|tel\b)|$)/iu';
        if (preg_match_all($fieldRe, $rest, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER)) {
            // First slice (before first key) is the name
            $firstKeyOffset = $matches[0][0][1];
            $name = trim(rtrim(mb_substr($rest, 0, $firstKeyOffset), ', '));
            if ($name !== '') $rows[] = ['Nume, Prenume', $name];

            foreach ($matches as $mm) {
                $full = $mm[0][0];
                if (preg_match('/^(IDNP|CNP)\s*[:\s]\s*(.+)$/iu', $full, $sm)) {
                    $rows[] = [strtoupper($sm[1]), trim($sm[2])];
                } elseif (preg_match('/^domiciliat(?:\(ă\))?\s+la\s+adresa\s*:\s*(.+)$/iu', $full, $sm)) {
                    $rows[] = ['Domiciliu', trim($sm[1])];
                } elseif (preg_match('/^adresa\s*:\s*(.+)$/iu', $full, $sm)) {
                    $rows[] = ['Adresa', trim($sm[1])];
                } elseif (preg_match('/^(telefon|tel\.?)\s*:\s*(.+)$/iu', $full, $sm)) {
                    $rows[] = ['Telefon', trim($sm[2])];
                } elseif (preg_match('/^email\s*:\s*(.+)$/iu', $full, $sm)) {
                    $rows[] = ['Email', trim($sm[1])];
                }
            }
        }

        if (count($rows) < 2) return null; // Not a structured party block

        return ['role' => $role, 'rows' => $rows];
    }

    /**
     * Wrap the party-role prefix in <strong> so it stands out in prose.
     * Matches lines starting with "PROPRIETAR (LOCATOR):", "CHIRIAȘ (LOCATAR):",
     * "VÂNZĂTOR:", "PARTEA 1:" etc. — the role name is bolded, the rest stays plain.
     */
    private function boldifyRolePrefix(string $htmlEscaped): string
    {
        $roleRe = '/^((?:LOCATOR|LOCATAR|PROPRIETAR|CHIRIA[ȘS]|V[ÂA]NZ[ĂA]TOR|CUMP[ĂA]R[ĂA]TOR|MANDANT|MANDATAR|PARTEA\s*\d+|PARTEA\s*[IVX]+)[A-ZĂÂÎȘȚ\s\(\)\/]*:)\s/u';
        return preg_replace_callback($roleRe, fn ($m) => '<strong>' . $m[1] . '</strong> ', $htmlEscaped, 1);
    }

    /** Bold the "Notă:" / "Notă juridică:" prefix in note/callout lines. */
    private function boldifyNotePrefix(string $htmlEscaped): string
    {
        return preg_replace('/^(Not[ăa][^:]*:)\s/u', '<strong>$1</strong> ', $htmlEscaped, 1);
    }

    /** Bold a line entirely if it ends with `:` (label-only paragraph in a box). */
    private function boldifyTrailingColon(string $htmlEscaped): string
    {
        if (preg_match('/:\s*$/u', $htmlEscaped) && mb_strlen(strip_tags($htmlEscaped)) < 60) {
            return '<strong>' . $htmlEscaped . '</strong>';
        }
        return $htmlEscaped;
    }

    // ── 3) HTML renderer for PDF ───────────────────────────────────────────

    private function renderHtml(array $items): string
    {
        $html = '';
        foreach ($items as $it) {
            switch ($it['type']) {
                case 'city_date':
                    $html .= '<table class="city-date"><tr>'
                        . '<td class="city">' . e($it['city']) . '</td>'
                        . '<td class="date">' . e($it['date']) . '</td>'
                        . '</tr></table>';
                    break;
                case 'section':
                    $html .= '<p class="section">' . e($it['text']) . '</p>';
                    break;
                case 'subsection':
                    $html .= '<p class="subsection' . (($it['gap'] ?? false) ? ' gap' : '') . '">' . e($it['text']) . '</p>';
                    break;
                case 'numbered':
                    // Bold the leading "N.M" so subparagraphs read like the legal sablon.
                    $boldNum = preg_replace('/^(\d+\.\d+\.?)(\s+)(.+)$/u', '<b class="num">$1</b>$2$3', e($it['text']), 1);
                    $html .= '<p class="numbered' . (($it['gap'] ?? false) ? ' gap' : '') . '">' . $boldNum . '</p>';
                    break;
                case 'field':
                    $html .= '<p class="field' . (($it['gap'] ?? false) ? ' gap' : '') . '">' . e($it['text']) . '</p>';
                    break;
                case 'subtitle':
                    $html .= '<p class="subtitle">' . e($it['text']) . '</p>';
                    break;
                case 'kv_table':
                    $html .= '<table class="kv-table">';
                    if (!empty($it['header'])) {
                        $h = $it['header'];
                        if (count($h) >= 2) {
                            $html .= '<tr><td class="kv-hdr">' . e($h[0]) . '</td>'
                                  .  '<td class="kv-hdr">' . e($h[1]) . '</td></tr>';
                        } else {
                            $html .= '<tr><td class="kv-hdr" colspan="2">' . e($h[0]) . '</td></tr>';
                        }
                    }
                    foreach ($it['rows'] as [$k, $v]) {
                        $html .= '<tr><td class="kv-k">' . e($k) . '</td><td class="kv-v">' . e($v) . '</td></tr>';
                    }
                    $html .= '</table>';
                    break;
                case 'bulleted_list':
                    $html .= '<ul class="bullets">';
                    foreach ($it['rows'] as $row) {
                        $html .= '<li>' . e($row) . '</li>';
                    }
                    $html .= '</ul>';
                    break;
                case 'checkbox_list':
                    $html .= '<table class="checkbox-list"><tbody>';
                    foreach ($it['rows'] as $row) {
                        $isArr  = is_array($row);
                        $text   = $isArr ? ($row['text'] ?? '')    : (string) $row;
                        $check  = $isArr ? ($row['checked'] ?? false) : false;
                        $glyph  = $check ? '☑' : '☐';
                        $cls    = $check ? 'cbx cbx-checked' : 'cbx';
                        $html  .= '<tr><td class="' . $cls . '">' . $glyph . '</td><td class="cbx-text">' . e($text) . '</td></tr>';
                    }
                    $html .= '</tbody></table>';
                    break;
                case 'empty_grid':
                    $cols     = $it['cols'];
                    $rowCount = $it['row_count'];
                    $colN     = count($cols);
                    $html .= '<table class="empty-grid">';
                    $html .= '<tr>';
                    foreach ($cols as $c) {
                        $html .= '<td class="eg-hdr">' . e($c) . '</td>';
                    }
                    $html .= '</tr>';
                    for ($i = 1; $i <= $rowCount; $i++) {
                        $html .= '<tr>';
                        for ($j = 0; $j < $colN; $j++) {
                            $cellCls = $j === 0 ? 'eg-num' : 'eg-cell';
                            $cellTxt = $j === 0 ? (string) $i : '&nbsp;';
                            $html .= '<td class="' . $cellCls . '">' . $cellTxt . '</td>';
                        }
                        $html .= '</tr>';
                    }
                    $html .= '</table>';
                    break;
                case 'note':
                    $html .= '<p class="note">' . $this->boldifyNotePrefix(e($it['text'])) . '</p>';
                    break;
                case 'callout':
                    // 3-col wrapper for left blue border + tinted background.
                    $html .= '<table class="callout-wrap"><tr>'
                        . '<td class="callout-bar"></td>'
                        . '<td class="callout-body">' . $this->boldifyNotePrefix(e($it['text'])) . '</td>'
                        . '</tr></table>';
                    break;
                case 'signature_grid':
                    $h      = $it['headers'] ?? ['', ''];
                    $rows   = $it['rows']    ?? [];
                    $title  = $it['title']   ?? 'SEMNĂTURILE PĂRȚILOR';
                    $single = $it['single']  ?? false;
                    $html  .= '<div class="sig-grid-wrap">';
                    $html  .= '<div class="sig-grid-title">' . e($title) . '</div>';
                    $sideLabel = function ($row, string $side): string {
                        if (is_array($row)) return (string) ($row[$side] ?? '');
                        return (string) $row;
                    };
                    // Split "Label: value" → bold label + plain value (value may
                    // still hold a placeholder sentinel; styled in a later pass).
                    // Empty value → just label with trailing colon (current behavior).
                    $renderSigCell = function (string $raw): string {
                        if ($raw === '') return '&nbsp;';
                        if (str_contains($raw, ':')) {
                            [$lbl, $val] = explode(':', $raw, 2);
                            $lbl = trim($lbl);
                            $val = trim($val);
                            return '<strong>' . e($lbl) . ':</strong>'
                                . ($val !== '' ? ' ' . e($val) : '');
                        }
                        return '<strong>' . e($raw) . ':</strong>';
                    };
                    if ($single) {
                        $html .= '<table class="sig-single-wrap"><tr>';
                        $html .= '<td class="sig-single-pad"></td>';
                        $html .= '<td class="sig-single-cell"><table class="sig-mini">';
                        $html .= '<tr><td class="sig-mini-hdr">' . e($h[0] ?? '') . '</td></tr>';
                        foreach ($rows as $row) {
                            $html .= '<tr><td class="sig-mini-row">' . $renderSigCell($sideLabel($row, 'left')) . '</td></tr>';
                        }
                        $html .= '</table></td>';
                        $html .= '<td class="sig-single-pad"></td>';
                        $html .= '</tr></table>';
                    } else {
                        $sides = ['left', 'right'];
                        $html .= '<table class="sig-grid"><tr>';
                        foreach ([0, 1] as $col) {
                            $html .= '<td class="sig-grid-cell"><table class="sig-mini">';
                            $html .= '<tr><td class="sig-mini-hdr">' . e($h[$col] ?? '') . '</td></tr>';
                            foreach ($rows as $row) {
                                $html .= '<tr><td class="sig-mini-row">' . $renderSigCell($sideLabel($row, $sides[$col])) . '</td></tr>';
                            }
                            $html .= '</table></td>';
                        }
                        $html .= '</tr></table>';
                    }
                    $html .= '</div>';
                    break;
                case 'center_heading':
                    $html .= '<p class="center-heading">' . e($it['text']) . '</p>';
                    break;
                case 'subhead':
                    // Italic-render parenthetical clarification at end of label.
                    $sh = preg_replace('/\s*\(([^)]+)\)\s*:?$/u', ' <em>($1)</em>', e($it['text']));
                    $html .= '<p class="subhead">' . $sh . '</p>';
                    break;
                case 'boxed':
                    $html .= '<table class="boxed">';
                    $html .= '<tr><td class="boxed-hdr">' . e($it['title']) . '</td></tr>';
                    foreach ($it['body'] as $para) {
                        $html .= '<tr><td class="boxed-body">' . $this->boldifyTrailingColon(e($para)) . '</td></tr>';
                    }
                    $html .= '</table>';
                    break;
                case 'party':
                    $html .= '<div class="party-block">'
                        . '<div class="party-role">' . e($it['data']['role']) . '</div>'
                        . '<table class="party-table">';
                    foreach ($it['data']['rows'] as [$k, $v]) {
                        $html .= '<tr><td class="party-k">' . e($k) . '</td><td class="party-v">' . e($v) . '</td></tr>';
                    }
                    $html .= '</table></div>';
                    break;
                case 'prose':
                    $cls = 'prose' . (($it['gap'] ?? false) ? ' gap' : '');
                    $html .= '<p class="' . $cls . '">' . $this->boldifyRolePrefix(e($it['text'])) . '</p>';
                    break;
                case 'signatures':
                    [$a, $b] = $it['lines'];
                    $html .= '<table class="signatures"><tr>'
                        . '<td><div class="sig-role">' . e($this->extractSigRole($a)) . '</div>'
                        .   '<div class="sig-line">' . e($this->extractSigName($a)) . ' &nbsp;·&nbsp; Semnătură</div></td>'
                        . '<td><div class="sig-role">' . e($this->extractSigRole($b)) . '</div>'
                        .   '<div class="sig-line">' . e($this->extractSigName($b)) . ' &nbsp;·&nbsp; Semnătură</div></td>'
                        . '</tr></table>';
                    break;
            }
        }
        return $html;
    }

    // ── 4) DOCX builder ────────────────────────────────────────────────────

    /**
     * Build a Word-compatible .docx blob: ZIP with [Content_Types].xml,
     * relationships, styles, the document body, a running page header
     * (title left, "city · date" right), and a page-numbered footer.
     */
    private function buildDocx(array $items, string $title, string $headerCity = '', string $headerDate = ''): string
    {
        // Convert sentinel placeholders to plain "[name]" before items reach
        // any docx*() helper. The DOCX path renders to XML, not HTML, and the
        // \x02/\x03 control chars would corrupt the document otherwise.
        $items = $this->stripPlaceholderSentinels($items);

        $tmp = tempnam(sys_get_temp_dir(), 'docx_');
        $zip = new \ZipArchive();
        $zip->open($tmp, \ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>
XML);

        $zip->addFromString('_rels/.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
XML);

        $zip->addFromString('word/_rels/document.xml.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>
XML);

        $zip->addFromString('word/styles.xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
<w:sz w:val="24"/><w:szCs w:val="24"/>
<w:lang w:val="ro-RO"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr>
<w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="120"/>
</w:pPr></w:pPrDefault>
</w:docDefaults>
</w:styles>
XML);

        // Footer: "Pagina X din Y" centered.
        $zip->addFromString('word/footer1.xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p>
<w:pPr>
<w:jc w:val="center"/>
<w:spacing w:before="0" w:after="0"/>
<w:rPr><w:sz w:val="18"/></w:rPr>
</w:pPr>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:t xml:space="preserve">Pagina </w:t></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:instrText xml:space="preserve">PAGE</w:instrText></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:t xml:space="preserve"> din </w:t></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:instrText xml:space="preserve">NUMPAGES</w:instrText></w:r>
<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
</w:p>
</w:ftr>
XML
        );

        // Running header: doc title (italic gray) left, "city · date" right.
        $titleEsc = $this->xmlEsc($title);
        $rightBits = array_filter([$headerCity, $headerDate], fn ($s) => $s !== '');
        $rightEsc  = $this->xmlEsc(implode(' · ', $rightBits));
        $zip->addFromString('word/header1.xml', <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p>
<w:pPr>
<w:tabs><w:tab w:val="right" w:pos="9072"/></w:tabs>
<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="D4D4D4"/></w:pBdr>
<w:spacing w:before="0" w:after="0"/>
</w:pPr>
<w:r><w:rPr><w:i/><w:sz w:val="19"/><w:color w:val="595959"/></w:rPr><w:t xml:space="preserve">{$titleEsc}</w:t></w:r>
<w:r><w:tab/></w:r>
<w:r><w:rPr><w:i/><w:sz w:val="19"/><w:color w:val="595959"/></w:rPr><w:t xml:space="preserve">{$rightEsc}</w:t></w:r>
</w:p>
</w:hdr>
XML
        );

        $body = $this->docxTitleHeader($title) . $this->renderDocxBody($items);

        // A4 = 11906 × 16838 twips. Margins: top 3cm=1701, bottom 2.4cm=1361,
        // right 2cm=1134, left 2.8cm=1588. Header 1.4cm=794, footer 1cm=567.
        $sectPr = '<w:sectPr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<w:headerReference w:type="default" r:id="rId3"/>'
            . '<w:footerReference w:type="default" r:id="rId2"/>'
            . '<w:pgSz w:w="11906" w:h="16838"/>'
            . '<w:pgMar w:top="1701" w:right="1134" w:bottom="1361" w:left="1588" w:header="794" w:footer="567" w:gutter="0"/>'
            . '</w:sectPr>';

        $document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:body>' . $body . $sectPr . '</w:body></w:document>';

        $zip->addFromString('word/document.xml', $document);
        $zip->close();

        $bytes = file_get_contents($tmp);
        @unlink($tmp);
        return $bytes;
    }

    /**
     * Top-of-document title block: large bold uppercase, centered, no underline.
     * Matches the visual weight of the reference PDF.
     */
    private function docxTitleHeader(string $title): string
    {
        $font     = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $titleEsc = $this->xmlEsc($title);

        return '<w:p>'
            . '<w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="200"/></w:pPr>'
            . '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="44"/><w:szCs w:val="44"/><w:caps/><w:spacing w:val="40"/><w:color w:val="1F3864"/></w:rPr>'
            . '<w:t xml:space="preserve">' . $titleEsc . '</w:t></w:r>'
            . '</w:p>';
    }

    private function renderDocxBody(array $items): string
    {
        $out = '';
        $defaultFont = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $line115     = '<w:spacing w:line="276" w:lineRule="auto"/>';

        foreach ($items as $it) {
            switch ($it['type']) {
                case 'city_date':
                    // Two-column tab: city left, date right via right-tab at 9072 twips.
                    $cityEsc = $this->xmlEsc($it['city']);
                    $dateEsc = $this->xmlEsc($it['date']);
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:tabs><w:tab w:val="right" w:pos="9072"/></w:tabs></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">' . $cityEsc . '</w:t></w:r>'
                        . '<w:r><w:tab/></w:r>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">' . $dateEsc . '</w:t></w:r>'
                        . '</w:p>'
                        . '<w:p><w:pPr>' . $line115 . '</w:pPr></w:p>';
                    break;

                case 'section':
                    // 12pt bold uppercase, dark-blue, left aligned
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:spacing w:before="320" w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:caps/><w:color w:val="1F3864"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t>'
                        . '</w:r></w:p>';
                    break;

                case 'subsection':
                    // 10.5pt bold uppercase, dark-blue (label above tables)
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:spacing w:before="240" w:after="100" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:b/><w:sz w:val="21"/><w:caps/><w:color w:val="1F3864"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t>'
                        . '</w:r></w:p>';
                    break;

                case 'numbered':
                    // Justified body paragraph with bold leading "N.M" number.
                    $text = $it['text'];
                    if (preg_match('/^(\d+\.\d+\.?)(\s+)(.+)$/u', $text, $m)) {
                        $numEsc  = $this->xmlEsc($m[1]);
                        $tailEsc = $this->xmlEsc($m[2] . $m[3]);
                        $runs = '<w:r><w:rPr>' . $defaultFont . '<w:b/><w:sz w:val="22"/></w:rPr>'
                            .   '<w:t xml:space="preserve">' . $numEsc . '</w:t></w:r>'
                            . '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="22"/></w:rPr>'
                            .   '<w:t xml:space="preserve">' . $tailEsc . '</w:t></w:r>';
                    } else {
                        $runs = '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="22"/></w:rPr>'
                            .   '<w:t xml:space="preserve">' . $this->xmlEsc($text) . '</w:t></w:r>';
                    }
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:jc w:val="both"/><w:spacing w:before="40" w:after="80" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . $runs
                        . '</w:p>';
                    break;

                case 'field':
                    // Left, slight indent, no first-line
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:ind w:left="284"/><w:spacing w:before="0" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="22"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t>'
                        . '</w:r></w:p>';
                    break;

                case 'prose':
                    $isLong = mb_strlen($it['text']) > 80;
                    $align  = $isLong ? '<w:jc w:val="both"/>' : '';
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . $align . '<w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:sz w:val="22"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t>'
                        . '</w:r></w:p>';
                    break;

                case 'subtitle':
                    $out .= '<w:p>'
                        . '<w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="320"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:i/><w:sz w:val="22"/><w:color w:val="595959"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t></w:r>'
                        . '</w:p>';
                    break;
                case 'kv_table':
                    $out .= $this->docxKvTable($it['rows'], $it['header'] ?? null);
                    break;
                case 'bulleted_list':
                    $out .= $this->docxBulletedList($it['rows']);
                    break;
                case 'checkbox_list':
                    $out .= $this->docxCheckboxList($it['rows']);
                    break;
                case 'empty_grid':
                    $out .= $this->docxEmptyGrid($it['cols'], $it['row_count']);
                    break;
                case 'note':
                    $out .= $this->docxNote($it['text']);
                    break;
                case 'callout':
                    $out .= $this->docxCallout($it['text']);
                    break;
                case 'signature_grid':
                    $out .= $this->docxSignatureGrid(
                        $it['title']    ?? 'SEMNĂTURILE PĂRȚILOR',
                        $it['headers']  ?? ['', ''],
                        $it['rows']     ?? [],
                        $it['single']   ?? false,
                    );
                    break;
                case 'center_heading':
                    $out .= '<w:p>'
                        . '<w:pPr><w:jc w:val="center"/>' . $line115 . '<w:spacing w:before="280" w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . '<w:r><w:rPr>' . $defaultFont . '<w:b/><w:sz w:val="22"/><w:caps/><w:color w:val="1F3864"/></w:rPr>'
                        . '<w:t xml:space="preserve">' . $this->xmlEsc($it['text']) . '</w:t></w:r>'
                        . '</w:p>';
                    break;
                case 'subhead':
                    // Mixed-case bold dark-blue label, italic gray for parenthetical.
                    $text = $it['text'];
                    $rest  = $text;
                    $paren = '';
                    if (preg_match('/^(.+?)\s*\(([^)]+)\)\s*:?$/u', $text, $m)) {
                        $rest  = rtrim($m[1], ':') . ':';
                        $paren = ' (' . $m[2] . ')';
                    }
                    $runs = '<w:r><w:rPr>' . $defaultFont . '<w:b/><w:sz w:val="21"/><w:color w:val="1F3864"/></w:rPr>'
                          . '<w:t xml:space="preserve">' . $this->xmlEsc($rest) . '</w:t></w:r>';
                    if ($paren !== '') {
                        $runs .= '<w:r><w:rPr>' . $defaultFont . '<w:i/><w:sz w:val="21"/><w:color w:val="555555"/></w:rPr>'
                              .  '<w:t xml:space="preserve">' . $this->xmlEsc($paren) . '</w:t></w:r>';
                    }
                    $out .= '<w:p>'
                        . '<w:pPr>' . $line115 . '<w:spacing w:before="240" w:after="80" w:line="276" w:lineRule="auto"/></w:pPr>'
                        . $runs
                        . '</w:p>';
                    break;
                case 'boxed':
                    $out .= $this->docxBoxed($it['title'], $it['body']);
                    break;
                case 'party':
                    $out .= $this->docxPartyTable($it['data']);
                    break;
                case 'signatures':
                    [$a, $b] = $it['lines'];
                    $out .= $this->docxSignatureBlock(
                        $this->extractSigRole($a), $this->extractSigName($a),
                        $this->extractSigRole($b), $this->extractSigName($b)
                    );
                    break;
            }
        }
        return $out;
    }

    /**
     * Generic key-value table for characteristics / financial blocks. If a
     * header is provided (1 or 2 columns), it renders as a dark-blue band
     * with centered white text — matching the reference legal sablon.
     */
    private function docxKvTable(array $rows, ?array $header = null): string
    {
        $font  = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $body  = '';

        // Optional header row (1 or 2 cells, gridSpan=2 when single).
        if (!empty($header)) {
            $hdrCell = function (string $text, ?int $gridSpan) use ($font) {
                $cellW   = $gridSpan === 2 ? 9072 : 4536;
                $span    = $gridSpan ? '<w:gridSpan w:val="' . $gridSpan . '"/>' : '';
                return '<w:tc>'
                    . '<w:tcPr><w:tcW w:w="' . $cellW . '" w:type="dxa"/>' . $span
                    .   '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
                    .   '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="1F3864"/></w:tcBorders>'
                    . '</w:tcPr>'
                    . '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
                    .   '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="22"/><w:color w:val="FFFFFF"/><w:spacing w:val="20"/></w:rPr>'
                    .   '<w:t xml:space="preserve">' . $this->xmlEsc($text) . '</w:t></w:r>'
                    . '</w:p>'
                    . '</w:tc>';
            };
            if (count($header) >= 2) {
                $body .= '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
                    . $hdrCell($header[0], null)
                    . $hdrCell($header[1], null)
                    . '</w:tr>';
            } else {
                $body .= '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
                    . $hdrCell($header[0], 2)
                    . '</w:tr>';
            }
        }

        foreach ($rows as [$k, $v]) {
            $kEsc = $this->xmlEsc($k);
            $vEsc = $this->xmlEsc((string) $v);
            $body .= '<w:tr>'
                . '<w:tc><w:tcPr><w:tcW w:w="3175" w:type="dxa"/></w:tcPr>'
                .   '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/><w:color w:val="111111"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $kEsc . '</w:t></w:r></w:p></w:tc>'
                . '<w:tc><w:tcPr><w:tcW w:w="5897" w:type="dxa"/></w:tcPr>'
                .   '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . '<w:i/><w:sz w:val="22"/><w:color w:val="555555"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $vEsc . '</w:t></w:r></w:p></w:tc>'
                . '</w:tr>';
        }
        return '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblBorders>'
            .   '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:insideV w:val="none" w:sz="0"/>'
            . '</w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="3175"/><w:gridCol w:w="5897"/></w:tblGrid>'
            . $body
            . '</w:tbl>'
            . '<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
    }

    /**
     * Multi-column empty table with N numbered rows. First col holds 1..N,
     * other cells are empty for manual filling after print.
     */
    private function docxEmptyGrid(array $cols, int $rowCount): string
    {
        $font  = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $colN  = count($cols);
        // Distribute 9072 dxa across columns: narrow first col (700), rest equal.
        $firstW = 700;
        $restW  = (int) (($colN - 1) > 0 ? (9072 - $firstW) / ($colN - 1) : 9072);
        $gridXml = '<w:tblGrid><w:gridCol w:w="' . $firstW . '"/>';
        for ($i = 1; $i < $colN; $i++) $gridXml .= '<w:gridCol w:w="' . $restW . '"/>';
        $gridXml .= '</w:tblGrid>';

        // Header row (dark-blue band)
        $hdrCells = '';
        foreach ($cols as $idx => $c) {
            $w = $idx === 0 ? $firstW : $restW;
            $hdrCells .= '<w:tc>'
                . '<w:tcPr><w:tcW w:w="' . $w . '" w:type="dxa"/>'
                .   '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
                . '</w:tcPr>'
                . '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
                .   '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="22"/><w:color w:val="FFFFFF"/><w:spacing w:val="20"/></w:rPr>'
                .   '<w:t xml:space="preserve">' . $this->xmlEsc($c) . '</w:t></w:r>'
                . '</w:p>'
                . '</w:tc>';
        }
        $body = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' . $hdrCells . '</w:tr>';

        // N data rows: first col with number, rest blank (taller cells)
        for ($i = 1; $i <= $rowCount; $i++) {
            $rowCells = '';
            for ($j = 0; $j < $colN; $j++) {
                $w = $j === 0 ? $firstW : $restW;
                $align = $j === 0 ? '<w:jc w:val="center"/>' : '';
                $bold  = $j === 0 ? '<w:b/>' : '';
                $text  = $j === 0 ? (string) $i : '';
                $rowCells .= '<w:tc>'
                    . '<w:tcPr><w:tcW w:w="' . $w . '" w:type="dxa"/></w:tcPr>'
                    . '<w:p><w:pPr>' . $align . '<w:spacing w:before="180" w:after="180"/></w:pPr>'
                    .   '<w:r><w:rPr>' . $font . $bold . '<w:sz w:val="22"/></w:rPr>'
                    .   '<w:t xml:space="preserve">' . $this->xmlEsc($text) . '</w:t></w:r>'
                    . '</w:p>'
                    . '</w:tc>';
            }
            $body .= '<w:tr>' . $rowCells . '</w:tr>';
        }

        return '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblBorders>'
            .   '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/>'
            . '</w:tblBorders></w:tblPr>'
            . $gridXml
            . $body
            . '</w:tbl>'
            . '<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
    }

    /**
     * Info-box: dark-blue header band on top + one or more body paragraphs.
     * Auto-bolds short label-only lines that end with `:`.
     */
    private function docxBoxed(string $title, array $body): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $rows = '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
            . '<w:tc><w:tcPr><w:tcW w:w="9072" w:type="dxa"/>'
            .   '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
            .   '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="1F3864"/></w:tcBorders>'
            . '</w:tcPr>'
            . '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
            .   '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="22"/><w:color w:val="FFFFFF"/><w:spacing w:val="20"/></w:rPr>'
            .   '<w:t xml:space="preserve">' . $this->xmlEsc($title) . '</w:t></w:r>'
            . '</w:p>'
            . '</w:tc></w:tr>';
        foreach ($body as $p) {
            $bold = preg_match('/:\s*$/u', $p) && mb_strlen($p) < 60 ? '<w:b/>' : '';
            $rows .= '<w:tr>'
                . '<w:tc><w:tcPr><w:tcW w:w="9072" w:type="dxa"/></w:tcPr>'
                .   '<w:p><w:pPr><w:spacing w:before="80" w:after="80" w:line="288" w:lineRule="auto"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . $bold . '<w:sz w:val="22"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $this->xmlEsc($p) . '</w:t></w:r>'
                . '</w:p></w:tc></w:tr>';
        }
        return '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblBorders>'
            .   '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
            .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:insideV w:val="none" w:sz="0"/>'
            . '</w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="9072"/></w:tblGrid>'
            . $rows
            . '</w:tbl>'
            . '<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
    }

    /**
     * Highlighted callout box: light-blue tinted single-cell table with a
     * dark-blue left bar. Auto-bolds a "Notă...:" prefix in dark blue.
     */
    private function docxCallout(string $text): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $prefix = '';
        $rest   = $text;
        if (preg_match('/^(Not[ăa][^:]*:)\s+(.+)$/u', $text, $m)) {
            $prefix = $m[1];
            $rest   = $m[2];
        }
        $runs = '';
        if ($prefix !== '') {
            $runs .= '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/><w:color w:val="1F3864"/></w:rPr>'
                  .  '<w:t xml:space="preserve">' . $this->xmlEsc($prefix) . ' </w:t></w:r>';
        }
        $runs .= '<w:r><w:rPr>' . $font . '<w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr>'
              .  '<w:t xml:space="preserve">' . $this->xmlEsc($rest) . '</w:t></w:r>';

        return '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblBorders>'
            .   '<w:left w:val="single" w:sz="24" w:color="1F3864"/>'
            .   '<w:top w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/>'
            .   '<w:insideH w:val="none" w:sz="0"/><w:insideV w:val="none" w:sz="0"/>'
            . '</w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="9072"/></w:tblGrid>'
            . '<w:tr>'
            . '<w:tc>'
            . '<w:tcPr><w:tcW w:w="9072" w:type="dxa"/>'
            .   '<w:shd w:val="clear" w:color="auto" w:fill="EEF2FA"/>'
            . '</w:tcPr>'
            . '<w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="288" w:lineRule="auto"/></w:pPr>'
            . $runs
            . '</w:p>'
            . '</w:tc></w:tr></w:tbl>'
            . '<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
    }

    /** Italic gray note paragraph, with bold "Notă:" prefix. */
    private function docxNote(string $text): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        // Split off "Notă:" / "Nota:" prefix to render it bold.
        $prefix = '';
        $rest   = $text;
        if (preg_match('/^(Not[ăa]:)\s+(.+)$/u', $text, $m)) {
            $prefix = $m[1];
            $rest   = $m[2];
        }
        $runs = '';
        if ($prefix !== '') {
            $runs .= '<w:r><w:rPr>' . $font . '<w:b/><w:i/><w:sz w:val="19"/><w:color w:val="111111"/></w:rPr>'
                  .  '<w:t xml:space="preserve">' . $this->xmlEsc($prefix) . ' </w:t></w:r>';
        }
        $runs .= '<w:r><w:rPr>' . $font . '<w:i/><w:sz w:val="19"/><w:color w:val="555555"/></w:rPr>'
              .  '<w:t xml:space="preserve">' . $this->xmlEsc($rest) . '</w:t></w:r>';

        return '<w:p>'
            . '<w:pPr><w:spacing w:before="80" w:after="160"/></w:pPr>'
            . $runs
            . '</w:p>';
    }

    /** Checkbox list (☐ item). Each line is one paragraph with a Unicode checkbox. */
    private function docxCheckboxList(array $rows): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $out  = '';
        foreach ($rows as $r) {
            $isArr = is_array($r);
            $text  = $isArr ? ($r['text'] ?? '')       : (string) $r;
            $glyph = ($isArr && !empty($r['checked'])) ? '☑' : '☐';
            $out .= '<w:p>'
                . '<w:pPr><w:ind w:left="720" w:hanging="280"/><w:spacing w:before="0" w:after="40" w:line="276" w:lineRule="auto"/></w:pPr>'
                . '<w:r><w:rPr>' . $font . '<w:sz w:val="22"/></w:rPr>'
                .   '<w:t xml:space="preserve">' . $glyph . '  ' . $this->xmlEsc($text) . '</w:t></w:r>'
                . '</w:p>';
        }
        return $out;
    }

    /** Bulleted list (• item). Each line is one paragraph with a Unicode bullet. */
    private function docxBulletedList(array $rows): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $out  = '';
        foreach ($rows as $r) {
            $out .= '<w:p>'
                . '<w:pPr><w:ind w:left="720" w:hanging="280"/><w:spacing w:before="0" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr>'
                . '<w:r><w:rPr>' . $font . '<w:sz w:val="22"/></w:rPr>'
                .   '<w:t xml:space="preserve">•  ' . $this->xmlEsc($r) . '</w:t></w:r>'
                . '</w:p>';
        }
        return $out;
    }

    /**
     * Centered title + signature mini-tables. With `$single = true`, renders one
     * centered mini-table at half page width (single signatory). Otherwise two
     * side-by-side mini-tables (two signatories).
     */
    private function docxSignatureGrid(string $title, array $headers, array $rows, bool $single = false): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';

        $titleP = '<w:p>'
            . '<w:pPr><w:jc w:val="center"/><w:spacing w:before="400" w:after="200"/></w:pPr>'
            . '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="28"/><w:color w:val="1F3864"/><w:spacing w:val="20"/></w:rPr>'
            . '<w:t xml:space="preserve">' . $this->xmlEsc($title) . '</w:t></w:r>'
            . '</w:p>';

        $sideLabel = function ($r, string $side): string {
            if (is_array($r)) return (string) ($r[$side] ?? '');
            return (string) $r;
        };
        // Build one mini table cell as a nested table inside an outer 2-col table cell.
        $miniTable = function (string $hdr, string $side) use ($font, $rows, $sideLabel) {
            $hdrRow = '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
                . '<w:tc>'
                . '<w:tcPr><w:tcW w:w="4400" w:type="dxa"/>'
                .   '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
                .   '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="1F3864"/></w:tcBorders>'
                . '</w:tcPr>'
                . '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
                .   '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="22"/><w:color w:val="FFFFFF"/><w:spacing w:val="20"/></w:rPr>'
                .   '<w:t xml:space="preserve">' . $this->xmlEsc($hdr) . '</w:t></w:r>'
                . '</w:p>'
                . '</w:tc></w:tr>';
            $rowsXml = '';
            foreach ($rows as $r) {
                $label = $sideLabel($r, $side);
                $text  = $label === '' ? '' : ($label . ':');
                $rowsXml .= '<w:tr>'
                    . '<w:tc><w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>'
                    .   '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr>'
                    .     '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/></w:rPr>'
                    .     '<w:t xml:space="preserve">' . $this->xmlEsc($text) . '</w:t></w:r>'
                    . '</w:p></w:tc>'
                    . '</w:tr>';
            }
            return '<w:tbl>'
                . '<w:tblPr><w:tblW w:w="4400" w:type="dxa"/>'
                . '<w:tblBorders>'
                .   '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
                .   '<w:insideV w:val="none" w:sz="0"/>'
                . '</w:tblBorders></w:tblPr>'
                . '<w:tblGrid><w:gridCol w:w="4400"/></w:tblGrid>'
                . $hdrRow . $rowsXml
                . '</w:tbl>';
        };

        if ($single) {
            // Single mini-table centered (half-page width).
            $outer = '<w:tbl>'
                . '<w:tblPr><w:tblW w:w="4400" w:type="dxa"/><w:jc w:val="center"/>'
                . '<w:tblBorders>'
                .   '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
                .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
                .   '<w:insideV w:val="none" w:sz="0"/>'
                . '</w:tblBorders></w:tblPr>'
                . '<w:tblGrid><w:gridCol w:w="4400"/></w:tblGrid>'
                . '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
                . '<w:tc>'
                .   '<w:tcPr><w:tcW w:w="4400" w:type="dxa"/>'
                .   '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
                .   '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="1F3864"/></w:tcBorders>'
                .   '</w:tcPr>'
                .   '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . '<w:b/><w:caps/><w:sz w:val="22"/><w:color w:val="FFFFFF"/><w:spacing w:val="20"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $this->xmlEsc($headers[0] ?? '') . '</w:t></w:r>'
                .   '</w:p>'
                . '</w:tc></w:tr>';
            foreach ($rows as $r) {
                $label = $sideLabel($r, 'left');
                $text  = $label === '' ? '' : ($label . ':');
                $outer .= '<w:tr>'
                    . '<w:tc><w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>'
                    .   '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr>'
                    .     '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/></w:rPr>'
                    .     '<w:t xml:space="preserve">' . $this->xmlEsc($text) . '</w:t></w:r>'
                    . '</w:p></w:tc></w:tr>';
            }
            $outer .= '</w:tbl>';
            return $titleP . $outer;
        }

        $outerRow = '<w:tr>'
            . '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/>'
            . '<w:tcBorders><w:top w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:left w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/></w:tcBorders>'
            . '</w:tcPr>' . $miniTable($headers[0] ?? '', 'left') . '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>'
            . '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/>'
            . '<w:tcBorders><w:top w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:left w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/></w:tcBorders>'
            . '</w:tcPr>' . $miniTable($headers[1] ?? '', 'right') . '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>'
            . '</w:tr>';

        $outer = '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>'
            . '<w:tblBorders>'
            . '<w:top w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:left w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/>'
            . '<w:insideH w:val="none" w:sz="0"/><w:insideV w:val="none" w:sz="0"/>'
            . '</w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>'
            . $outerRow
            . '</w:tbl>';

        return $titleP . $outer;
    }

    /**
     * Party block as a 2-col table: bold dark-blue labels left, values right.
     * Mirrors the legal-template reference layout.
     */
    private function docxPartyTable(array $data): string
    {
        $font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';

        // Role heading — centered bold above the table
        $out = '<w:p>'
            . '<w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="80"/></w:pPr>'
            . '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="24"/><w:caps/></w:rPr>'
            . '<w:t xml:space="preserve">' . $this->xmlEsc($data['role']) . '</w:t></w:r>'
            . '</w:p>';

        // Borderless 2-col table
        $rows = '';
        foreach ($data['rows'] as [$k, $v]) {
            $kEsc = $this->xmlEsc($k);
            $vEsc = $this->xmlEsc((string) $v);
            $rows .= '<w:tr>'
                . '<w:tc><w:tcPr><w:tcW w:w="3175" w:type="dxa"/></w:tcPr>'
                .   '<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/><w:color w:val="1F3864"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $kEsc . '</w:t></w:r></w:p></w:tc>'
                . '<w:tc><w:tcPr><w:tcW w:w="5897" w:type="dxa"/></w:tcPr>'
                .   '<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>'
                .     '<w:r><w:rPr>' . $font . '<w:sz w:val="22"/></w:rPr>'
                .     '<w:t xml:space="preserve">' . $vEsc . '</w:t></w:r></w:p></w:tc>'
                . '</w:tr>';
        }

        $out .= '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:jc w:val="center"/>'
            . '<w:tblBorders>'
            .   '<w:top w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:bottom w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/>'
            .   '<w:left w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/>'
            .   '<w:insideV w:val="none" w:sz="0"/>'
            . '</w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="3175"/><w:gridCol w:w="5897"/></w:tblGrid>'
            . $rows
            . '</w:tbl>'
            . '<w:p><w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr></w:p>';

        return $out;
    }

    /**
     * Two-column signature block as a borderless table in DOCX.
     */
    private function docxSignatureBlock(string $roleA, string $nameA, string $roleB, string $nameB): string
    {
        $font  = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
        $cell  = function (string $role, string $name) use ($font) {
            return '<w:tc>'
                . '<w:tcPr><w:tcW w:w="4536" w:type="dxa"/></w:tcPr>'
                . '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'
                .   '<w:r><w:rPr>' . $font . '<w:b/><w:sz w:val="22"/><w:caps/></w:rPr><w:t xml:space="preserve">' . $this->xmlEsc($role) . '</w:t></w:r>'
                . '</w:p>'
                . '<w:p><w:pPr><w:spacing w:before="1000" w:after="0"/><w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="111111"/></w:pBdr></w:pPr>'
                .   '<w:r><w:rPr>' . $font . '<w:sz w:val="21"/><w:color w:val="444444"/></w:rPr><w:t xml:space="preserve">' . $this->xmlEsc($name) . '  ·  Semnătură</w:t></w:r>'
                . '</w:p>'
                . '</w:tc>';
        };
        return '<w:p><w:pPr><w:spacing w:before="600" w:after="0"/></w:pPr></w:p>'
            . '<w:tbl>'
            . '<w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:tblBorders>'
            . '<w:top w:val="none" w:sz="0"/><w:left w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/>'
            . '<w:insideH w:val="none" w:sz="0"/><w:insideV w:val="none" w:sz="0"/></w:tblBorders></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="4536"/><w:gridCol w:w="4536"/></w:tblGrid>'
            . '<w:tr>' . $cell($roleA, $nameA) . $cell($roleB, $nameB) . '</w:tr>'
            . '</w:tbl>';
    }

    private function xmlEsc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /**
     * Recursively rewrite sentinel placeholders (\x02PH:name\x03) in a
     * structure array to plain "[name]" strings. Used before DOCX rendering
     * because the control chars cannot appear in XML 1.0 documents.
     */
    private function stripPlaceholderSentinels(array $items): array
    {
        $walk = function ($val) use (&$walk) {
            if (is_string($val)) {
                return preg_replace_callback('/\x02PH:(\w+)\x03/', function ($m) {
                    return '[' . $this->placeholderLabel($m[1]) . ']';
                }, $val);
            }
            if (is_array($val)) {
                return array_map($walk, $val);
            }
            return $val;
        };
        return array_map($walk, $items);
    }

    /**
     * Strip an `@title TEXT` directive from the rendered content and return
     * [$contentWithoutDirective, $displayTitle]. When no directive is found,
     * the template name is used as the title (fallback).
     */
    private function extractTitleOverride(string $rendered, string $defaultTitle): array
    {
        $lines = preg_split("/\r?\n/", $rendered);
        $out   = [];
        $title = $defaultTitle;
        foreach ($lines as $idx => $line) {
            if ($idx < 3 && preg_match('/^@title\s+(.+)$/u', trim($line), $m)) {
                $title = trim($m[1]);
                continue;
            }
            $out[] = $line;
        }
        return [implode("\n", $out), $title];
    }

    /** Extract a city label for the running page header from contract data. */
    private function headerCity(array $data): string
    {
        foreach (['oras', 'localitate', 'city'] as $k) {
            if (!empty($data[$k])) return (string) $data[$k];
        }
        return '[localitate]';
    }

    /** Format the contract date as "14 mai 2026" for the running page header. */
    private function headerDate(array $data): string
    {
        foreach (['data_contractului', 'data_contract', 'data'] as $k) {
            if (empty($data[$k])) continue;
            $raw = (string) $data[$k];
            if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $raw, $m)) {
                $mm = (int) $m[2];
                if ($mm >= 1 && $mm <= 12) {
                    return ltrim($m[1], '0') . ' ' . self::RO_MONTHS[$mm - 1] . ' ' . $m[3];
                }
            }
            if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $raw, $m)) {
                $mm = (int) $m[2];
                if ($mm >= 1 && $mm <= 12) {
                    return ltrim($m[3], '0') . ' ' . self::RO_MONTHS[$mm - 1] . ' ' . $m[1];
                }
            }
            return $raw;
        }
        return '[ZZ luna AAAA]';
    }
}
