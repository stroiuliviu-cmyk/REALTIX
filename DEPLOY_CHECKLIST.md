# REALTIX — Checklist Deploy în Producție

> Generat: 2026-05-17
> Status proiect: gata pentru deploy după validarea acestui checklist.
> Target: VPS Hetzner CPX31 (Falkenstein, DE) + Laravel Forge + Cloudflare DNS.

---

## ✅ Modificări automate aplicate

### Pasul 1 — Securitate
- [x] `phpseclib/phpseclib` actualizat la **3.0.52** (CVE-2026-44167 patched)
- [x] `axios` fixat prin `npm audit fix` → **0 vulnerabilities** raportate
- [x] `.gitignore` actualizat — adăugate: `.env.local`, `/python_scraper/venv/`, `/python_scraper/__pycache__/`, `/storage/app/public/scraped/*` (whitelist `.gitkeep`)
- [x] `.env.production.example` creat în rădăcina REALTIX/ cu toate variabilele prod (Resend, Stripe LIVE, Sentry, AWS backup, Forge paths)
- [x] `composer audit --no-dev` → **No security vulnerability advisories found**
- Commit: **`35b36ff`** — *fix: security patches (phpseclib CVE-2026-44167, axios) + production env template*

### Pasul 2 — Indexes
- [x] Migrație nouă: `2026_05_17_121632_add_production_indexes.php`
- [x] **8 indexuri** noi adăugate:
  1. `users_agency_id_index`
  2. `generated_contracts_agency_id_index`
  3. `generated_contracts_template_id_index`
  4. `generated_contracts_created_at_index`
  5. `scraped_listings_type_transaction_city_index` (composit pe 3 coloane)
  6. `properties_created_at_index`
  7. `properties_updated_at_index`
  8. `contacts_agency_id_index`
- [x] Migration testat ciclu up → rollback → up; toate rulează fără erori
- Commit: **`78d0657`** — *feat(db): add production indexes for multi-tenant queries*

### Pasul 3 — Health Check
- [x] `app/Http/Controllers/HealthController.php` creat (97 linii)
- [x] Ruta `GET /health` adăugată în `routes/web.php` (public, fără middleware auth)
- [x] Testat local cu `curl http://127.0.0.1:8765/health` → JSON valid
- [x] Răspuns conține: `database`, `queue` (pending+failed), `scraper.last_run`, `scraped_today`, `disk` (% used + free GB)
- [x] Status codes: `200` (ok/degraded), `503` (down)
- Commit: **`26bdb61`** — *feat: add /health endpoint for monitoring*

> ⚠ **Notă commit 26bdb61**: commit-ul a piggyback-uit modificările pre-existente din `routes/web.php` din sesiunile anterioare (interactions edit/destroy routes, phone interactions import). Conținutul `/health` e corect și prezent; doar diff-ul commit-ului e mai mare decât așteptat. Dacă vrei istoric curat, poți face `git rebase -i HEAD~5` și split manual.

### Pasul 4 — Email Resend
- [x] `composer require resend/resend-php resend/resend-laravel` — instalat
- [x] `config/services.php` actualizat: `'resend' => ['key' => env('RESEND_KEY', env('RESEND_API_KEY'))]` (back-compat dual key)
- [x] `config/mail.php` deja avea mailer `resend` (Laravel 12 default) — fără modificări
- [x] `.env.production.example` are `MAIL_MAILER=resend` și `RESEND_KEY=`
- [x] `.env` local **neatins** — rămâne pe Brevo SMTP pentru development
- Commit: **`fec68a7`** — *feat(mail): add Resend mailer (production)*

### Pasul 5 — Deploy Scripts
- [x] `deploy/forge-deploy.sh` (1657 bytes, +x) — script Quick Deploy în 10 pași
- [x] `deploy/setup-vps.sh` (1553 bytes, +x) — setup one-shot root (firefox-esr + xvfb + python3-venv + geckodriver v0.36.0 + Python venv)
- [x] `deploy/forge-daemons.md` (812 bytes) — instrucțiuni queue worker + scheduler + Sentry alerts
- Commit: **`0ed49cf`** — *feat: add deploy scripts (Forge auto-deploy, VPS setup, daemon docs)*

---

## ⏳ Ce trebuie să fac EU MANUAL înainte de git push

### Conturi externe de creat
- [ ] **Hetzner Cloud**: https://console.hetzner.cloud — verificare ID + adăugare metodă plată
- [ ] **Laravel Forge**: https://forge.laravel.com — abonament Hobby €12/lună (1 server)
- [ ] **Resend**: https://resend.com — free tier 3000 emails/lună (sau Pro $20/lună pentru 50k)
- [ ] **Cloudflare**: https://cloudflare.com — DNS + WAF gratis
- [ ] **Sentry**: https://sentry.io — free tier 5k events/lună
- [ ] **Domeniu .md prin AGEPI**: https://www.agepi.gov.md (≈250 MDL/an, doar pentru rezidenți MD)

### Stripe — TRECE PE LIVE MODE
- [ ] Login [dashboard.stripe.com](https://dashboard.stripe.com) → toggle Test → **Live**
- [ ] Developers → API keys → copiază `sk_live_...` și `pk_live_...`
- [ ] Developers → Webhooks → **Add endpoint**: `https://realtix.md/stripe/webhook`
- [ ] Selectează events: `customer.subscription.*`, `invoice.*`, `customer.updated`
- [ ] Copiază **Signing secret** (`whsec_...`) — va merge în `STRIPE_WEBHOOK_SECRET`
- [ ] Products → Create products + prices LIVE:
  - Starter (12€/lună recurring)
  - Medium (49€/lună recurring)
  - Pro (89€/lună recurring)
  - Pro Extra Seat (15€/lună per seat)
- [ ] Copiază `price_xxx` id-urile → `STRIPE_PRICE_STARTER` etc.

### Pe Hetzner Cloud
- [ ] Creează server **CPX31** (4 vCPU, 8 GB RAM, 160 GB SSD) Ubuntu 24.04 în **Falkenstein DC**
- [ ] Adaugă SSH public key (din `~/.ssh/id_rsa.pub`)
- [ ] Notează **IP-ul public** — va fi necesar pentru DNS

### Pe Forge
- [ ] Servers → Add server → Hetzner (provide API token)
- [ ] Provision (durează ~5 min): instalează auto PHP 8.3 + PostgreSQL 17 + Redis + nginx + Supervisor
- [ ] Sites → Add site: domain `realtix.md`, project type Laravel
- [ ] Apps → Connect GitHub repository
- [ ] Set deploy branch: `main`
- [ ] Edit deploy script: paste conținutul din `REALTIX/deploy/forge-deploy.sh`
- [ ] **Quick Deploy: ON**

### Pe VPS (SSH ca root)
```bash
ssh root@<IP-hetzner>
cd /home/forge/realtix.md
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```
- [ ] Verifică ieșire: `geckodriver --version`, `firefox-esr --version`, `venv/bin/python --version`

### În Forge UI
- [ ] Site → Environment → paste conținutul din `REALTIX/.env.production.example`
- [ ] Completează **TOATE valorile goale**:
  - `APP_KEY=` → click "Generate App Key" în Forge sau `php artisan key:generate`
  - `DB_PASSWORD=` → din Forge → Database → password (auto-generated la provisioning)
  - `RESEND_KEY=` → din dashboard Resend
  - `STRIPE_*` → LIVE keys din Stripe
  - `GROQ_API_KEY=` sau `ANTHROPIC_API_KEY=` → din dashboard AI provider
  - `PORTAL_999MD_API_KEY=` → din contul 999.md Partners (dacă agency are cont)
  - `SENTRY_LARAVEL_DSN=` → din proiectul Sentry
  - `AWS_*` → R2 sau S3 pentru backup
- [ ] Site → SSL → Let's Encrypt → activează pentru `realtix.md` și `www.realtix.md`
- [ ] Site → Daemons → **Add Queue Worker** (vezi `deploy/forge-daemons.md`):
  - Command: `php8.3 /home/forge/realtix.md/artisan queue:work --sleep=3 --tries=3 --max-time=3600 --timeout=300`
  - User: `forge`, Dir: `/home/forge/realtix.md`, Processes: `2`
- [ ] Site → **Scheduler → Enable**

### DNS Cloudflare
- [ ] Add domain `realtix.md`
- [ ] Records:
  - `A @ → IP-Hetzner` (proxied)
  - `CNAME www → realtix.md` (proxied)
- [ ] SSL/TLS mode: **Full (strict)**
- [ ] Update nameservers la AGEPI (durează 24-48h propagare)

### Smoke Tests după primul deploy
- [ ] `curl https://realtix.md/health` → `{"status": "ok"}` și HTTP 200
- [ ] Browser: `https://realtix.md/register` → cont creat → email Resend primit
- [ ] Onboarding flow: agency setup → select plan → Stripe Checkout (card test `4242424242424242`)
- [ ] Stripe Dashboard → Webhooks → verifică ultimul event delivered cu status 200
- [ ] Crează property → upload poze → generează contract PDF/DOCX
- [ ] SSH pe VPS: `sudo -u www-data php artisan portal:999:scrape --pages=1 --max-ads=5`
- [ ] Verifică `SELECT COUNT(*) FROM scraped_listings WHERE source='999md'` > 0
- [ ] Forge → Logs → verifică queue:work nu are erori

### Backup automat (configurează după lansare)
- [ ] Forge → Site → Backups → daily 03:00 → push la S3 (`realtix-backup` bucket) sau R2
- [ ] Alternativă SSH: cron `pg_dump | aws s3 cp - s3://...` cu retention 7/4/12

---

## 🚨 Probleme cunoscute / TODO post-launch

- **Trial expiration flow** trebuie testat manual (14 zile) — programează un cron de monitorizare
- **Storage cleanup automat** pentru scraped images >90 zile (TODO migrare ulterioară — `scraped_listings` rows + dirs sub `storage/app/public/scraped/`)
- **GDPR cascade delete** pe user/contact (TODO observer + retention policy documentat)
- **Test coverage**: doar 11 fișiere Pest; recomandare să creștem la min 50 (contract gen, scrape extractor, subscription gates)
- **Local platform**: am folosit `--ignore-platform-req=ext-sodium` la `composer update`/`composer require` pentru că XAMPP-ul de pe Windows nu are extensia. VPS-ul Ubuntu cu PHP 8.3 are sodium nativ, deci nu e o problemă pe prod
- **Commit 26bdb61 piggyback**: `routes/web.php` avea modificări uncommit-uite anterior (interactions edit/destroy + import PhoneInteractionController), care au intrat în commit-ul de Health. Funcțional, totul lucrează corect; pentru curățenie istoric vezi notița de mai sus
- **Munca CRM uncommit-uită**: există ~50 fișiere cu modificări din sesiunile anterioare (controllere admin, modele, jobs, vederi React) — nu intră în cei 5 commit-uri de deploy. Le poți commit-ui separat sub `chore: pre-deploy CRM iteration` sau pe grupuri funcționale.

---

## Estimare timp total

- Setup conturi: **30 min**
- Provision Hetzner + Forge: **30 min**
- Setup VPS (Firefox/geckodriver/Python venv): **30 min**
- First deploy + DNS propagation: **1h** (DNS poate dura mai mult; folosește IP direct pentru smoke test inițial)
- Smoke tests: **30 min**
- Buffer pentru probleme: **2h**

**TOTAL: ~5h** de lucru, distribuite probabil pe 1-2 zile.

---

## Sumar tehnic comenzi efectuate

| Comandă | Rezultat |
|---|---|
| `composer update phpseclib/phpseclib --ignore-platform-req=ext-sodium` | 3.0.52, fără advisories |
| `composer audit --no-dev` | No vulnerabilities |
| `npm audit fix` | 0 vulnerabilities, 2 packages added |
| `php artisan make:migration add_production_indexes` | OK |
| `php artisan migrate && rollback && migrate` | Toate trec |
| `composer require resend/resend-php resend/resend-laravel` | 1.3 + 1.4 installed |
| `curl http://127.0.0.1:8765/health` (test temp server) | `{"status":"ok"}` |
| `git log --oneline -5` | 5 commit-uri noi pe `main` |
| `php artisan route:list \| grep health` | `GET\|HEAD health → HealthController@check` |
| `ls -la deploy/` | 3 fișiere, scripturile +x |
