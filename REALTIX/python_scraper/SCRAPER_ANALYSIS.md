# 999.md Scraper — analiză tehnică (PASUL 1)

Snapshot al stării actuale a `scraper_999.py` (~1623 linii) și al integrării cu Laravel, înainte de refactor-ul către strategia *morning initial sync + hourly incremental + night pause*.

## 1. Funcții principale

### DB adapter
| Funcție | Signature | Scop |
|---|---|---|
| `_load_laravel_env` | `(env_path: Path) -> dict` | Parsează `.env`-ul Laravel pentru DB driver/credențiale. |
| `open_db_connection` | `(repo_root, sqlite_path_override=None) -> (conn, dialect)` | Returnează conexiune Postgres (psycopg2) sau SQLite în funcție de `DB_CONNECTION`. |
| `_ph` | `(sql, dialect) -> str` | Convertește `?` în `%s` pentru psycopg2. |
| `_bool_value` | `(v, dialect)` | Adaptează bool la `1/0` pentru SQLite vs Python bool pentru pgsql. |

### Selenium driver
| Funcție | Signature | Scop |
|---|---|---|
| `make_driver` | `(headless=True) -> webdriver.Firefox` | Creează driver-ul Firefox cu UA Chrome 120 hardcoded (single UA), `permissions.default.image=2` (skip imagini în browser), `dom.popup_maximum=0`. |
| `get_recently_updated_ids` | `(conn, dialect, hours=4) -> set[str]` | Returnează `external_id`-uri cu `updated_at >= NOW() - hours` ca să evite re-fetch. |

### Listă → URL-uri
| Funcție | Signature | Scop |
|---|---|---|
| `collect_ad_urls` | `(driver, category_slug, max_pages=2) -> list[str]` | Paginare pe `/ro/list/real-estate/<slug>`. Regex `/ro/\d{6,}` pentru a colecta URL-uri. `max_pages=None` paginare nelimitată cu stop la 2 pagini consecutive goale, hard-cap 200 pagini. |

### Detail page → date structurate
| Funcție | Scop |
|---|---|
| `extract_ad` | Orchestrator detail page. Cheamă `_trigger_lazyload`, `_try_reveal_phone`, `_try_open_gallery`, apoi BeautifulSoup pentru toate câmpurile. |
| `_parse_json_ld` | Citește toate `<script type="application/ld+json">` ca listă de dict-uri. |
| `_json_ld_find` | Caută o cheie în blocurile JSON-LD (cu filtru opțional pe `@type`). |
| `_extract_title` | JSON-LD `name/headline` → `<h1>` → `og:title`. |
| `_extract_price` | JSON-LD `price/priceCurrency` → elementele cu clasă `*price*`. Detectează EUR / USD / MDL. |
| `_extract_price_per_m2` | Regex `\d+ €/m²` direct din text + fallback la `price/area`. |
| `_extract_images` | Sursa: JSON-LD `image` → `og:image` → DOM scan (doar dacă <3 imagini). Are excludere explicită de `[class*=Similar]/Recommend/Related/banner/footer/header/aside`. Cap 15. |
| `_extract_phone` | Selectori `[class*=PhoneNumber]` → `tel:` href → regex full-page. Filtrare contra număr de serviciu 999.md (`+37322888002`). |
| `_extract_description` | JSON-LD `description/articleBody` (≥30 chars) → element `description/advert-text/content-description` → `og:description`. Trunchiere la 5000 chars. |
| `_location_from_title` / `_extract_location` | Titlul 999.md în format canonic `"TYPE, [SECTOR,] CITY, RAION"` pentru (city, district); fallback JSON-LD `address`. |
| `_parse_feature_pairs` | Container `[class*=feature]` → text split pe `\|` → pairs label/value (cheile lowercased). |
| `_from_pairs_area/rooms/floor/floors_total/year/condition/building/heating/address` | Extractori pe baza pairs structurate (preferat). |
| `_extract_area/rooms/floor/year_built/condition/building_type/heating/amenities` | Fallback-uri pe baza text-ului flat + JSON-LD. |
| `_amenities_from_pairs` / `_extract_amenities` | `furnished`, `parking`, `balcony`, `elevator`, `pets_allowed`, `air_conditioning`. |
| `_detect_owner_type` | Heuristic "Persoană fizică"/"частное лицо" → `owner`, altfel `agency`. |
| `_detect_transaction_type_from_breadcrumb` / `_detect_transaction_type` | Breadcrumb-ul navigării → `sale/rent/inchiriere_zilnica`. |
| `_try_reveal_phone` | Click "Arată numărul" (CSS+XPath candidates), așteaptă DOM, retry dacă apare rate-limit din 999.md. |
| `_detect_rate_limit` | Regex `prea multe cereri.*?(\d+) secunde` în page source — returnează secundele de așteptare. |
| `_download_image` | Salvează imaginea în `storage/app/public/scraped/{ext_id}/{idx:02d}.jpg` și returnează path relativ. |

### Persistare
| Funcție | Scop |
|---|---|
| `upsert_listing` | Caută `WHERE source='999md' AND external_id=?` → UPDATE sau INSERT. Mapează toate cele ~37 câmpuri. Folosește `_ph` pentru cross-dialect. |
| `main` | Orchestrator: parsează argumente, deschide DB, încarcă `recently_updated`, iterează categorii × URL-uri, scrie statistici la final. |

## 2. CLI flags suportate

```
--pages <N|all>           # default "2"; "all" = paginare până la 2 pagini goale consecutive
--max-ads <N>             # hard cap pe numărul total de anunțuri procesate
--no-headless             # afișează fereastra Firefox (debug)
--db <path>               # override path SQLite (Postgres se ia oricum din .env)
--agency <id>             # ID agenție pentru rândurile noi (default 1)
--category <slug>         # rulează o singură categorie
--delay-min <float>       # default 1.2s; sleep min între anunțuri
--delay-max <float>       # default 2.5s
--skip-recent-hours <N>   # default 4; sare peste anunțuri cu updated_at recent
--fast                    # mode rapid: skip lazyload/gallery, sleeps mai mici, dezactivează reveal-phone redundant
--today-only              # oprește categoria după 5 anunțuri consecutive cu published_at < today 00:00
--download-images         # descarcă imaginile local în loc să salveze URL CDN
```

### Exemple

```bash
python scraper_999.py                                # default — 2 pagini × 6 categorii, ~60-80 anunțuri
python scraper_999.py --pages 5 --max-ads 100        # 5 pagini, cap la 100
python scraper_999.py --pages all --download-images  # bulk inițial complet, salvează imagini local
python scraper_999.py --fast --skip-recent-hours 0   # mode rapid, fără skip-cache
python scraper_999.py --category cottage --no-headless  # debug pe Cabane/vile, vezi browserul
python scraper_999.py --today-only --max-ads 50      # doar anunțuri publicate azi
```

## 3. Strategia detectare anunțuri noi (deduplicare)

Două straturi:

1. **DB-level unique** — `upsert_listing` face `SELECT id FROM scraped_listings WHERE source='999md' AND external_id=?` și apoi UPDATE sau INSERT. Practic e o constrângere logică `UNIQUE(source, external_id)` aplicată în cod (nu există index unique explicit în migrare — *posibilă problemă*).
2. **In-memory skip cache** — la pornire, `get_recently_updated_ids(conn, dialect, hours=N)` încarcă în memorie toate `external_id`-urile cu `updated_at >= now - N hours`. În bucla principală, dacă URL-ul scrape-uit are `external_id` în acel set, sare peste (nu deschide detail page). Implicit `N=4` ore.

⚠️ **Nu** există filtrare bazată pe `published_at` *înainte* de fetch-ul detail page-ului. Filtrul `--today-only` se aplică *după* fetch, ceea ce înseamnă că orice anunț nou pe pagina de listă deschide detail page-ul, parsează tot, și abia apoi se decide că e prea vechi → waste.

## 4. Strategia anti-ban actuală

| Layer | Implementare |
|---|---|
| **User-Agent** | UNUL singur hardcoded: `Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36 REALTIX-Scraper/1.0` — semnătură constantă. |
| **Delay între ad-uri** | `random.uniform(delay_min=1.2, delay_max=2.5)` default. În `--fast`: 0.6–1.2s. |
| **Delay între pagini list** | `random.uniform(2.0, 3.5)` în mode normal; `0.8, 1.5` în `--fast`. |
| **Rate-limit detection** | Detectare doar pentru reveal-phone (`Prea multe cereri ... N secunde`) cu retry o singură dată. Restul rulării nu detectează 429/503 generic. |
| **Browser fingerprint** | `permissions.default.image=2`, `dom.popup_maximum=0`. Nu setează `dom.webdriver.enabled=False`, nu dezactivează `useAutomationExtension`, nu suprimă WebRTC. `navigator.webdriver=true` este vizibil. |
| **Session warmup** | Nu există. Prima cerere e direct pe category list. |
| **Click reveal-phone limitator** | `_click_first()` clickează un singur buton din mai mulți candidați pentru a evita inflația de cereri reveal. |

## 5. Cum salvează în DB

- **Adaptare cross-dialect**: `_ph(sql, dialect)` schimbă `?` în `%s` pentru psycopg2.
- **Upsert pattern**: SELECT id → UPDATE sau INSERT (nu folosește `ON CONFLICT` din Postgres).
- **Timestamps**: `published_at` din JSON-LD `datePosted/datePublished` (parsed `fromisoformat`), fallback la `now()` UTC. `updated_at` și `created_at` setate manual UTC `Y-m-d H:M:S`.
- **`images`**: JSON serializat (cap 15 URL-uri / paths).
- **`raw_data`**: JSON cu `{scraped_at, description, category_slug, category_label}`.
- **Câmpuri JSON-bool**: SQLite stochează 1/0, Postgres bool nativ.
- **Categorie → type/transaction_type**: din `CATEGORIES` constant, dar `transaction_type` poate fi suprascris dacă breadcrumb-ul detail page-ului spune "Închiriez" etc.

Tabelul țintă: `scraped_listings` cu ~37 coloane (`agency_id`, `source`, `external_id`, `external_url`, `title`, `price`, `currency`, `area`, `price_per_m2`, `rooms`, `floor`, `floors_total`, `city`, `district`, `address`, `year_built`, `condition`, `building_type`, `heating`, `furnished`, `parking`, `balcony`, `elevator`, `pets_allowed`, `air_conditioning`, `description`, `images`, `phone`, `owner_type`, `published_at`, `type`, `transaction_type`, `raw_data`, `created_at`, `updated_at`, `ai_valuation` + posibil altele adăugate ulterior).

## 6. Probleme identificate

1. **Single-UA fingerprint** — Chrome 120 hardcoded + sufix `REALTIX-Scraper/1.0` semnalează deschis că e bot. Banal de filtrat.
2. **`navigator.webdriver = true`** — Firefox cu Selenium nu maschează acest flag. Detectabil prin JS pe site.
3. **WebRTC leak** — IP-ul real e expus chiar dacă rulezi prin proxy (nu se setează `media.peerconnection.enabled=false`).
4. **Lipsă session warmup** — primul request direct pe pagina de listă, fără cookie de homepage.
5. **`--today-only` post-fetch** — risipă de cereri pentru anunțuri vechi care vor fi imediat skipped (le fetch-uiește integral înainte să vadă `published_at`).
6. **Rate-limit detection limitat** — doar pentru reveal-phone. HTTP 429/403 generic, captcha, redirect la pagina de blocare nu sunt detectate. Nu există `exit code 42` pe block.
7. **Lipsă heartbeat** — procesul Selenium se poate bloca în `driver.get()` sau `WebDriverWait`. Nu există un canal extern care să indice "scriptul e încă viu".
8. **`recently_updated` se încarcă o singură dată** — pentru o rulare lungă (1-3h) cache-ul devine învechit; un anunț procesat la minutul 5 nu va fi în `recently_updated` la minutul 50, deci poate fi re-procesat dacă apare pe altă pagină.
9. **DOM-side filtrare** — paginile de listă 999.md amestecă uneori conținut promo / sponsored. Regex-ul `/ro/\d{6,}` poate prinde linkuri din widgets vecine.
10. **`make_driver()` nu acceptă UA dinamic** — UA-ul e hardcoded în interior; nu se poate roti per rulare fără modificare de cod.
11. **`upsert_listing()` SELECT+INSERT/UPDATE pe pgsql** — nu folosește `INSERT ... ON CONFLICT (source, external_id) DO UPDATE`. Două query-uri în loc de unul; race condition dacă două rulări simultane atinge același anunț.
12. **`headless` controlat invers** — în `main()` apare `make_driver(headless=not args.no_headless)` — corect ca semantică (negation), dar logarea zice `f"headless={not args.no_headless}"` care arată `True/False` opus de ce intuitiv te aștepți.

## 7. Cod neacoperit / TODO comments

Nu există marker-e `TODO`/`FIXME` explicite în cod. În schimb, lipsă logică funcțională:

- **`--scope-hours`** (filtru pe published_at pre-fetch) — *nu există*, urmează de adăugat.
- **`--mode morning/hourly/manual`** — *nu există*, urmează de adăugat.
- **Early-exit pe published_at** — actualul `--today-only` oprește după 5 anunțuri vechi de azi, dar nu există echivalent pe fereastră oricât de mică (1 oră).
- **Heartbeat file** — *nu există*.
- **Exit code 42 pe block** — *nu există*. Procesul ridică excepție și pică, dar exit code-ul nu diferențiază block vs orice altă eroare.
- **UA rotation pool** — *nu există*. Un singur UA hardcoded.

## 8. Integrare cu Laravel (înainte de refactor)

În [routes/console.php](../routes/console.php):

- `portal:999:scrape` — wrapper Artisan care apelează scriptul Python cu argumente. Default `--pages=2 --skip-recent=1`.
- `portal:999:scrape:full` — full bulk cu confirmare, `--pages=all --skip-recent-hours=0`.
- `portal:999:sync` — separat (Partners API, nu scraping).
- **Schedule curent**:
  - `999md-today-scrape` cron `0 */6 * * *` cu `--pages=2 --max-ads=50 --today-only --download-images`
  - `999md-daily-wrap` zilnic la `22:00` cu `--pages=5 --skip-recent=0 --max-ads=50`
  - Circuit breaker `$dailyCapHit` evaluat în `->when()` — sare peste rulare dacă deja 200 anunțuri inserate azi.
- `ai-valuation` cron `10 * * * *` — calculează valoarea relativă (cheap/avg/expensive) pe baza medianei `price/area` per bucket (`type, transaction_type, city`).

Aceste două schedule-uri 999md vor fi **complet înlocuite** în PASUL 2 cu strategia morning + hourly + night pause.
