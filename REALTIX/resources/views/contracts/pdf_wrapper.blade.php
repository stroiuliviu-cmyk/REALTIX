<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
    .page { padding: 40px 50px; }
    .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .header p { font-size: 9pt; color: #555; margin-top: 4px; }
    .content { white-space: pre-wrap; }
    .footer { position: fixed; bottom: 20px; left: 50px; right: 50px; border-top: 1px solid #ccc;
              padding-top: 8px; font-size: 8pt; color: #888; text-align: center; }
    p { margin-bottom: 10px; }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>REALTIX &bull; {{ now()->format('d.m.Y') }}</p>
    </div>
    <div class="content">{!! $content !!}</div>
</div>
<div class="footer">Document generat automat prin REALTIX &bull; {{ now()->format('d.m.Y H:i') }}</div>
</body>
</html>
