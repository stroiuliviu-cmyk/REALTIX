<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Invitație REALTIX</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:30px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

<tr><td style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:30px 40px;text-align:center;">
    <div style="font-size:26px;font-weight:bold;color:white;letter-spacing:2px;font-family:'Montserrat',Arial,sans-serif;">REALTIX</div>
    <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">Imobiliare. Inteligent. Rapid.</div>
</td></tr>

<tr><td style="padding:36px 40px;">
    <h1 style="margin:0 0 18px;font-size:22px;color:#0f172a;">Salut! 👋</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
        <strong>{{ $invitedBy->name }}</strong> te invită să te alături agenției
        <strong style="color:#1d4ed8;">{{ $agency->name }}</strong> pe platforma REALTIX.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        Vei avea rolul de <strong>{{ $invitation->role === 'admin' ? 'Administrator' : 'Agent imobiliar' }}</strong>
        și acces la toate proprietățile, contactele și instrumentele agenției.
    </p>

    <div style="text-align:center;margin:30px 0;">
        <a href="{{ $acceptUrl }}"
           style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(29,78,216,0.3);">
            ✓ Acceptă invitația
        </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
        Dacă butonul nu funcționează, copiază următorul link în browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#1d4ed8;">
        <a href="{{ $acceptUrl }}" style="color:#1d4ed8;">{{ $acceptUrl }}</a>
    </p>

    <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:20px 0;font-size:13px;color:#78350f;">
        ⏱ Această invitație expiră pe <strong>{{ $invitation->expires_at?->format('d.m.Y H:i') ?? 'fără limită' }}</strong>.
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
        Dacă nu cunoști persoana care te-a invitat sau crezi că ai primit acest email din greșeală,
        poți ignora în siguranță acest mesaj.
    </p>
</td></tr>

<tr><td style="background:#f1f5f9;padding:20px 40px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">
    <div>© {{ date('Y') }} REALTIX. Toate drepturile rezervate.</div>
    <div style="margin-top:4px;">
        <a href="{{ url('/') }}" style="color:#64748b;text-decoration:none;">{{ parse_url(url('/'), PHP_URL_HOST) }}</a>
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
