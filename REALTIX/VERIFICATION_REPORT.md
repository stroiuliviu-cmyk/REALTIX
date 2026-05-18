# REALTIX — pre-deploy verification

Snapshot 2026-05-17. Read-only verificare a stării după cele 7 commits de scraper. **Nu am modificat nimic.**

## ✅ Ce funcționează

### PASUL 1 — locație
- `pwd` = `/c/Users/Hacker/Desktop/REALTIX/REALTIX` (Laravel root)
- `artisan` + `composer.json` prezente.

### PASUL 2 — rute
- `GET web-offers` → `WebOffersController@index` **există**.
- `GET health` → `HealthController@check` **există**.
- `GET super-admin/system-health` → `SuperAdmin\SystemHealthController@index` **există**.
- Rute pentru `saved-search` — **nu există încă** (așteptat per spec — CRUD UI nu e adăugat).

### PASUL 3 — teste noi scraper (19/19 PASS, 66 assertions)
| Suite | Result |
|---|---|
| `ScraperScheduleTest` | 5 passed, 32 assertions |
| `ScraperWatchdogTest` | 4 passed, 14 assertions |
| `SavedSearchMatchingTest` | 10 passed, 20 assertions |

Zero failures.

### PASUL 4 — Python scraper
- `--scope-hours` și `--mode {morning,hourly,manual}` prezente în `--help`.
- Toate flag-urile existente păstrate: `--pages`, `--max-ads`, `--no-headless`, `--db`, `--agency`, `--category`, `--delay-min/max`, `--skip-recent-hours`, `--fast`, `--today-only`, `--download-images`.
- Heartbeat în cod: `_write_heartbeat`, `_clear_heartbeat`, `HEARTBEAT_PATH` (L104-L221).
- `ScraperBlocked` exception definit (L170) și raise-uit în `collect_ad_urls` (L353), prins în main (L1788).
- `scope_hours` parsat în main (L1616), folosit la filtrare în per-ad loop.

### PASUL 5 — scheduler (toate cele 4 job-uri noi prezente)
| Cron (display) | Comandă | Note |
|---|---|---|
| `0 3 * * *` ← UTC for `0 6 * * *` Chisinau | `portal:999:scrape:morning` | Convertit pentru afișare la UTC (Chisinau +3 vara). Test confirmă internal cron e `0 6 * * *` cu tz Chisinau. |
| `0 7-22 * * *` | `portal:999:scrape:hourly` | Range-uri nu sunt convertite de schedule:list — display literal. |
| `*/10 * * * *` | `scraper:watchdog` | Fără timezone (everyTenMinutes). |
| `30 6-22 * * *` | `batch-matching` (job) | Chisinau timezone. |

Plus schedule-uri non-scraper neatinse: `999md-sync` (Partners API), `ai-valuation`, `calendar-reminders`, `trial-expiring-warn`, `subscription-expiring-warn`, `autopost-scheduler`.

### PASUL 6 — Artisan commands
Toate prezente:
- `portal:999:scrape` (vechi, manual)
- `portal:999:scrape:full` (vechi, manual bulk)
- `portal:999:scrape:morning` ✨ nou
- `portal:999:scrape:hourly` ✨ nou
- `portal:999:sync` (Partners API)
- `scraper:watchdog` ✨ nou

### PASUL 7 — fișiere
Toate cele 6 fișiere noi de cod prezente:
```
app/Console/Commands/ScraperWatchdog.php        3269 B
app/Jobs/BatchMatchingJob.php                   3229 B
app/Jobs/NotifyUserOfMatchesJob.php             1075 B
app/Models/SavedSearch.php                      4035 B
app/Notifications/NewListingsMatched.php        2298 B
app/Services/ScraperHealthService.php           2417 B
```

Migrările noi:
```
2026_05_17_180000_create_saved_searches_table.php
2026_05_17_180001_add_matched_at_to_scraped_listings.php
```

## ⚠️ Probleme identificate

### Migrările noi nu sunt încă rulate
`php artisan migrate:status` arată:
```
2026_05_17_180000_create_saved_searches_table .................. Pending
2026_05_17_180001_add_matched_at_to_scraped_listings ........... Pending
```

**Impact:** `BatchMatchingJob` și `SavedSearch` vor crash-ui pe rulare reală cu `relation "saved_searches" does not exist`. Înainte de deploy / înainte de prima rulare a scheduler-ului trebuie:
```
php artisan migrate
```

Tests treceau pentru că folosesc `RefreshDatabase` (rulează migrările pe DB in-memory). În dev/prod migrările sunt pending.

### `web-offers?ids=` nu e suportat
`WebOffersController@index` nu citește query param `ids`. Notificarea `NewListingsMatched` linkează la `/web-offers?ids=1,2,3`, dar pagina va ignora params și afișa lista standard. Funcțional ok, dar pierdem UX-ul "vezi exact aceste anunțuri".

**Recomandare:** post-deploy, adaugă în `WebOffersController@index` ceva de genul:
```php
if ($ids = $request->query('ids')) {
    $query->whereIn('id', array_filter(array_map('intval', explode(',', $ids))));
}
```

### Display schedule:list în UTC pentru cron-uri simple
`portal:999:scrape:morning` apare ca `0 3 * * *` în loc de `0 6 * * *`. E afișaj-only — Laravel convertește cron-urile simple cu timezone la UTC pentru schedule:list. Tests-urile confirmă config-ul intern e `0 6 * * *` + Europe/Chisinau. **Nu blochează deploy.**

### `saved_searches` tabelul gol post-deploy
Tabela există după migrare dar e goală — niciun user nu va primi notificări `NewListingsMatched`. Trebuie UI CRUD pentru SavedSearch (nu inclus în acest deployment).

## 🎯 Recomandare următor pas

**Status: nu blocheaza deploy, dar necesită 1 pas obligatoriu înainte.**

1. **OBLIGATORIU înainte de `php artisan schedule:run` să intre în acțiune:**
   ```
   php artisan migrate
   ```
   Pe server-ul de producție după pull. În cazul producției recomandat:
   ```
   php artisan migrate --force
   ```

2. **Opțional / post-deploy:**
   - Adaugă suport `?ids=` în `WebOffersController@index`.
   - Adaugă UI Inertia pentru CRUD `SavedSearch` (pagina `Pages/SavedSearches/Index.jsx` + Controller + Routes).
   - Completează KYC din Stripe Dashboard (banner roșu pre-existent — nu legat de scraper).

3. **După deploy, smoke test manual:**
   ```
   php artisan portal:999:scrape:hourly --agency=1
   ```
   Așteaptă 5-15 min. Verifică:
   - Rânduri noi în `scraped_listings` cu `published_at` în ultima oră.
   - `storage/app/scraper_heartbeat.txt` apare în timpul rulării și e curățat la final.
   - Log conține `UA: ...` random + `Hourly incremental — scraping only last hour`.
   - Exit code 0 (sau 42 dacă e block — atunci verifică Sentry / cache `scraper_blocked`).

4. **Cele 13 teste Auth/Profile FAIL pre-existente** — separat de această verificare. Recomandat investigate într-un PR separat (rute Breeze customizate).

**Concluzie:** Tot ce e legat de scraping deployment e gata și verificat. Migrările pending sunt singurul gating item — trivial de rezolvat cu `php artisan migrate`.
