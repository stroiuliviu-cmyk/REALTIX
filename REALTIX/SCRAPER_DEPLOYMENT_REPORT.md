# 999.md Scraper — raport de deployment

Refactor către strategia **morning initial sync + hourly incremental + night pause** pentru scraper-ul public 999.md. Toate modificările sunt în acest branch; nimic nu a fost push-uit.

## ✅ Modificări aplicate

### Scheduler ([routes/console.php](routes/console.php))
- ❌ Eliminat: `999md-today-scrape` (cron `0 */6 * * *`) și `999md-daily-wrap` (zilnic la 22:00) + helper-ul `$dailyCapHit`.
- ✅ Adăugat: `999md-morning-initial-sync`, `999md-hourly-incremental`, `scraper-watchdog`, `batch-matching`.
- ✅ Toate noile job-uri folosesc `timezone('Europe/Chisinau')` explicit, `withoutOverlapping`, `onOneServer`, `runInBackground` și `when($canRunScraper)`.

### Comenzi noi
- `portal:999:scrape:morning` — invocă Python cu `--pages=all --scope-hours=7 --download-images --mode=morning`, timeout 75 min, exit 42 → cache `scraper_blocked` (4h).
- `portal:999:scrape:hourly` — `--pages=1 --scope-hours=1 --max-ads=50 --mode=hourly`, timeout 15 min, exit 42 → cache `scraper_blocked` (2h).
- `scraper:watchdog` — citește `storage/app/scraper_heartbeat.txt`, omoară procese cu heartbeat > 15 min (cross-platform: `taskkill` pe Windows, `kill -9` pe Linux).
- `portal:999:scrape` (vechi) — rămâne **neatins** pentru rulări manuale / backwards-compat.
- `portal:999:scrape:full` — rămâne **neatins** pentru full bulk manual.

### Scraper Python ([python_scraper/scraper_999.py](python_scraper/scraper_999.py))
- ✅ `--scope-hours <N>` — filtrează anunțuri publicate în ultimele N ore (0 = no filter).
- ✅ `--mode {morning,hourly,manual}` — afectează logging, delays și warmup.
- ✅ Early-exit pentru mode `hourly`: 5 anunțuri consecutive prea vechi → break categorie.
- ✅ Mode-specific delays: morning `2.5–5s`, hourly `1.5–3s`, manual default.
- ✅ UA rotation — pool de 12 UA-uri real-world (Firefox 122-135, Chrome 130-140, Safari 17-18, Edge 132-137), random la pornire.
- ✅ Anti-fingerprint: `dom.webdriver.enabled=false`, `useAutomationExtension=false`, `media.peerconnection.enabled=false`, `intl.accept_languages=ro-MD,ro;q=0.9,ru;q=0.8,en;q=0.7`, `webgl.disabled=true`.
- ✅ Session warmup — homepage → real-estate root (doar pentru `mode=morning`).
- ✅ Block detection — patternuri `blocked|captcha|rate limit|too many requests|access denied|forbidden` pe page source → exception `ScraperBlocked` → exit code 42.
- ✅ Heartbeat — scrie `storage/app/scraper_heartbeat.txt` cu `<iso>|<pid>` la pornire și la fiecare minut, curățat în `finally`.
- ✅ Cleanup-ul `finally` e tolerant la `conn.close()` / `driver.quit()` deja apelate.

### Servicii / Jobs / Modele
- `App\Services\ScraperHealthService` — `isBlocked()`, `markSuccessfulRun()`, `getLastSuccessfulRun()`, `getDailyCount()`, `getStats7Days()`, `shouldSkipNextRun()`.
- `App\Console\Commands\ScraperWatchdog` — verifică heartbeat + kill PID.
- `App\Models\SavedSearch` — cu `matchListing(ScrapedListing)` care suportă criterii: `type`, `transaction_type`, `owner_type`, `price_min/max`, `area_min/max`, `rooms_min/max`, `city` (case-insensitive substring), `district`. Filtrele numerice resping listings fără valoarea respectivă.
- `App\Jobs\BatchMatchingJob` — încarcă listings cu `matched_at IS NULL` din ultimele 2h, evaluează vs. saved_searches active, dispatch `NotifyUserOfMatchesJob` per user; marchează listings ca procesate.
- `App\Jobs\NotifyUserOfMatchesJob` — trimite `NewListingsMatched` notification (database + mail în funcție de preferințe).
- `App\Notifications\NewListingsMatched` — folosește `RespectsUserPreferences` cu cheia `saved_search_match`.

### DB schema
- Migration `2026_05_17_180000_create_saved_searches_table.php` — `jsonb` pe Postgres, `json` fallback pe SQLite (necesar pentru tests in-memory). Index pe `(user_id, is_active)` și `(agency_id, is_active)`.
- Migration `2026_05_17_180001_add_matched_at_to_scraped_listings.php` — `timestamp matched_at NULL` cu index.
- `ScrapedListing` — adăugat `matched_at` în fillable + cast `datetime`.

### Tests ([tests/Feature/](tests/Feature/))
- `ScraperScheduleTest.php` (5 teste, 32 assertions) — verifică expressii cron + timezone + window 23-06 (pas-de-rulare).
- `ScraperWatchdogTest.php` (4 teste) — heartbeat lipsă / proaspăt / vechi / corupt.
- `SavedSearchMatchingTest.php` (10 teste) — toate combinațiile de criterii + integrare BatchMatchingJob.
- **Toate 19 teste noi: PASS (66 assertions)**.

## 🕐 Schedule final (cron expressions exacte)

| Nume | Cron | TZ | Comandă |
|---|---|---|---|
| `999md-morning-initial-sync` | `0 6 * * *` | Europe/Chisinau | `portal:999:scrape:morning` |
| `999md-hourly-incremental` | `0 7-22 * * *` | Europe/Chisinau | `portal:999:scrape:hourly` |
| `scraper-watchdog` | `*/10 * * * *` | (default) | `scraper:watchdog` |
| `batch-matching` | `30 6-22 * * *` | Europe/Chisinau | `BatchMatchingJob` |
| `999md-sync` | `0 */5 * * *` | (default) | Partners API — **neschimbat** |
| `ai-valuation` | `10 * * * *` | (default) | **neschimbat** |

**Fereastra de pauză**: 23:00-05:59 Chisinau — niciun event scraper public nu rulează. Job-uri non-scraper (calendar reminders, autopost, etc.) rămân active.

## ⚠️ Probleme identificate / decizii de proiectare

1. **`jsonb` vs `json` pe SQLite** — Laravel SQLite Schema Grammar nu cunoaște tipul `jsonb`. Migration-ul detectează driver-ul și folosește `json` pe SQLite (testing) / `jsonb` pe Postgres (production). Funcțional, query-urile `criteria->>'key'` lucrează pe ambele.
2. **Commits 10.2 + 10.3 combinate** — modificările `scope-hours/mode/early-exit` și `anti-ban (UA rotation, fingerprint, warmup, block detect)` ating același fișier (`python_scraper/scraper_999.py`). Fără `git add -p` interactiv (interzis de CLAUDE.md), nu se pot separa curat. Au fost commit-uite împreună sub mesajul "feat(scraper): scope-hours, mode, early-exit + anti-ban (UA, fingerprint, warmup, block detect)".
3. **Heartbeat-ul Python a fost adăugat tot în `scraper_999.py`** — fizic e parte din modificările Python, deci a intrat în același commit cu PASUL 4+5. Comanda `scraper:watchdog` (PHP) e separat în commit-ul 10.4.
4. **`Cashier::calculateTaxes()` semnal** — irelevant pentru scraper, dar atenție: regulile din CLAUDE.md despre `billing_address_collection='required'` rămân valabile pentru tot fluxul Stripe.
5. **Teste pre-existente Auth/Profile (13 failures)** — sunt **anterioare modificărilor mele**. Au fost verificate prin `git stash` + re-rulare pe baseline: aceleași 13 failures. Nu sunt cauzate de schimbările din acest deployment. Recomandat: investigate separat (probabil rute Breeze customizate care nu mai există).
6. **Comenzi vechi `portal:999:scrape` și `:full`** — păstrate intacte pentru backwards-compat manuală (per regula 4 din spec).

## 🔧 TODO post-deploy

### Cont Stripe / payments (separat de scraper, dar relevant)
- Completează KYC din Stripe Dashboard (banner roșu "Mai multe capacități întrerupte").
- Pe server-ul de producție setează `STRIPE_*` în `.env` (vezi memorie `stripe-live-setup`).

### Scraper-specific
- **Adaugă pe VPS o variabilă de env** `SCRAPER_ALERT_EMAIL` și folosește-o în `->emailOutputOnFailure(env('SCRAPER_ALERT_EMAIL'))` în loc de `MAIL_FROM_ADDRESS` (mai potrivit semantic — alerts != noreply).
- **Test integrat pe VPS**: după deploy rulează manual `php artisan portal:999:scrape:hourly` o singură dată. Verifică:
  1. Apar rânduri noi în `scraped_listings` cu `published_at` în ultima oră.
  2. Apare `storage/app/scraper_heartbeat.txt` și e curățat la sfârșit.
  3. Log-ul afișează UA random ales + mode = hourly.
- **Validare anti-ban**: după primele 24h, verifică log-urile pentru `🚫 SCRAPER BLOCKED` sau exit code 42. Dacă apar:
  1. Verifică cache `scraper_blocked` (4h pause activată automat).
  2. Considerează adăugarea unui proxy rotativ (residential, nu datacenter).
- **Rotație imagini** — directorul `storage/app/public/scraped/` poate crește la GB. Adaugă un job lunar care șterge directoarele `scraped/<id>/` pentru listings cu `created_at < now - 90 days`.
- **Population inițială** `saved_searches`: în prezent tabela e goală — nimeni nu va primi notificări. Trebuie UI Inertia pentru CRUD-ul SavedSearch (nu inclus în acest deployment).
- **Validare UI** pentru notificarea `NewListingsMatched` — URL-ul `/web-offers?ids=...` trebuie să exists în [routes/web.php](routes/web.php) și să suporte query param `ids`. Dacă nu, ajustează în [NewListingsMatched.php](app/Notifications/NewListingsMatched.php).

### Monitorizare
- Adaugă dashboard `super_admin/scraper-status` care arată: `ScraperHealthService::getStats7Days()`, ultima rulare reușită, status `isBlocked()`, count failures recente. (UI separat, nu inclus.)
- Pune un Sentry breadcrumb pe `ScraperBlocked` și pe stale heartbeat — sunt evenimente rare dar critice.

## 📦 Commits

```
git log --oneline (de la b81982e încolo):
b81982e  chore: miscellaneous improvements (docs, gitignore, scheduler, translations)  [baseline]
[NEW]    feat(scraper): morning initial sync + hourly incremental commands
[NEW]    feat(scraper): scope-hours, mode, early-exit + anti-ban (UA, fingerprint, warmup, block detect)
[NEW]    feat: scraper health service + watchdog daemon
[NEW]    feat(db): saved_searches table + matched_at column on scraped_listings
[NEW]    feat: batch matching engine + user notifications
[NEW]    test: scraper scheduling + watchdog + matching coverage
[NEW]    docs: scraper analysis + deployment report
```

7 commits în loc de 8 — motivul e explicat la pct. 2 de mai sus.
