<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.7; }
    .page { padding: 36px 50px 70px; }
    .hdr { width: 100%; border-collapse: collapse; border-bottom: 2px solid #1E3A8A; margin-bottom: 0; }
    .hdr td { vertical-align: middle; padding-bottom: 12px; }
    .agency-name { font-size: 13pt; font-weight: bold; color: #1E3A8A; }
    .agency-sub { font-size: 8pt; color: #555; margin-top: 2px; }
    .doc-meta { font-size: 8pt; color: #555; text-align: right; line-height: 1.6; }
    .doc-title { text-align: center; margin: 20px 0 18px; }
    .doc-title h1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .preview-notice { font-size: 8pt; color: #1d4ed8; margin-top: 5px; }
    .content { white-space: pre-wrap; font-size: 10.5pt; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 5px 50px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .ftr-tbl { width: 100%; border-collapse: collapse; }
    .ftr-tbl td { font-size: 7.5pt; color: #888; vertical-align: middle; }
    .verify-box { display: inline-block; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-family: DejaVu Sans Mono, monospace; font-size: 7.5pt; color: #475569; float: right; }
</style>
</head>
<body>
<div class="page">

    {{-- ── Header ── --}}
    <table class="hdr">
        <tr>
            <td>
                @if(($agency->logo_path ?? null) && !($isPreview ?? false))
                    <img src="{{ public_path('storage/' . $agency->logo_path) }}" style="max-height:44px;max-width:110px;margin-bottom:3px;" alt="">
                    <br>
                @endif
                <div class="agency-name">{{ $agency->name ?? 'REALTIX' }}</div>
                @if($agency->settings['address'] ?? null)
                    <div class="agency-sub">{{ $agency->settings['address'] }}</div>
                @endif
                @if($agency->settings['phone'] ?? null)
                    <div class="agency-sub">Tel: {{ $agency->settings['phone'] }}</div>
                @endif
                @if($agency->settings['email'] ?? null)
                    <div class="agency-sub">{{ $agency->settings['email'] }}</div>
                @endif
            </td>
            <td class="doc-meta" style="width:170px;">
                @if($agency->settings['fiscal_code'] ?? null)
                    <div>IDNO: {{ $agency->settings['fiscal_code'] }}</div>
                @endif
                @if($agency->settings['director'] ?? null)
                    <div>Dir: {{ $agency->settings['director'] }}</div>
                @endif
                <div style="margin-top:4px;">
                    Nr. doc: <strong>{{ $verifyCode ?? '—' }}</strong>
                </div>
                <div>Data: {{ now()->format('d.m.Y') }}</div>
            </td>
        </tr>
    </table>

    {{-- ── Document title ── --}}
    <div class="doc-title">
        <h1>{{ $title }}</h1>
        @if($isPreview ?? false)
            <div class="preview-notice">[ PREVIZUALIZARE — câmpurile evidențiate vor fi completate la generare ]</div>
        @endif
    </div>

    {{-- ── Content ── --}}
    <div class="content">{!! $content !!}</div>

</div>

{{-- ── Footer ── --}}
<div class="footer">
    <table class="ftr-tbl">
        <tr>
            <td>Document generat prin REALTIX &bull; {{ now()->format('d.m.Y H:i') }}</td>
            <td>
                @if($verifyCode ?? null)
                    <div class="verify-box">COD: {{ $verifyCode }}</div>
                @endif
            </td>
        </tr>
    </table>
</div>
</body>
</html>
