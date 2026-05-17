<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContractTemplate;
use App\Models\GeneratedContract;
use App\Models\Property;
use App\Services\PdfContractService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ContractTemplateController extends Controller
{
    private const TYPES = 'sale,rent,mandate,advance,handover,viewing_sheet,gdpr_consent,exclusive,'
        . 'termination,service_act,power_of_attorney,service_buyer,service_seller,transaction_assist';

    public function index(): Response
    {
        $templates = ContractTemplate::latest()->get();

        $generated = GeneratedContract::with(['template', 'property', 'contact', 'user'])
            ->latest()
            ->limit(20)
            ->get();

        $properties = Property::select('id', 'title', 'address', 'city', 'district', 'price', 'currency', 'rooms', 'area_total', 'area_living', 'floor', 'floors_total', 'meta')
            ->latest()
            ->limit(300)
            ->get();

        $contacts = Contact::select('id', 'first_name', 'last_name', 'phone', 'email')
            ->latest()
            ->limit(300)
            ->get();

        return Inertia::render('Contracts/Index', [
            'templates'  => $templates,
            'generated'  => $generated,
            'properties' => $properties,
            'contacts'   => $contacts,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'type'    => 'required|in:' . self::TYPES,
            'locale'  => 'required|in:ro,ru',
            'content' => 'required|string',
        ]);

        ContractTemplate::create(array_merge($data, [
            'agency_id' => $request->user()->agency_id,
        ]));

        return back()->with('success', 'Șablonul a fost creat.');
    }

    public function update(Request $request, ContractTemplate $contractTemplate)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'type'    => 'required|in:' . self::TYPES,
            'locale'  => 'required|in:ro,ru',
            'content' => 'required|string',
        ]);

        $contractTemplate->update($data);

        return back()->with('success', 'Șablonul a fost actualizat.');
    }

    public function destroy(ContractTemplate $contractTemplate)
    {
        $contractTemplate->delete();
        return back()->with('success', 'Șablonul a fost șters.');
    }

    public function installDefaults(Request $request)
    {
        $agency = $request->user()->agency;
        if (! $agency) {
            return back()->with('error', 'Nu ai o agenție asociată.');
        }

        $count = \App\Services\DefaultContractTemplates::install($agency);

        return back()->with('success', "S-au instalat {$count} șabloane standard în biblioteca ta.");
    }

    /**
     * Extract text from a .docx and return it as JSON — no DB write. Used by
     * the in-editor "Încarcă .docx" button to fill the content field without
     * committing a new template.
     */
    public function extractDocx(Request $request)
    {
        $request->validate([
            'file' => [
                'required', 'file', 'max:5120',
                function ($attribute, $value, $fail) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (! in_array($ext, ['docx', 'doc'], true)) {
                        $fail('Fișierul trebuie să fie .docx sau .doc.');
                    }
                },
            ],
        ]);

        $text = $this->extractDocxText($request->file('file')->getRealPath());

        if (! $text) {
            return response()->json(['error' => 'Nu am putut citi fișierul .docx.'], 422);
        }

        return response()->json([
            'content' => $text,
            'length'  => strlen($text),
        ]);
    }

    public function uploadDocx(Request $request)
    {
        $request->validate([
            // Don't use `mimes:docx,doc` — finfo on Windows often reports a .docx
            // as application/zip (it IS a zip internally) so Laravel's MIME check
            // rejects valid files. Validate by client extension; extractDocxText()
            // fails gracefully on contents that aren't a real docx.
            'file'   => [
                'required', 'file', 'max:5120',
                function ($attribute, $value, $fail) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (! in_array($ext, ['docx', 'doc'], true)) {
                        $fail('Fișierul trebuie să fie .docx sau .doc.');
                    }
                },
            ],
            'name'   => 'nullable|string|max:255',
            'type'   => 'required|in:' . self::TYPES,
            'locale' => 'required|in:ro,ru',
        ]);

        $file = $request->file('file');
        $text = $this->extractDocxText($file->getRealPath());

        if (! $text) {
            return back()->with('error', 'Nu am putut citi fișierul .docx. Verifică că nu e corupt.');
        }

        $name = $request->name ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        ContractTemplate::create([
            'agency_id' => $request->user()->agency_id,
            'name'      => $name,
            'type'      => $request->type,
            'locale'    => $request->locale,
            'content'   => $text,
        ]);

        return back()->with('success', 'Șablonul „' . $name . '" a fost încărcat cu succes (' . number_format(strlen($text)) . ' caractere).');
    }

    /**
     * Extract plain text from .docx using ZipArchive + DOMDocument (no extra deps).
     * .docx is a ZIP containing word/document.xml; text is in <w:t> nodes.
     * Tables are preserved as REALTIX template syntax: ALL-CAPS section header,
     * then `- key: value` rows for 2-column tables, `- col1 | col2 | …` for wider.
     * Falls back to shell `unzip` if PHP zip extension is unavailable.
     */
    private function extractDocxText(string $path): ?string
    {
        $xml = null;

        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive();
            if ($zip->open($path) === true) {
                $xml = $zip->getFromName('word/document.xml') ?: null;
                $zip->close();
            }
        }

        // Fallback: try `unzip -p <file> word/document.xml`
        if (! $xml && function_exists('shell_exec')) {
            $escaped = escapeshellarg($path);
            $output  = @shell_exec("unzip -p {$escaped} word/document.xml 2>nul");
            if ($output && strlen($output) > 100) {
                $xml = $output;
            }
        }

        if (! $xml) {
            return null;
        }

        $dom = new \DOMDocument();
        // Suppress libxml warnings on namespace-only quirks in well-formed docx.
        $ok = @$dom->loadXML($xml, LIBXML_NONET | LIBXML_NOWARNING | LIBXML_NOERROR);
        if (! $ok || ! $dom->documentElement) {
            return $this->extractDocxTextFallback($xml);
        }

        $body = $dom->getElementsByTagName('body')->item(0);
        if (! $body) {
            return $this->extractDocxTextFallback($xml);
        }

        $lines = [];
        foreach ($body->childNodes as $node) {
            if ($node->nodeType !== XML_ELEMENT_NODE) continue;
            $local = $node->localName;
            if ($local === 'p') {
                $lines[] = $this->docxParagraphText($node);
            } elseif ($local === 'tbl') {
                $lines[] = ''; // blank line before each table — visual separator
                foreach ($this->docxTableLines($node) as $tl) {
                    $lines[] = $tl;
                }
                $lines[] = ''; // blank line after table
            }
        }

        // Heuristic: rescue legacy docx (or other-source docx) that encodes
        // tables as paragraphs — pair `LABEL` + `VALUE` after an ALL-CAPS
        // header into `- LABEL: VALUE` rows so the editor renders them as
        // a kv-table instead of a flat list.
        $lines = $this->pairFieldValueLines($lines);

        $text = implode("\n", $lines);
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        return trim($text);
    }

    /**
     * Walk extracted lines and detect "ALL-CAPS HEADER → label / value /
     * label / value …" sequences (paragraph-encoded tables). Convert each
     * label+value pair into a `- label: value` row that the template parser
     * groups into a styled kv-table. Stops collecting as soon as a line
     * doesn't look like a short field label or value — defensive against
     * pairing free-flowing prose by accident.
     */
    private function pairFieldValueLines(array $lines): array
    {
        $out = [];
        $n   = count($lines);
        $i   = 0;
        while ($i < $n) {
            $line = $lines[$i];
            $trim = trim($line);
            $out[] = $line;
            $i++;
            if (! $this->isAllCapsHeading($trim)) continue;

            // After a heading, try to pair the following short lines.
            // Short ALL-CAPS labels like IDNP/IDNO/CNP are intentionally
            // allowed — only LONG (≥10 chars) ALL-CAPS lines break the run
            // because they mark a new section.
            while ($i + 1 < $n) {
                $label = trim($lines[$i]     ?? '');
                $value = trim($lines[$i + 1] ?? '');
                if ($label === '' || $value === '')                                  break;
                if (mb_strlen($label) > 50 || mb_strlen($value) > 200)               break;
                if (str_starts_with($label, '- '))                                   break;
                if (preg_match('/^\d+\./', $label))                                  break; // "1. OBIECTUL"
                if (preg_match('/^\d+\.\d+/', $label))                               break; // "1.1 ..."
                if (preg_match('/\.\s*$/u', $label))                                 break; // sentence end (allows inline "nr.", "et.")
                if (mb_strlen($label) >= 10 && $this->isAllCapsHeading($label))      break; // new section
                $out[] = '- ' . $label . ': ' . $value;
                $i += 2;
            }
        }
        return $out;
    }

    /** ALL-CAPS line with at least one letter; max ~80 chars. */
    private function isAllCapsHeading(string $s): bool
    {
        if ($s === '' || mb_strlen($s) > 80)                  return false;
        if (mb_strtoupper($s, 'UTF-8') !== $s)                return false;
        return (bool) preg_match('/\p{L}/u', $s);
    }

    /** Concatenate all <w:t> runs inside a paragraph, preserving tabs/breaks. */
    private function docxParagraphText(\DOMElement $p): string
    {
        $text = '';
        foreach ($p->getElementsByTagName('*') as $node) {
            $name = $node->localName;
            if ($name === 't') {
                $text .= $node->textContent;
            } elseif ($name === 'tab') {
                $text .= "\t";
            } elseif ($name === 'br') {
                $text .= "\n";
            }
        }
        return $text;
    }

    /**
     * Convert a <w:tbl> into template-syntax lines:
     *   - 1-cell ALL-CAPS first row → emit as section header (becomes table-header
     *     in the rendered PDF/DOCX);
     *   - 2-cell row → `- left: right` (key/value table row);
     *   - 3+ cell row → `- c1 | c2 | c3` (wide table row).
     */
    private function docxTableLines(\DOMElement $tbl): array
    {
        // Signature-pattern shortcut: outer 1-row 2-cell table where each
        // cell wraps a nested <w:tbl>. REALTIX's docxSignatureGrid emits
        // this shape; convert back to `@sig L | R` + `- l | r` rows.
        if ($sig = $this->detectSignatureBlock($tbl)) {
            return $sig;
        }

        $lines = [];
        $first = true;
        foreach ($tbl->childNodes as $tr) {
            if ($tr->nodeType !== XML_ELEMENT_NODE || $tr->localName !== 'tr') continue;
            $cells = [];
            foreach ($tr->childNodes as $tc) {
                if ($tc->nodeType !== XML_ELEMENT_NODE || $tc->localName !== 'tc') continue;
                $cells[] = $this->docxCellText($tc);
            }
            $filled = array_values(array_filter($cells, fn ($s) => $s !== ''));
            // Skip empty rows entirely.
            if (count($filled) === 0) {
                continue;
            }
            // ALL-CAPS first row → table header. If only one cell is filled
            // (merged-header style, or other cells empty), emit as a single
            // header; otherwise emit each filled cell separated by `|`.
            $allUpper = mb_strtoupper(implode(' ', $filled), 'UTF-8') === implode(' ', $filled);
            if ($first && $allUpper && count($filled) === 1) {
                $lines[] = $filled[0];
            } elseif ($first && $allUpper && count($filled) >= 2) {
                $lines[] = implode(' | ', $filled);
            } elseif (count($cells) === 2) {
                $lines[] = '- ' . $cells[0] . ': ' . $cells[1];
            } else {
                $lines[] = '- ' . implode(' | ', $cells);
            }
            $first = false;
        }
        return $lines;
    }

    /**
     * Concat all paragraph text inside a cell. Skips nested <w:tbl> — those
     * are picked up by detectSignatureBlock() at the parent-table level.
     */
    private function docxCellText(\DOMElement $tc): string
    {
        $parts = [];
        foreach ($tc->childNodes as $sub) {
            if ($sub->nodeType !== XML_ELEMENT_NODE) continue;
            if ($sub->localName === 'p') {
                $parts[] = trim($this->docxParagraphText($sub));
            }
        }
        return trim(implode(' ', array_filter($parts, fn ($s) => $s !== '')));
    }

    /**
     * Detect the "signature grid" Word-table shape (1 row × 2 cells, each
     * cell holds a nested <w:tbl>). Return the template-syntax representation
     * (`@sig L | R`, then `- l | r` rows) or null if shape doesn't match.
     */
    private function detectSignatureBlock(\DOMElement $tbl): ?array
    {
        $rows = [];
        foreach ($tbl->childNodes as $tr) {
            if ($tr->nodeType === XML_ELEMENT_NODE && $tr->localName === 'tr') {
                $rows[] = $tr;
            }
        }
        if (count($rows) !== 1) return null;

        $cells = [];
        foreach ($rows[0]->childNodes as $tc) {
            if ($tc->nodeType === XML_ELEMENT_NODE && $tc->localName === 'tc') {
                $cells[] = $tc;
            }
        }
        if (count($cells) !== 2) return null;

        $leftTbl  = $this->firstNestedTable($cells[0]);
        $rightTbl = $this->firstNestedTable($cells[1]);
        if (! $leftTbl || ! $rightTbl) return null;

        $leftRows  = $this->extractInnerTableRows($leftTbl);
        $rightRows = $this->extractInnerTableRows($rightTbl);
        if (empty($leftRows) || empty($rightRows)) return null;

        $leftHeader  = array_shift($leftRows);
        $rightHeader = array_shift($rightRows);

        $out   = ['@sig ' . $leftHeader . ' | ' . $rightHeader];
        $count = max(count($leftRows), count($rightRows));
        for ($i = 0; $i < $count; $i++) {
            $l = rtrim($leftRows[$i]  ?? '', ': ');
            $r = rtrim($rightRows[$i] ?? '', ': ');
            $out[] = '- ' . $l . ' | ' . $r;
        }
        return $out;
    }

    private function firstNestedTable(\DOMElement $tc): ?\DOMElement
    {
        foreach ($tc->childNodes as $child) {
            if ($child->nodeType === XML_ELEMENT_NODE && $child->localName === 'tbl') {
                return $child;
            }
        }
        return null;
    }

    /** Flatten an inner-table to one trimmed text string per row. */
    private function extractInnerTableRows(\DOMElement $tbl): array
    {
        $rows = [];
        foreach ($tbl->childNodes as $tr) {
            if ($tr->nodeType !== XML_ELEMENT_NODE || $tr->localName !== 'tr') continue;
            $cellTexts = [];
            foreach ($tr->childNodes as $tc) {
                if ($tc->nodeType !== XML_ELEMENT_NODE || $tc->localName !== 'tc') continue;
                $cellTexts[] = $this->docxCellText($tc);
            }
            $rows[] = trim(implode(' ', array_filter($cellTexts, fn ($s) => $s !== '')));
        }
        return $rows;
    }

    /** Pre-DOMDocument fallback (legacy strip-tags approach) for malformed XML. */
    private function extractDocxTextFallback(string $xml): string
    {
        $xml = str_replace(
            ['</w:p>', '<w:tab/>', '<w:br/>'],
            ["\n",     "\t",       "\n"],
            $xml
        );
        $text = strip_tags($xml);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/\n{3,}/", "\n\n", $text);
        return trim($text);
    }

    public function preview(ContractTemplate $contractTemplate, PdfContractService $pdf): \Illuminate\Http\Response
    {
        [$displayTitle, $contentHtml] = $pdf->previewHtml($contractTemplate);

        $html = view('contracts.pdf_wrapper', [
            'content'     => '',
            'contentHtml' => $contentHtml,
            'title'       => $displayTitle,
            'agency'      => auth()->user()?->agency,
            'verifyCode'  => 'PREVIZUALIZARE',
            'headerCity'  => '[localitate]',
            'headerDate'  => '[ZZ luna AAAA]',
            'isPreview'   => true,
        ])->render();

        return response($html, 200)->header('Content-Type', 'text/html; charset=utf-8');
    }

    public function generate(Request $request, ContractTemplate $contractTemplate, PdfContractService $pdf)
    {
        $data = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'contact_id'  => 'nullable|exists:contacts,id',
            'fields'      => 'nullable|array',
        ]);

        $fillData                = $data['fields'] ?? [];
        $fillData['property_id'] = $data['property_id'] ?? null;
        $fillData['contact_id']  = $data['contact_id'] ?? null;

        // Defaults from chosen property — only fill blanks. Any value the user
        // edited in the modal takes priority (sent in `fields[]`).
        $fillBlank = function (string $key, $value) use (&$fillData) {
            if (empty($fillData[$key]) && $value !== null && $value !== '') {
                $fillData[$key] = $value;
            }
        };

        if ($fillData['property_id']) {
            $p = Property::find($fillData['property_id']);
            if ($p) {
                $fillBlank('adresa_proprietate',  $p->address);
                $fillBlank('titlu_proprietate',   $p->title);
                $fillBlank('oras',                $p->city);
                $fillBlank('sector',              $p->district);
                $fillBlank('pret',                $p->price);
                $fillBlank('valuta',              $p->currency ?? 'EUR');
                $fillBlank('numar_camere',        $p->rooms);
                $fillBlank('suprafata',           $p->area_total);
                $fillBlank('suprafata_locuibila', $p->area_living);
                $fillBlank('etaj',                $p->floor);
                $fillBlank('total_etaje',         $p->floors_total);
                $fillBlank('numar_cadastral',     $p->meta['cadastre_number'] ?? null);
            }
        }

        if ($fillData['contact_id']) {
            $c = Contact::find($fillData['contact_id']);
            if ($c) {
                $fillBlank('nume_client',    trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? '')));
                $fillBlank('telefon_client', $c->phone);
                $fillBlank('email_client',   $c->email);
                $fillBlank('adresa_client',  $c->address ?? ($c->meta['address'] ?? null));
                $fillBlank('idnp_client',    $c->meta['idnp'] ?? null);
                $fillBlank('cnp_client',     $c->meta['idnp'] ?? ($c->meta['cnp'] ?? null));
            }
        }

        $user                    = $request->user();
        $agency                  = $user->agency;
        $fillData['nume_agent']  = $user->name ?? '';
        $fillData['email_agent'] = $user->email ?? '';
        $fillData['nume_agentie'] = $agency?->name ?? 'REALTIX';

        if (empty($fillData['data_contractului'])) {
            $fillData['data_contractului'] = now()->format('d.m.Y');
        }

        $contract = $pdf->generate($contractTemplate, $fillData, $user->id, $agency);

        return back()->with('success', 'Contractul a fost generat cu succes.');
    }

    /**
     * Download a generated contract as .docx. Builds the file on-the-fly for
     * legacy rows that only have pdf_path (older contracts pre-docx support).
     */
    public function downloadDocx(GeneratedContract $generatedContract, PdfContractService $pdf)
    {
        // Lazy-build when missing
        if (! $generatedContract->docx_path || ! Storage::disk('public')->exists($generatedContract->docx_path)) {
            $path = $pdf->generateDocxFor($generatedContract);
            $generatedContract->update(['docx_path' => $path]);
        }

        $absPath = Storage::disk('public')->path($generatedContract->docx_path);
        $name    = ($generatedContract->template?->name ?? 'contract') . '.docx';

        return response()->download($absPath, $name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }
}
