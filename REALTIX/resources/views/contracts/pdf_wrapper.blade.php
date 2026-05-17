<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<style>
    /* ─── Layout spec — match `Sablon_Contract_de_inchiriere.pdf` ─────────────
       Font:        Times New Roman (PDF: DejaVu Serif — Unicode RO)
       Body:        11pt, line-height 1.35, justify, first-line indent 0
       Main title:  22pt bold uppercase centered, dark blue (#1F3864)
       Subtitle:    italic gray (#595959) centered 11pt
       Section:     12pt bold uppercase dark blue (left-aligned)
       Subsection:  10pt bold uppercase dark blue (left-aligned, smaller)
       Table hdr:   centered white text on dark blue (#1F3864) background
       Table body:  bold blue label (35%) + italic gray placeholder text (65%)
       Margins:     A4, 2.3cm left + right (symmetric), 1.8cm top, 2.0cm bottom
       Running hdr: doc title left, "city · date" right, italic gray, thin rule
       Footer:      "Pagina X din Y" centered
       ─────────────────────────────────────────────────────────────────────── */
    html, body { margin: 0; padding: 0; }
    /* dompdf 3.x parses @page margin from CSS — we set it generously enough
       to reserve the running-header band on EVERY page (continuation pages
       respect @page top margin while body { margin-top } applies only to
       the first page). */
    /* Symmetric side margins (~2.3cm) so the content has equal breathing room
       on both edges — looks more balanced than the legacy 2.8cm/2.0cm split. */
    @page { size: A4; margin: 50pt 65pt 57pt 65pt; }
    /* Push the first paragraph below the running header band on the first
       page; subsequent pages share the same compressed top margin from
       dompdf's internal default, which still leaves room for the band. */
    .doc-title { padding-top: 18pt; }
    body {
        font-family: "DejaVu Serif", "Liberation Serif", "Times New Roman", Times, serif;
        font-size: 11pt;
        color: #111;
        line-height: 1.35;
    }

    /* ─── Document title block ───────────────────────────────────────────── */
    .doc-title { text-align: center; margin: 8pt 0 14pt; }
    .doc-title h1 { font-size: 22pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; color: #1F3864; }
    .subtitle { text-align: center; font-style: italic; color: #595959; font-size: 11pt; margin: 4pt 0 18pt; }

    /* ─── Section / subsection ────────────────────────────────────────────── */
    .content p.section    { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #1F3864; letter-spacing: 0.3px; margin: 16pt 0 8pt; }
    .content p.subsection { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #1F3864; letter-spacing: 0.3px; margin: 12pt 0 6pt; }

    /* ─── Paragraphs ──────────────────────────────────────────────────────── */
    .content p          { margin: 0 0 6pt 0; text-align: left; }
    .content p.prose    { text-align: justify; text-justify: inter-word; margin-bottom: 7pt; }
    .content p.numbered { text-align: justify; text-justify: inter-word; margin: 4pt 0 6pt; }
    .content p.field    { text-align: left; padding-left: 0.5cm; margin-bottom: 3pt; }
    .content p.gap      { margin-top: 10pt; }
    .content p.empty    { height: 6pt; }

    /* Make the leading "1.1 / 2.3 / etc." number bold in numbered subparas. */
    .content p.numbered b.num { font-weight: bold; }

    /* ─── Tables (kv) ──────────────────────────────────────────────────────── */
    .kv-table { width: 100%; border-collapse: collapse; margin: 6pt 0 14pt; border: 0.5pt solid #cbd5e1; }
    .kv-table td {
        padding: 6pt 10pt;
        font-size: 10.5pt;
        border-bottom: 0.5pt solid #e2e8f0;
        vertical-align: middle;
    }
    .kv-table tr:last-child td { border-bottom: none; }
    .kv-table td.kv-hdr {
        background: #1F3864;
        color: #ffffff;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11pt;
        padding: 8pt 10pt;
        border-bottom: none;
    }
    .kv-table td.kv-k { width: 35%; font-weight: bold; color: #111; }
    .kv-table td.kv-v { width: 65%; color: #555; font-style: italic; }

    /* ─── Bulleted lists ──────────────────────────────────────────────────── */
    .content ul.bullets { margin: 4pt 0 8pt 1.2cm; padding: 0; list-style: disc outside; }
    .content ul.bullets li { font-size: 11pt; margin: 0 0 3pt 0; padding-left: 4pt; line-height: 1.35; }

    /* ─── Checkbox list (☐ item) ──────────────────────────────────────────── */
    .checkbox-list { width: auto; border-collapse: collapse; margin: 4pt 0 8pt 0.7cm; }
    .checkbox-list td { padding: 1pt 0; font-size: 11pt; vertical-align: top; }
    .checkbox-list td.cbx { width: 14pt; font-size: 11pt; padding-right: 6pt; }
    .checkbox-list td.cbx-text { padding-left: 4pt; }

    /* ─── Multi-column empty table (N numbered rows, manual-fill) ──────── */
    .empty-grid { width: 100%; border-collapse: collapse; margin: 6pt 0 14pt; border: 0.5pt solid #cbd5e1; }
    .empty-grid td {
        padding: 7pt 8pt;
        font-size: 10.5pt;
        border: 0.5pt solid #e2e8f0;
        vertical-align: middle;
    }
    .empty-grid td.eg-hdr {
        background: #1F3864;
        color: #ffffff;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11pt;
        padding: 8pt 8pt;
        border-color: #1F3864;
    }
    .empty-grid td.eg-num { width: 8%; text-align: center; font-weight: bold; color: #111; }
    .empty-grid td.eg-cell { color: #555; min-height: 14pt; }

    /* ─── Note / small print (italic gray, bold "Notă:" prefix) ────────── */
    .content p.note { font-size: 9.5pt; color: #555; font-style: italic; margin: 6pt 0 10pt; }
    .content p.note strong { font-weight: bold; color: #111; font-style: italic; }

    /* ─── Sub-heading (mixed-case dark-blue bold label) ──────────────── */
    .content p.subhead { font-size: 10.5pt; font-weight: bold; color: #1F3864; margin: 14pt 0 4pt; }
    .content p.subhead em { font-weight: normal; font-style: italic; color: #555; }

    /* ─── Info box (header band + multi-paragraph body, e.g. "RUBRICĂ NOTARIALĂ") ── */
    .boxed { width: 100%; border-collapse: collapse; margin: 14pt 0 12pt; border: 0.5pt solid #cbd5e1; page-break-inside: avoid; }
    .boxed td.boxed-hdr {
        background: #1F3864;
        color: #ffffff;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11pt;
        padding: 8pt 10pt;
    }
    .boxed td.boxed-body { padding: 8pt 14pt; font-size: 10.5pt; line-height: 1.45; border-top: 0.5pt solid #e2e8f0; }
    .boxed td.boxed-body strong { color: #111; }

    /* ─── Callout (highlighted note box, e.g. "Notă juridică: ...") ───── */
    .callout-wrap { width: 100%; border-collapse: collapse; margin: 10pt 0 14pt; }
    .callout-wrap td.callout-bar  { width: 4pt; background: #1F3864; padding: 0; }
    .callout-wrap td.callout-body { background: #EEF2FA; color: #1f2937; font-size: 10.5pt; padding: 10pt 14pt; line-height: 1.4; }
    .callout-wrap td.callout-body strong { color: #1F3864; font-weight: bold; }

    /* ─── Signature grid ──────────────────────────────────────────────────── */
    .sig-grid-wrap { page-break-inside: avoid; margin-top: 12pt; }
    .sig-grid-title { text-align: center; font-size: 14pt; font-weight: bold; color: #1F3864; text-transform: uppercase; letter-spacing: 0.5px; margin: 14pt 0 12pt; }
    .sig-grid { width: 100%; border-collapse: collapse; }
    .sig-grid td.sig-grid-cell { vertical-align: top; width: 50%; padding: 0 4pt; }
    /* Single-signatory variant: 3-column wrapper centers the mini-table. */
    .sig-single-wrap { width: 100%; border-collapse: collapse; }
    .sig-single-wrap td.sig-single-pad  { width: 25%; padding: 0; }
    .sig-single-wrap td.sig-single-cell { width: 50%; padding: 0; }
    /* Centered subsection (e.g. CONFIRMARE DE PRIMIRE). */
    .content p.center-heading { text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #1F3864; letter-spacing: 0.4px; margin: 20pt 0 10pt; }
    .sig-mini { width: 100%; border-collapse: collapse; border: 0.5pt solid #cbd5e1; }
    .sig-mini td { padding: 7pt 10pt; font-size: 10.5pt; border-bottom: 0.5pt solid #e2e8f0; }
    .sig-mini tr:last-child td { border-bottom: none; }
    .sig-mini td.sig-mini-hdr {
        background: #1F3864;
        color: #ffffff;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11pt;
        padding: 8pt 10pt;
        border-bottom: none;
    }
    /* Label is wrapped in <strong> by the renderer; value (after `:`) stays
       in normal weight — matches the "Denumire: IMPERIO SRL" Sablon look. */
    .sig-mini td.sig-mini-row { font-weight: normal; color: #111; padding-top: 12pt; padding-bottom: 12pt; }
    .sig-mini td.sig-mini-row strong { font-weight: bold; }

    /* ─── Legacy party block (single-line "PROPRIETAR: ..." templates) ────── */
    .party-block { margin: 12pt 0; }
    .party-role  { font-weight: bold; font-size: 11pt; text-align: center; padding-bottom: 6pt; text-transform: uppercase; letter-spacing: 0.4px; color: #1F3864; }
    .party-table { width: 100%; border-collapse: collapse; margin: 0 auto; }
    .party-table td { padding: 4pt 8pt; font-size: 10.5pt; border-bottom: 0.5pt solid #e2e8f0; vertical-align: top; }
    .party-table td.party-k { width: 35%; font-weight: bold; color: #1F3864; }
    .party-table td.party-v { width: 65%; }

    /* ─── Legacy signatures (trailing "_______ / name /" lines) ──────────── */
    .signatures { margin-top: 28pt; width: 100%; border-collapse: collapse; page-break-inside: avoid; }
    .signatures td { width: 50%; vertical-align: top; padding: 0 6pt; }
    .sig-role { font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 48pt; font-size: 11pt; }
    .sig-line { border-top: 0.75pt solid #111; padding-top: 4pt; font-size: 10pt; color: #444; }

    /* ─── City + date pair (legacy templates) ─────────────────────────────── */
    .city-date { width: 100%; margin: 0 0 14pt 0; border-collapse: collapse; }
    .city-date td { font-size: 11pt; padding: 0; }
    .city-date .city { text-align: left; }
    .city-date .date { text-align: right; }

    .preview-notice { font-size: 9pt; color: #1d4ed8; margin-top: 6pt; font-style: italic; }

    /* ─── Preview mode: simulate an A4 sheet in the browser ──────────────────
       Only applies when body has .preview-mode (set when $isPreview=true).
       dompdf ignores these because they reference a body class never set
       during PDF generation. ─────────────────────────────────────────────── */
    body.preview-mode {
        background: #e5e7eb;
        padding: 28px 0;
        min-height: 100vh;
    }
    body.preview-mode .a4-page {
        width: 210mm;
        min-height: 297mm;
        background: #ffffff;
        margin: 0 auto;
        padding: 17.6mm 22.9mm 20.1mm 22.9mm;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
        box-sizing: border-box;
        position: relative;
    }
    body.preview-mode .a4-running-header {
        position: absolute;
        top: 5mm;
        left: 22.9mm;
        right: 22.9mm;
        font-family: "DejaVu Serif", "Liberation Serif", "Times New Roman", Times, serif;
        font-size: 8.5pt;
        font-style: italic;
        color: #666;
        display: flex;
        justify-content: space-between;
        border-bottom: 0.4pt solid #e0e0e0;
        padding-bottom: 4pt;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    body.preview-mode .a4-running-header .left  { text-align: left; }
    body.preview-mode .a4-running-header .right { text-align: right; }

    /* Footer "Pagina X din Y" is drawn via dompdf canvas in the page_script
       at the bottom of the wrapper — using position: fixed with a negative
       bottom value here breaks @page margin processing in dompdf 3.x. */
</style>
</head>
<body class="{{ ($isPreview ?? false) ? 'preview-mode' : '' }}">

@php
    $bits      = array_filter([$headerCity ?? '', $headerDate ?? ''], fn ($s) => $s !== '');
    $rightText = implode(' · ', $bits);
    // Running header uses `$runningTitle` (template->name in proper case) to
    // avoid the all-caps `@title` value leaking into the page-edge band.
    $hdrLeft   = $runningTitle ?? $title;
    // Escape for safe inclusion inside the page_script PHP source string.
    $leftPhp   = addslashes($hdrLeft);
    $rightPhp  = addslashes($rightText);
    $isPreview = $isPreview ?? false;
@endphp

@if($isPreview)
<div class="a4-page">
    <div class="a4-running-header">
        <span class="left">{{ $hdrLeft }}</span>
        <span class="right">{{ $rightText }}</span>
    </div>
@endif

{{-- ── Document title ── --}}
<div class="doc-title">
    <h1>{{ $title }}</h1>
    @if($isPreview)
        <div class="preview-notice">[ PREVIZUALIZARE — câmpurile evidențiate vor fi completate la generare ]</div>
    @endif
</div>

{{-- ── Body ── --}}
<div class="content">{!! $contentHtml ?? nl2br(e($content)) !!}</div>

@if($isPreview)
</div>
@endif

{{-- ── Running page header + page-numbered footer — drawn on EVERY page
       via dompdf canvas. Must come AFTER all body content so all pages
       exist in `$pdf->_pages` when page_script iterates over them.

       dompdf 3.x silently ignores `@page { margin-top }` once the body
       contains a long flow with tables/scripts, so we position the running
       header tight against the page edge (y=14pt) where it cleanly sits in
       the page-top whitespace generated by dompdf's internal default. ── --}}
<script type="text/php">
if (isset($pdf)) {
    $pdf->page_script('
        $fontItalic = $fontMetrics->getFont("DejaVu Serif", "italic");
        $fontReg    = $fontMetrics->getFont("DejaVu Serif", "normal");
        $hdrColor   = [0.40, 0.40, 0.40];
        $ftrColor   = [0.47, 0.47, 0.47];
        $left  = "{!! $leftPhp !!}";
        $right = "{!! $rightPhp !!}";

        $marginL = 65;     // 2.3cm left margin in pt — must match @page
        $marginR = 65;     // 2.3cm right margin in pt — must match @page
        $pageW   = $pdf->get_width();
        $pageH   = $pdf->get_height();

        // ── Running header (italic gray text + thin rule) at very top edge.
        $hdrY    = 14;
        $rightW  = $fontMetrics->getTextWidth($right, $fontItalic, 8.5);
        $pdf->text($marginL, $hdrY, $left, $fontItalic, 8.5, $hdrColor);
        $pdf->text($pageW - $marginR - $rightW, $hdrY, $right, $fontItalic, 8.5, $hdrColor);
        $pdf->line($marginL, $hdrY + 12, $pageW - $marginR, $hdrY + 12, [0.88, 0.88, 0.88], 0.4);

        // ── Footer: "Pagina X din Y" centered.
        $ftrText = "Pagina " . $PAGE_NUM . " din " . $PAGE_COUNT;
        $ftrW    = $fontMetrics->getTextWidth($ftrText, $fontReg, 9);
        $pdf->text(($pageW - $ftrW) / 2, $pageH - 32, $ftrText, $fontReg, 9, $ftrColor);
    ');
}
</script>

</body>
</html>
