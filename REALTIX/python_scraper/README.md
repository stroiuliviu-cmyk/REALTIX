# REALTIX 999.md Scraper

Scraper Python profesional pentru a extrage anunțuri imobiliare publice de pe
[999.md](https://999.md) și a le scrie direct în baza de date REALTIX
(`database/database.sqlite`, tabelul `scraped_listings`).

## De ce Python + Selenium

999.md este o aplicație Next.js care încarcă datele anunțurilor **client-side**
prin XHR. HTTP simplu (cu PHP/Laravel) returnează doar șablonul HTML fără date.
Selenium controlează un browser real (Firefox) care execută JS-ul aplicației,
apoi parsăm DOM-ul rezultat. Asta e singura cale fiabilă fără API privat.

## Instalare

### 1. Python 3.10+
Verifică:
```bash
python --version
```

### 2. Dependențele Python
```bash
cd REALTIX/python_scraper
pip install -r requirements.txt
```

### 3. Firefox + geckodriver

**Firefox**: instalează din [mozilla.org](https://www.mozilla.org/firefox/).

**geckodriver**: descarcă din
[github.com/mozilla/geckodriver/releases](https://github.com/mozilla/geckodriver/releases),
dezarhivează și pune `geckodriver.exe` (Windows) sau `geckodriver` (Linux/Mac)
într-un folder din PATH (sau direct în `python_scraper/`).

Verifică:
```bash
geckodriver --version
```

## Utilizare

### Direct
```bash
cd REALTIX/python_scraper

# Default: 2 pagini per categorie, headless (~50-80 anunțuri totale)
python scraper_999.py

# 5 pagini per categorie (mai multe anunțuri)
python scraper_999.py --pages 5

# Limitează la 30 anunțuri totale (testare rapidă)
python scraper_999.py --max-ads 30

# Vezi browserul (debug)
python scraper_999.py --no-headless

# Doar o categorie
python scraper_999.py --category apartments-and-rooms

# Custom DB path / agency ID
python scraper_999.py --db /path/to/database.sqlite --agency 2
```

### Din Laravel
```bash
php artisan portal:999:scrape
php artisan portal:999:scrape --pages=3 --max-ads=60
```

Comanda apelează intern `python scraper_999.py` cu argumentele furnizate.

## Categorii acoperite

| Slug | Tip REALTIX | Etichetă |
|---|---|---|
| `apartments-and-rooms` | apartment | Apartamente |
| `house-and-garden` | house | Case |
| `cottage` | house | Cabane / vile |
| `land` | land | Terenuri |
| `commercial-real-estate` | commercial | Comercial |
| `garages-and-parking` | commercial | Garaje / parcări |

## Câmpuri extrase

Per anunț:
- **external_id** — ID numeric 999.md
- **external_url** — `https://999.md/ro/<id>`
- **title** — H1 sau `og:title`
- **price + currency** — match pe element cu clasă `*price*` + simbol monetar
- **area** — m² din specificații
- **rooms** — număr camere
- **city, district** — din block-ul de locație
- **images** — URL-uri CDN simpalsmedia (până la 30 imagini)
- **phone** — încearcă click pe „afișează numărul" + regex pe `+373xxxxxxxx`
- **owner_type** — heuristic „persoană fizică" vs agenție
- **transaction_type** — sale / rent / rent_short detectat din text
- **description** — block descriere sau `og:description`
- **raw_data** (JSON) — descriere completă, slug categorie, timestamp

Deduplicare: `UNIQUE (source='999md', external_id)` cu `INSERT or UPDATE`.

## Schedule la 5 ore

### Opțiunea A: Laravel Scheduler (recomandat)
Cron-ul Laravel deja apelează `php artisan portal:999:scrape` la fiecare 5 ore
(vezi `routes/console.php`). Trebuie doar să fie activ scheduler-ul:

**Linux/Mac (cron)**:
```
* * * * * cd /path/to/REALTIX && php artisan schedule:run >> /dev/null 2>&1
```

**Windows (Task Scheduler)**:
- Creează un task care rulează `php artisan schedule:run` la fiecare minut

### Opțiunea B: Direct cron
```
0 */5 * * * cd /path/to/REALTIX/python_scraper && python scraper_999.py >> ../storage/logs/scraper.log 2>&1
```

## Performanță

- ~3-5 sec / pagina de listă
- ~3-5 sec / detail page
- Default 2 pagini × 6 categorii ≈ 60-80 anunțuri în 4-7 minute
- Cu `--pages 5` ≈ 150-200 anunțuri în 12-18 minute

## Debug

```bash
# Vezi browserul + log verbose
python scraper_999.py --no-headless --max-ads 5

# Doar un anunț specific (modifică categoria + max-ads)
python scraper_999.py --category cottage --max-ads 1 --no-headless
```

## Limite cunoscute

- 999.md poate **bloca IP** dacă scraping-ul e prea agresiv. Default delay
  1.0–2.5s între request-uri e prudent.
- Numărul de telefon NU e mereu disponibil — uneori e doar prin click și UI-ul
  se schimbă. Fallback-ul prin regex prinde majoritatea.
- Selectoarele HTML 999.md se pot schimba — ajustează în
  `_extract_*` funcții dacă nu mai funcționează.
- Un cont 999.md prea expus poate primi captcha. În acel caz Selenium ar trebui
  rulat cu profil persistent + proxy.
