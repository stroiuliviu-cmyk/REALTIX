# REALTIX — Raport de Audit pentru Producție

> Generat: 2026-05-17
> Scop: pregătire deploy pe VPS Linux (root SSH). Toate secretele sunt mascate cu `*****REDACTED`.

---

## 1. PREZENTARE GENERALĂ

| Item | Valoare |
|---|---|
| Laravel | **12.56.0** (≥12.59.0 disponibil) |
| PHP | **8.2.12** ZTS Visual C++ 2019 x64 |
| Composer | 2.9.5 |
| Fișiere PHP în `app/` | **120** |
| Migrații | **44** (1617 linii total) |
| Tabele DB | **45** (PostgreSQL 17.9, ~2.92 MB) |
| Rute totale | **199** (GET 78, POST 79, PATCH 31, DELETE 21, PUT 9, OPTIONS 4) |
| Frontend | React 18 + Inertia 2.0 + Vite 7 + Tailwind 4 |
| Cache views | ✓ CACHED |
| Cache config / routes / events | ✗ NOT CACHED |
| Storage link `public/storage` | ✓ LINKED |
| Tests Pest | **11** fișiere |
| Disk: storage | 19 MB |
| Disk: database | 11 MB |

### Stack complet

| Strat | Tehnologie |
|---|---|
| Backend | Laravel 12, PHP 8.2 |
| Frontend | React 18 + JSX, Inertia.js 2.0, Tailwind 4, Vite 7 |
| DB (prod) | PostgreSQL 17 — `pgsql` driver |
| Cache | `database` driver (tabela `cache`) |
| Queue | `database` driver (tabela `jobs`) |
| Sessions | `database` driver (tabela `sessions`) |
| Mail | SMTP via Brevo (smtp-relay.brevo.com:587) |
| Permisiuni | Spatie Laravel Permission 6.25 |
| Billing | Laravel Cashier 16.5 + Stripe |
| OAuth | Laravel Socialite 5.26 + Google/Microsoft/Apple |
| PDF/DOCX | Barryvdh/laravel-dompdf 3.1 + custom DOCX writer |
| Scraper | Python 3.10+ / Selenium / Firefox (geckodriver) |

### Structură foldere (level 3, fără vendor/node_modules/storage)

```
./app
  ├── Console/Commands
  ├── Http/{Controllers, Middleware, Requests}
  ├── Jobs
  ├── Mail
  ├── Models
  ├── Notifications/Concerns
  ├── Observers
  ├── Policies
  ├── Providers
  ├── Services/{Portals, SuperAdmin}
  └── Traits
./bootstrap/cache
./config
./database/{factories, migrations, seeders}
./lang/{en, ro, ru}
./public/build/assets
./python_scraper
./resources
  ├── css
  ├── images
  ├── js/{Components, Constants, Hooks, Layouts, Pages}
  └── views/{contracts, emails, statistics}
./routes
./tests/{Feature/Auth, Unit}
```

---

## 2. LOGICA DE SCRAPING

### Stare actuală (după curățare 2026-05-17)

**Codul PHP legacy a fost șters**:
- `app/Services/Portals/Scrape999Service.php` — eliminat
- `app/Jobs/Fetch999ListingsJob.php` — eliminat

Scraping-ul activ este **Python + Selenium** (`python_scraper/scraper_999.py` — 1623 linii), invocat din comanda Artisan `portal:999:scrape` care lansează un sub-proces Python prin `Symfony\Process`.

### 2.1 — `app/Services/Portals/Portal999Service.php` (315 linii)

API Partners 999.md — pentru CREAREA / SINCRONIZAREA anunțurilor proprii (nu scraping). Folosit de `Sync999AdvertsJob`.

```php
<?php
namespace App\Services\Portals;

use App\Models\Agency;
use App\Models\Property;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Portal999Service
{
    const BASE_URL = 'https://partners-api.999.md';

    // Universal feature IDs
    const F_PRICE = 2; const F_TITLE = 12; const F_DESCRIPTION = 13;
    const F_IMAGES = 14; const F_CONTACTS = 16;

    const TYPE_SETTINGS_KEY = [
        'apartment' => 'p999_subcat_apartment',
        'house'     => 'p999_subcat_house',
        'commercial'=> 'p999_subcat_commercial',
        'land'      => 'p999_subcat_land',
    ];

    const TRANSACTION_SETTINGS_KEY = [
        'sale' => 'p999_offer_sale',
        'rent' => 'p999_offer_rent',
        'inchiriere_zilnica' => 'p999_offer_rent_short',
        'new_build' => 'p999_offer_sale',
    ];

    // HTTP client cu Basic Auth pe API key
    private function client(Agency $agency): \Illuminate\Http\Client\PendingRequest { /* … */ }

    // Discovery: categorii, subcategorii, offer types, features
    public function getCategories(Agency $agency, string $lang = 'ro'): array
    public function getSubcategories(int $categoryId, Agency $agency, string $lang = 'ro'): array
    public function getOfferTypes(int $categoryId, int $subcategoryId, Agency $agency, string $lang = 'ro'): array
    public function getFeatures(int $categoryId, int $subcategoryId, int $offerTypeId, Agency $agency, string $lang = 'ro'): array

    // Upload imagini la /images cu multipart
    public function uploadImage(string $mediaPath, Agency $agency): ?string

    // CRUD anunțuri proprii prin /adverts
    public function createAd(Property $property, Agency $agency): array       // POST
    public function updateAd(string $externalId, Property $property, Agency $agency): array  // PATCH
    public function republishAd(string $externalId, Agency $agency): array    // POST /republish
    public function getAdStatus(string $externalId, Agency $agency): array    // GET
    public function listAds(Agency $agency, array $params = []): array        // GET (single page)
    public function listAllAdverts(Agency $agency, string $lang, array $states): array  // paginated, max 100 pages

    // Citește feature-urile unui anunț individual (price, title, images, etc.)
    public function getAdvertFeatures(string $advertId, Agency $agency, string $lang = 'ro'): array

    // Construiește payload-ul features pentru POST/PATCH
    private function buildFeatures(Property $property, array $imageIds, array $settings): array
}
```

Configurație via `agency->settings['portal_999md_api_key']` sau `config('services.portal_999md.api_key')` (`env('PORTAL_999MD_API_KEY')`).

### 2.2 — `app/Jobs/Sync999AdvertsJob.php` (206 linii)

Pull-uiește anunțurile DEȚINUTE de cheia API (NU scraping public) și le upsert-uiește în `scraped_listings`. Tries=2, timeout=600s. Filtrează doar real-estate.

```php
class Sync999AdvertsJob implements ShouldQueue
{
    public int $tries = 2;
    public int $timeout = 600;

    public function __construct(public ?int $agencyId = null) {}

    public function handle(Portal999Service $service): void
    {
        // 1. Găsește agenția cu API key
        // 2. Apelează listAllAdverts (paginat)
        // 3. Filtrează doar category.url === 'real-estate' (sau id=270)
        // 4. mapToListing(): extrage price/currency/images/contacts/location/type
        // 5. ScrapedListing::updateOrCreate cu unique (source='999md', external_id)
    }

    private function mapToListing(array $ad): array { /* … */ }
    private function detectTypeFromSubcategoryUrl(?string $url, $offerType = null): array { /* … */ }
}
```

### 2.3 — `app/Jobs/EstimatePropertyPriceJob.php` (100 linii)

Folosește AI (Anthropic/Groq) pentru estimarea prețului unei proprietăți și salvează `ai_valuation` (cheap/average/expensive) + meta cu min/max/regional_avg/confidence.

```php
class EstimatePropertyPriceJob implements ShouldQueue
{
    public int $tries = 2;

    public function __construct(
        public readonly int $propertyId,
        public readonly int $userId = 0,
    ) {}

    public function handle(AiService $ai): void
    {
        // 1. Property::find($propertyId)
        // 2. Construiește prompt expert evaluator imobiliar Moldova
        // 3. $ai->complete($prompt) — răspuns JSON
        // 4. preg_match pe JSON din răspuns
        // 5. Actualizează property->ai_valuation + meta
        // 6. Detectează schimbare >=5% și notifică user
    }
}
```

### 2.4 — `app/Console/Commands/BackfillAgencyAdmins.php` (51 linii) — NU scraping

```php
class BackfillAgencyAdmins extends Command
{
    protected $signature = 'realtix:backfill-agency-admins {--dry-run}';
    // Promovează cel mai vechi user al fiecărei agenții la admin dacă nu există admin
}
```

### 2.5 — `routes/console.php` (311 linii)

**Laravel 12 NU mai are `app/Console/Kernel.php`** — totul e în `routes/console.php` (commands + scheduler).

```php
<?php
use App\Jobs\Sync999AdvertsJob;
use App\Models\Agency;
use App\Models\CalendarEvent;
use App\Notifications\CalendarEventReminder;
use App\Notifications\SubscriptionExpiringSoon;
use App\Notifications\TrialExpiringSoon;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () { /* … */ });

// portal:999:sync {agency?} — dispatch Sync999AdvertsJob
Artisan::command('portal:999:sync {agency?}', function (?int $agency = null) { /* … */ });

// portal:999:scrape — INCREMENTAL (default 2 pagini, skip <1h)
Artisan::command('portal:999:scrape {--pages=2} {--max-ads=} {--category=} {--agency=1}
    {--skip-recent=1} {--today-only} {--download-images} {--fast}', function () {
    $script = base_path('python_scraper/scraper_999.py');
    $python = env('PYTHON_BIN', 'python');
    $args = [
        '--pages=' . $this->option('pages'),
        '--agency=' . $this->option('agency'),
        '--skip-recent-hours=' . $this->option('skip-recent'),
    ];
    if ($max = $this->option('max-ads')) $args[] = '--max-ads=' . $max;
    // … etc
    $cmd = $python . ' ' . escapeshellarg($script) . ' ' . implode(' ', $args);
    $process = \Symfony\Component\Process\Process::fromShellCommandline($cmd);
    $process->setTimeout(7200); // 2h hard timeout
    $process->run(fn($type, $buffer) => print $buffer);
    return $process->getExitCode() === 0 ? self::SUCCESS : self::FAILURE;
});

// portal:999:scrape:full — bulk inițial cu --pages=all (1-3h)
Artisan::command('portal:999:scrape:full {--agency=1}', function () { /* … */ });

// ai:valuate-scraped — calculează cheap/average/expensive bazat pe mediana price/m²
Artisan::command('ai:valuate-scraped {--all}', function () {
    $base = \App\Models\ScrapedListing::query()
        ->whereNotNull('price')->where('price', '>', 0)
        ->whereNotNull('area')->where('area', '>', 0);
    // … GROUP_CONCAT(price * 1.0 / area), median, ±12% threshold
});

// ── SCHEDULE ───────────────────────────────────────────────────────────────

// Partners API sync (own ads) — fiecare 5 ore
Schedule::call(function () {
    Agency::query()->lazy(50)->each(function ($agency) {
        $hasOwnKey = !empty($agency->settings['portal_999md_api_key'] ?? null);
        if ($hasOwnKey || config('services.portal_999md.api_key')) {
            Sync999AdvertsJob::dispatch($agency->id);
        }
    });
})->cron('0 */5 * * *')->name('999md-sync')->withoutOverlapping();

// 999.md scraper — daily cap configurable SCRAPER_999_DAILY_CAP (default 200)
$dailyCapHit = function () {
    $cap = (int) env('SCRAPER_999_DAILY_CAP', 200);
    return \DB::table('scraped_listings')
        ->where('source', '999md')
        ->whereDate('created_at', today())
        ->count() >= $cap;
};

// 4 rulări/zi la 00/06/12/18, --max-ads=50/rulare
Schedule::command('portal:999:scrape --pages=2 --skip-recent=1 --today-only --download-images --max-ads=50')
    ->cron('0 */6 * * *')
    ->when(fn () => !$dailyCapHit())
    ->name('999md-today-scrape')
    ->withoutOverlapping(55)
    ->runInBackground();

// Top-up la 22:00
Schedule::command('portal:999:scrape --pages=5 --skip-recent=0 --today-only --download-images --max-ads=50')
    ->dailyAt('22:00')
    ->when(fn () => !$dailyCapHit())
    ->name('999md-daily-wrap')
    ->withoutOverlapping(120)
    ->runInBackground();

// AI valuation la minutul 10 al fiecărei ore
Schedule::command('ai:valuate-scraped')
    ->cron('10 * * * *')
    ->name('ai-valuation')
    ->withoutOverlapping();

// Calendar reminders — fiecare 5 min, fires 30 min before event
Schedule::call(function () { /* … */ })->everyFiveMinutes()->name('calendar-reminders');

// Trial expiring (daily 10:00) + Subscription expiring (daily 09:00)
Schedule::call(function () { /* … TrialExpiringSoon … */ })->dailyAt('10:00');
Schedule::call(function () { /* … SubscriptionExpiringSoon … */ })->dailyAt('09:00');

// Autopost scheduler — fiecare minut, procesează scheduled_at <= now
Schedule::call(function () {
    \App\Models\AutoPostRequest::query()
        ->where('status', \App\Models\AutoPostRequest::STATUS_SCHEDULED)
        ->where('scheduled_at', '<=', now())
        ->lazy(50)->each(function ($autoPost) {
            $autoPost->update(['status' => 'approved']);
            if (in_array('999md', $autoPost->getPlatformsList(), true)) {
                \App\Jobs\PublishTo999Job::dispatch($autoPost);
            }
        });
})->everyMinute()->name('autopost-scheduler')->withoutOverlapping();
```

### 2.6 — `python_scraper/scraper_999.py` (1623 linii) — extras

Adaptor DB: detectează `DB_CONNECTION` din `.env` și deschide conexiune **psycopg2** (pgsql) sau **sqlite3**. Convertește `?` placeholders în `%s` pentru psycopg2.

```python
BASE_URL = "https://999.md"
CDN_PREFIX = "https://i.simpalsmedia.com/999.md/"
IMAGES_DIR = Path(__file__).resolve().parent.parent / "storage" / "app" / "public" / "scraped"

CATEGORIES = [
    {"slug": "apartments-and-rooms",   "type": "apartment",  "transaction_type": "sale"},
    {"slug": "house-and-garden",       "type": "house",      "transaction_type": "sale"},
    {"slug": "cottage",                "type": "house",      "transaction_type": "sale"},
    {"slug": "land",                   "type": "land",       "transaction_type": "sale"},
    {"slug": "commercial-real-estate", "type": "commercial", "transaction_type": "sale"},
    {"slug": "garages-and-parking",    "type": "commercial", "transaction_type": "sale"},
]

# Funcții principale:
def make_driver(headless: bool = True) -> webdriver.Firefox      # Selenium Firefox headless
def open_db_connection(repo_root, sqlite_path_override)          # pgsql sau sqlite3
def collect_ad_urls(driver, slug, max_pages)                     # listă URL-uri din pagini
def extract_ad(driver, url)                                      # detalii anunț
def download_images(ad_id, urls)                                 # opțional, --download-images
def main()                                                       # arg parsing + main loop
```

CLI flags suportate: `--pages N | all`, `--max-ads N`, `--category slug`, `--agency ID`, `--skip-recent-hours N`, `--today-only`, `--download-images`, `--fast`, `--no-headless`, `--db PATH`.

---

## 3. BAZA DE DATE (PostgreSQL 17.9, 45 tabele, 2.92 MB)

### 3.1 — Toate migrațiile (cronologic)

```
0001_01_01_000000_create_users_table.php
0001_01_01_000001_create_cache_table.php
0001_01_01_000002_create_jobs_table.php
2026_04_21_110713_create_permission_tables.php           (Spatie permissions)
2026_04_21_120000_create_agencies_table.php
2026_04_21_120001_extend_users_table.php
2026_04_21_120002_create_subscription_plans_table.php
2026_04_21_120003_create_properties_table.php
2026_04_21_120004_create_property_media_table.php
2026_04_21_120005_create_scraped_listings_table.php
2026_04_21_120006_create_contacts_table.php
2026_04_21_120007_create_contact_interactions_table.php
2026_04_21_120008_create_deals_table.php
2026_04_21_120009_create_calendar_events_table.php
2026_04_21_120010_create_contract_tables.php
2026_04_21_120011_create_auto_post_requests_table.php
2026_04_21_120012_create_ai_requests_table.php
2026_04_21_120013_create_customer_columns.php             (Cashier)
2026_04_21_120014_create_subscriptions_table.php          (Cashier)
2026_04_21_120015_create_subscription_items_table.php     (Cashier)
2026_04_21_120016_add_meter_id_to_subscription_items_table.php
2026_04_21_120017_add_meter_event_name_to_subscription_items_table.php
2026_04_22_070345_add_extra_fields_to_users_table.php
2026_04_22_071132_add_google_calendar_to_users_table.php
2026_04_22_195007_add_platforms_to_auto_post_requests.php
2026_04_22_210000_create_property_favorites_table.php
2026_04_22_220000_update_scraped_listings_add_web_offers_tables.php
2026_04_23_100000_add_status_allday_to_calendar_events.php
2026_04_26_125155_add_social_auth_to_users_table.php
2026_04_26_130717_add_onboarding_done_to_agencies_table.php
2026_05_02_194915_create_property_contact_table.php
2026_05_04_071143_create_agency_user_links_table.php
2026_05_04_071833_create_agency_invitations_table.php
2026_05_06_071744_extend_scraped_listings_with_extra_fields.php
2026_05_06_120000_add_seat_pricing_to_subscription_plans_table.php
2026_05_07_174405_create_notifications_table.php
2026_05_07_174614_add_reminder_sent_at_to_calendar_events_table.php
2026_05_07_183419_create_activity_logs_table.php
2026_05_10_131942_add_profile_filled_to_agencies_table.php
2026_05_11_122136_create_super_admin_platform_tables.php
2026_05_11_130919_add_suspended_at_to_agencies_table.php
2026_05_12_120000_create_phone_interactions_table.php
2026_05_12_180000_add_price_per_m2_to_scraped_listings.php
2026_05_14_120000_add_docx_path_to_generated_contracts.php
```

> Conținutul COMPLET al fiecărei migrații (1617 linii total) e în [REALTIX/database/migrations/](REALTIX/database/migrations/). Nu inline pentru a păstra raportul lizibil — pentru fiecare migrație, citește direct fișierul.

### 3.2 — Lista tabelelor cu coloane și rânduri

| Tabelă | Coloane | Rows |
|---|---:|---:|
| activity_logs | 11 | 169 |
| agencies | 18 | 2 |
| agency_invitations | 10 | 1 |
| agency_user_links | 6 | 3 |
| ai_requests | 14 | 37 |
| auto_post_requests | 14 | 0 |
| cache | 3 | 6 |
| cache_locks | 3 | 0 |
| calendar_events | 16 | 2 |
| contact_interactions | 8 | 4 |
| contacts | 13 | 3 |
| contract_templates | 9 | 28 |
| deals | 14 | 0 |
| failed_jobs | 7 | 0 |
| feature_flags | 9 | 0 |
| generated_contracts | 11 | 118 |
| impersonation_sessions | 9 | 0 |
| ip_blacklist | 7 | 0 |
| job_batches | 10 | 0 |
| jobs | 7 | 2 |
| migrations | 3 | 44 |
| model_has_permissions | 3 | 0 |
| model_has_roles | 3 | 5 |
| moderation_reports | 12 | 0 |
| notifications | 8 | 1 |
| password_reset_tokens | 3 | 0 |
| permissions | 5 | 23 |
| phone_interactions | 10 | 0 |
| platform_alerts | 9 | 0 |
| properties | 27 | 2 |
| property_contact | 7 | 0 |
| property_favorites | 4 | 0 |
| property_media | 8 | 0 |
| role_has_permissions | 2 | 62 |
| roles | 5 | 3 |
| scraped_listing_favorites | 4 | 0 |
| scraped_listing_imports | 5 | 0 |
| scraped_listings | 37 | 0 |
| sessions | 6 | 1 |
| subscription_items | 10 | 1 |
| subscription_plans | 16 | 3 |
| subscriptions | 11 | 1 |
| support_ticket_replies | 7 | 0 |
| support_tickets | 10 | 0 |
| users | 25 | 3 |

### 3.3 — Schema tabelelor majore

#### `users` (25 col., 3 rows)

| Coloană | Tip |
|---|---|
| id | bigint |
| name | varchar |
| email | varchar |
| email_verified_at | timestamp |
| password | varchar |
| remember_token | varchar |
| created_at / updated_at | timestamp |
| agency_id | bigint |
| phone, avatar_path, position, locale | varchar |
| is_active | boolean |
| whatsapp, viber, telegram | varchar |
| timezone, social_provider, social_id | varchar |
| notification_prefs | json |
| google_access_token, google_refresh_token | text |
| google_token_expires_at | timestamp |
| google_calendar_id | varchar |

**Indexes**: `users_pkey`, `users_email_unique`.

**🟡 Lipsă**: index pe `agency_id` (filtrat frecvent în multi-tenant).

#### `agencies` (18 col., 2 rows)

| Coloană | Tip |
|---|---|
| id, name, slug, logo_path | bigint/varchar |
| settings | json |
| subscription_plan, stripe_id, pm_type, pm_last_four | varchar |
| subscription_ends_at, trial_ends_at, suspended_at | timestamp |
| onboarding_done, profile_filled | boolean |

**Indexes**: `agencies_pkey`, `agencies_slug_unique`, `agencies_stripe_id_index`.

#### `properties` (27 col., 2 rows)

| Coloană | Tip |
|---|---|
| id, agency_id, user_id | bigint |
| title, type, transaction_type, currency, address, city, district, status, ai_valuation | varchar |
| description_ro/ru/en | text |
| price, area_total, area_living, latitude, longitude | numeric |
| rooms, floor, floors_total | integer |
| views_count | bigint |
| meta | json |

**Indexes**: `properties_pkey`, `properties_agency_id_status_index`, `properties_agency_id_type_transaction_type_index`.

#### `scraped_listings` (37 col., 0 rows în dev)

Cea mai largă tabelă — păstrează anunțuri scrape-uite de pe 999.md. Include:
- Source/dedup: `agency_id`, `source`, `external_id`, `external_url`
- Title, price, currency, area, rooms
- Location: city, district, address, floor, floors_total, year_built
- Phone, owner_type, published_at, condition, building_type
- Boolean amenities: heating, furnished, parking, balcony, elevator, pets_allowed, air_conditioning
- `images` (json), `raw_data` (json), `description` (text)
- `ai_valuation` (cheap/average/expensive), `price_per_m2` (numeric)
- `type`, `transaction_type`

**Indexes**: `scraped_listings_pkey`, **`scraped_listings_agency_id_source_external_id_unique`**, `scraped_listings_agency_id_source_index`.

**🟡 Lipsă pentru raportare**: index compus pe `(type, transaction_type, city)` — folosit intensiv de `ai:valuate-scraped` și statistici.

#### `subscriptions` (11 col., 1 row) — Cashier

| Coloană | Tip |
|---|---|
| id, agency_id | bigint |
| type, stripe_id, stripe_status, stripe_price | varchar |
| quantity | integer |
| trial_ends_at, ends_at | timestamp |

**Indexes**: `subscriptions_pkey`, `subscriptions_stripe_id_unique`, `subscriptions_agency_id_stripe_status_index`.

#### `generated_contracts` (11 col., 118 rows)

| Coloană | Tip |
|---|---|
| id, agency_id, property_id, contact_id, template_id, user_id | bigint |
| data | json |
| pdf_path, docx_path | varchar |

**Indexes**: doar `generated_contracts_pkey`.

**🟡 Lipsă**: indexes pe `agency_id`, `template_id`, `created_at` (folosite în UI lists).

#### `notifications` (8 col., 1 row) — Laravel standard

| Coloană | Tip |
|---|---|
| id | uuid |
| type, notifiable_type | varchar |
| notifiable_id | bigint |
| data | text |
| read_at, created_at, updated_at | timestamp |

**Indexes**: `notifications_pkey`, `notifications_notifiable_type_notifiable_id_index`.

---

## 4. CONFIGURAȚIE

### 4.1 — `.env.example`

```env
APP_NAME=Laravel
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=sqlite
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=laravel
# DB_USERNAME=root
# DB_PASSWORD=

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
CACHE_STORE=database

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=

# 999.md scraper (Python + Selenium)
PYTHON_BIN=python3
SCRAPER_999_DAILY_CAP=200
PORTAL_999MD_API_KEY=
PORTAL_999MD_BASE_URL=https://partners-api.999.md

# AI valuation
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Stripe
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_MEDIUM=
STRIPE_PRICE_PRO=
STRIPE_PRICE_PRO_EXTRA_SEAT=

# Social OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/google/calendar/callback"
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

VITE_APP_NAME="${APP_NAME}"
```

### 4.2 — `.env` curent (mascat)

```env
APP_NAME=Laravel
APP_ENV=local                  ← 🔴 LOCAL, nu PRODUCTION
APP_KEY=*****REDACTED
APP_DEBUG=true                 ← 🔴 DEBUG ON, nu ar trebui în prod
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=realtix
DB_USERNAME=postgres
DB_PASSWORD=*****REDACTED

SESSION_DRIVER=database
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local          ← 🟡 storage local (per cerere user)
QUEUE_CONNECTION=database
CACHE_STORE=database
REDIS_PASSWORD=*****REDACTED

MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=a959e4001@smtp-brevo.com
MAIL_PASSWORD=*****REDACTED
MAIL_FROM_ADDRESS="liviustroiu43@gmail.com"
MAIL_FROM_NAME="REALTIX"

AI_PROVIDER=groq
GROQ_API_KEY=*****REDACTED
GROQ_MODEL=llama-3.3-70b-versatile
ANTHROPIC_API_KEY=                    ← 🟡 gol în prezent
ANTHROPIC_MODEL=claude-sonnet-4-6

GOOGLE_CLIENT_ID=                     ← gol
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=                      ← gol
APPLE_CLIENT_SECRET=

PORTAL_999MD_API_KEY=*****REDACTED
PORTAL_999MD_BASE_URL=https://partners-api.999.md

STRIPE_KEY=*****REDACTED
STRIPE_SECRET=*****REDACTED
STRIPE_WEBHOOK_SECRET=                ← 🔴 gol — Stripe webhooks nesemnate
CASHIER_CURRENCY=eur
CASHIER_CURRENCY_LOCALE=ro_MD
STRIPE_PRICE_STARTER=*****REDACTED
STRIPE_PRICE_MEDIUM=*****REDACTED
STRIPE_PRICE_PRO=*****REDACTED
STRIPE_PRICE_PRO_EXTRA_SEAT=*****REDACTED
```

### 4.3 — `config/queue.php`

Default: `database`. Connections definite: sync, database (`jobs` table, retry_after=90), beanstalkd, sqs, redis, deferred, background, failover, null. `batching` și `failed` enabled.

### 4.4 — `config/database.php`

Default: `pgsql`. Connections: sqlite, sqlite_testing, mysql, mariadb, **pgsql** (host 127.0.0.1, port 5432, db `realtix`).

### 4.5 — `config/services.php`

```php
'postmark', 'resend', 'ses', 'slack' => /* env-based */,
'google'  => ['client_id','client_secret','redirect'],
'azure'   => ['client_id','client_secret','redirect','tenant'],
'apple'   => ['client_id','client_secret','redirect','team_id','key_id','private_key'],
'portal_999md' => [
    'api_key'  => env('PORTAL_999MD_API_KEY'),
    'base_url' => env('PORTAL_999MD_BASE_URL', 'https://partners-api.999.md'),
],
```

### 4.6 — `config/horizon.php` — **N/A** (Horizon nu este instalat)

Queue rulează pe driver `database` cu `php artisan queue:work` (recomandat systemd unit pentru prod — vezi `python_scraper/DEPLOY_VPS.md` pasul 5).

### 4.7 — `config/cache.php`

Default: `database` (tabela `cache`).

### 4.8 — `composer.json` (production deps)

```json
"require": {
    "php": "^8.2",
    "barryvdh/laravel-dompdf": "^3.1",
    "google/apiclient": "^2.15",
    "inertiajs/inertia-laravel": "^2.0",
    "laravel/cashier": "^16.5",
    "laravel/framework": "^12.0",
    "laravel/sanctum": "^4.0",
    "laravel/socialite": "^5.26",
    "laravel/tinker": "^2.10.1",
    "socialiteproviders/apple": "^5.10",
    "socialiteproviders/microsoft-azure": "^5.2",
    "spatie/laravel-permission": "^6.25",
    "tightenco/ziggy": "^2.0"
}
```

### 4.9 — `package.json`

```json
"devDependencies": {
    "@headlessui/react": "^2.0.0",
    "@inertiajs/react": "^2.0.0",
    "@tailwindcss/forms": "^0.5.3",
    "@tailwindcss/vite": "^4.2.3",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.12",
    "axios": "^1.11.0",
    "concurrently": "^9.0.1",
    "laravel-vite-plugin": "^2.0.0",
    "postcss": "^8.4.31",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^4.2.3",
    "vite": "^7.0.7"
}
```

---

## 5. RUTE ȘI CONTROLLERS

**199 rute totale** (78 GET, 79 POST, 31 PATCH, 21 DELETE, 9 PUT, 4 OPTIONS).

### 5.1 — Lista controllerelor (51 fișiere)

```
app/Http/Controllers/
├── Admin/
│   ├── AgenciesController.php
│   ├── DashboardController.php
│   ├── SubscriptionsController.php
│   └── UsersController.php
├── Api/AiController.php
├── Auth/
│   ├── AuthenticatedSessionController.php
│   ├── ConfirmablePasswordController.php
│   ├── EmailVerificationNotificationController.php
│   ├── EmailVerificationPromptController.php
│   ├── NewPasswordController.php
│   ├── PasswordController.php
│   ├── PasswordResetLinkController.php
│   ├── RegisteredUserController.php
│   ├── SocialAuthController.php
│   └── VerifyEmailController.php
├── SuperAdmin/
│   ├── AiSystemController.php
│   ├── AnalyticsController.php
│   ├── BillingController.php
│   ├── CrmMonitoringController.php
│   ├── EmailSystemController.php
│   ├── FeatureFlagsController.php
│   ├── ListingsController.php
│   ├── LogsController.php
│   ├── ModerationController.php
│   ├── PlaceholderController.php
│   ├── PlatformSettingsController.php
│   ├── Portal999Controller.php
│   ├── SecurityController.php
│   ├── StorageController.php
│   ├── SupportController.php
│   └── SystemHealthController.php
└── (rădăcină)
    AgencyContextController, AutoPostController, CalendarController,
    ContactController, ContractTemplateController, Controller (base),
    DashboardController, DealController, GoogleCalendarController,
    InvitationController, NotificationController, OnboardingController,
    PhoneInteractionController, ProfileController, PropertyController,
    ScrapedListingController, SettingsController, StatisticsController,
    StripeWebhookController, SubscriptionController, WebOffersController
```

### 5.2 — Top 10 controllers ca importanță

| Controller | Metode publice principale |
|---|---|
| **PropertyController** | index, store, show, update, destroy, create, edit |
| **ContractTemplateController** | index, store, update, destroy, generate, preview, extractDocx, uploadDocx, downloadDocx |
| **ScrapedListingController** | index (Inertia + API JSON) |
| **DashboardController** | index (cu agregări multi-tenant) |
| **SubscriptionController** | index, checkout, billing, success, cancel, resume |
| **OnboardingController** | setup, agency, saveAgencyProfile, plan, selectPlan, complete, success |
| **StripeWebhookController** | handleWebhook (Stripe events) |
| **Admin/UsersController** | index, setRole, toggleActive, resetPassword, forceVerify, impersonate, stopImpersonate, destroy |
| **Auth/RegisteredUserController** | create, store (cu auto-creare Agency + admin role) |
| **CalendarController** | index, store, update, destroy, updateStatus |

---

## 6. MODELS (24 fișiere)

```
app/Models/
ActivityLog, Agency, AgencyInvitation, AiRequest, AutoPostRequest,
CalendarEvent, Contact, ContactInteraction, ContractTemplate, Deal,
FeatureFlag, GeneratedContract, ImpersonationSession, IpBlacklist,
ModerationReport, PhoneInteraction, PlatformAlert, Property,
PropertyMedia, ScrapedListing, SubscriptionPlan, SupportTicket,
SupportTicketReply, User
```

### 6.1 — `User`
- Traits: `HasFactory, Notifiable, HasRoles` (Spatie)
- Relații: `agency()` BelongsTo, `linkedAgencies()` BelongsToMany, `properties()` HasMany, `deals()` HasMany, `contacts()` HasMany, `favoriteScrapedListings()` BelongsToMany, `importedScrapedListings()` BelongsToMany, `favoriteProperties()` BelongsToMany
- Helper-i: `isAdmin()`, `isRealtor()`, `isSuperAdmin()`, `favoritePropertyIds()`

### 6.2 — `Agency`
- Traits: `HasFactory, Billable` (Cashier)
- Relații: `users()` HasMany, `properties()` HasMany, `contacts()` HasMany, `deals()` HasMany
- Helper-i plan: `planFeatures()`, `isSubscriptionActive()`, `inTrialPeriod()`, `trialDaysLeft()`, `canInviteAgents()`, `canInviteMoreAgents()`, `seatsLimit()`, `seatsUsed()`, `listingsLimit()`, `listingsCount()`, `canAddListing()`

### 6.3 — `Property`
- Traits: `HasFactory, BelongsToAgency` (custom — global scope multi-tenant)
- Relații: `user()` BelongsTo, `media()` HasMany, `coverMedia()`, `deals()` HasMany, `favoritedByUsers()` BelongsToMany, `contacts()` BelongsToMany, `owners()` BelongsToMany, `interestedClients()` BelongsToMany, `phoneInteractions()` MorphMany
- Accessor: `getDescriptionAttribute()` — alege description_ro/ru/en pe baza locale-ului

### 6.4 — `ScrapedListing`
- Traits: niciun BelongsToAgency (per CLAUDE.md — date publice, fără global scope)

### 6.5 — `ContractTemplate` / `GeneratedContract`
- Ambele folosesc `BelongsToAgency`

---

## 7. FRONTEND

**Stack**: React 18.2 + Inertia.js 2.0 + Vite 7 + Tailwind 4 (via plugin Vite) + Ziggy 2.0 (routes JS).

### 7.1 — `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({ input: 'resources/js/app.jsx', refresh: true }),
        react(),
        tailwindcss(),
    ],
    resolve: { alias: { '@': '/resources/js' } },
});
```

### 7.2 — Layouts (4)

- `AppLayout.jsx` — layout principal cu sidebar pentru agenți/admini agenție
- `AuthenticatedLayout.jsx` — legacy Breeze
- `GuestLayout.jsx` — login/register
- `SuperAdminLayout.jsx` — panou super admin (Sec 1-X)

### 7.3 — Pagini (57 .jsx)

```
Admin/{Agencies, Dashboard, Subscriptions, Users}
AiTools/Index
Auth/{ConfirmPassword, ForgotPassword, Login, Register, ResetPassword, VerifyEmail}
AutoPost/Index
Calendar/Index
Contacts/{Index, Show}
Contracts/Index
Dashboard, Dashboard/Index
Deals/Index
Invitations/Accept
Legal/{Privacy, Terms}
Onboarding/{Agency, Index, Plan, Success?}
Profile/{Edit, Partials/{DeleteUserForm, UpdatePasswordForm, UpdateProfileInformationForm}}
Properties/{Create, Edit, Index, Show}
Settings/Index
Statistics/Index
Subscription/Index
SuperAdmin/Agencies/Show
SuperAdmin/AiSystem/Index
SuperAdmin/Analytics/Index
SuperAdmin/Billing/Index
...(toate sub-pagini super-admin)
```

---

## 8. AUTENTIFICARE ȘI AUTORIZARE

### 8.1 — Sistem auth

- **Laravel Breeze (Inertia + React)** — login/register/reset/verify e-mail standard
- **Laravel Sanctum** — SPA token-based auth (pentru API routes)
- **Laravel Socialite** + provideri: Google, Microsoft Azure, Apple

### 8.2 — Roluri/permisiuni (Spatie)

3 roluri în DB:
- `super_admin` (platformă)
- `admin` (agenție)
- `realtor` (agent)

23 permissions, 62 role_has_permissions. Primul user înregistrat → admin automat per [RegisteredUserController:71](REALTIX/app/Http/Controllers/Auth/RegisteredUserController.php#L71).

### 8.3 — Middleware custom (`app/Http/Middleware/`)

| Middleware | Rol |
|---|---|
| `HandleInertiaRequests` | Shared props pentru Inertia |
| `ResolveAgencyFromSubdomain` | Multi-tenant prin subdomeniu |
| `SetLocale` | ro/ru/en din user.locale sau ?lang= |
| `BlockBlacklistedIp` | Verifică `ip_blacklist` table |
| `CheckUserActive` | Forțează logout pentru `is_active=false` |
| `EnsureAgencySubscription` | Alias `agency.subscription` — blochează feature-uri |
| `EnsureOnboardingDone` | Alias `onboarded` — redirect dacă !agency.onboarding_done |
| `EnsureSuperAdmin` | Alias `super_admin` |

Middleware globale aplicate la **web**: HandleInertia, AddLinkHeaders, ResolveAgencyFromSubdomain, SetLocale, BlockBlacklistedIp, CheckUserActive.

### 8.4 — Policies (`app/Policies/`)

- `PropertyPolicy.php`
- `ContactPolicy.php`

---

## 9. INTEGRĂRI EXTERNE

| Serviciu | Pentru ce | Fișiere | Env var |
|---|---|---|---|
| **Anthropic Claude** | AI: descriere proprietăți, evaluare preț | `app/Services/AiService.php`, `app/Jobs/EstimatePropertyPriceJob.php`, `app/Jobs/GeneratePropertyDescriptionJob.php`, `app/Http/Controllers/Api/AiController.php` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| **Groq** (alternativ) | AI gratuit fallback | `app/Services/AiService.php` | `AI_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL` |
| **999.md Partners API** | POST/sync anunțuri proprii | `app/Services/Portals/Portal999Service.php`, `app/Jobs/Sync999AdvertsJob.php`, `app/Jobs/PublishTo999Job.php`, `app/Http/Controllers/SuperAdmin/Portal999Controller.php` | `PORTAL_999MD_API_KEY`, `PORTAL_999MD_BASE_URL` |
| **999.md scraping public** | Comparație preț + AI valuation | `python_scraper/scraper_999.py` (Selenium Firefox) | `PYTHON_BIN`, `SCRAPER_999_DAILY_CAP` |
| **Stripe + Cashier** | Subscription billing | `app/Models/Agency` (Billable trait), `app/Http/Controllers/StripeWebhookController.php`, `app/Http/Controllers/SubscriptionController.php`, `config/cashier.php` | `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| **Brevo SMTP** | Email transactional (notificări, password reset) | `config/mail.php` | `MAIL_*` |
| **Google OAuth + Calendar** | Login social + sincronizare calendar | `app/Http/Controllers/Auth/SocialAuthController.php`, `app/Http/Controllers/GoogleCalendarController.php` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Microsoft Azure OAuth** | Login Outlook | `app/Http/Controllers/Auth/SocialAuthController.php` (via Socialite + provider) | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` |
| **Apple Sign In** | Login social | Socialite provider | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |
| **Simpals CDN** | Imagini 999.md (URLuri externe) | `Sync999AdvertsJob` mapeaza la `i.simpalsmedia.com` | — |
| **DomPDF** | Generare PDF contracte | `app/Services/PdfContractService.php` | — |

**NU sunt integrate**: WebSocket (Pusher/Reverb/Ably), Maps API (Google Maps, OSM), SMS (Twilio), Push notifications (FCM, OneSignal), S3/R2 (cloud storage), AWS SES.

---

## 10. PROBLEME IDENTIFICATE

### 🔴 CRITICE (blocant pentru prod)

| # | Locație | Problemă | Fix |
|---|---|---|---|
| 1 | `.env:APP_ENV=local` | Trebuie `production` pe VPS | Schimbă în `production` |
| 2 | `.env:APP_DEBUG=true` | Expune stack traces complete utilizatorilor | Setează `false` |
| 3 | `.env:STRIPE_WEBHOOK_SECRET=` | Empty → Stripe webhook-uri **nesemnate** acceptate. Atacator poate trimite webhook-uri falsificate care marchează subscripții ca paid | Setează secret-ul din dashboard Stripe (Developers → Webhooks → endpoint → Signing secret) |
| 4 | `composer audit` | **phpseclib** are CVE-2026-44167 (high) — OID amplification DoS în ASN1::decodeOID() | `composer update phpseclib/phpseclib` (versiune patched ≥1.0.29 / 2.0.54 / 3.0.52) |
| 5 | `npm audit` | **axios** are prototype pollution gadget (high) — credential injection în HTTP adapter | `npm audit fix` (sau update manual la versiunea patched) |

### 🟠 HIGH (rezolvă înainte de scale)

| # | Locație | Problemă | Fix |
|---|---|---|---|
| 6 | `users` table | Lipsă index pe `agency_id` deși e filtrat în multi-tenant pe toate listele | Adaugă `$table->index('agency_id')` în migration nouă |
| 7 | `generated_contracts` table | Doar PK index — `agency_id`, `template_id`, `created_at` nefolosite în query plans | Add 3 indexes |
| 8 | `scraped_listings` | Statistici și `ai:valuate-scraped` agregă pe `(type, transaction_type, city)` fără index compus | Add index `(type, transaction_type, city)` |
| 9 | `routes-v7.php` și `config.php` în `bootstrap/cache/` nu există | În prod trebuie cache-uite | `php artisan config:cache && php artisan route:cache && php artisan view:cache` în deploy script |
| 10 | `tests/` — doar 11 fișiere (mostly auth scaffolding) | Test coverage aproape zero pentru business logic | Adaugă Pest tests pentru: contract generation, scrape extractor, subscription gates |
| 11 | `--no-dev` deps lipsesc verificare audit | Multiple high CVEs pot fi încă în vendor/ după prod install | `composer install --no-dev --optimize-autoloader` + `composer audit --no-dev` |

### 🟡 MEDIUM

| # | Locație | Problemă | Fix |
|---|---|---|---|
| 12 | `app/Http/Controllers/StatisticsController.php` (multe linii) | Multe `selectRaw` cu funcții Postgres (`EXTRACT(WEEK FROM ...)`, `AVG`, etc.) | Funcționează pe pgsql; documentat în CLAUDE.md că nu trebuie funcții MySQL/SQLite-only |
| 13 | `app/Http/Controllers/StatisticsController.php:291` | `whereRaw("(meta->>'imported_from') IS NULL")` — JSON path syntax pgsql-specific | OK pe pgsql, dar fragil dacă schimbi DB |
| 14 | `app/Http/Controllers/AutoPostController.php:213-214` | URL-uri hardcodate pentru facebook.com, imobiliare.md | Mută în config/realtix.php |
| 15 | `app/Http/Controllers/Auth/RegisteredUserController.php` | Nu există rate limiting custom pe POST /register (doar throttle middleware default Laravel) | Add explicit `RateLimiter::for('register', ...)` |
| 16 | `routes/console.php` jobs/queue | `tries=2` pe job-urile critice (EstimatePropertyPriceJob, Sync999AdvertsJob) | OK, dar lipsește `backoff()` exponential pentru retries |
| 17 | `app/Console/Commands/CreateSuperAdmin.php` | Poate seta orice email/parolă din CLI | OK pentru bootstrap, dar audit-log nu există |

### 🟢 LOW

| # | Locație | Problemă | Fix |
|---|---|---|---|
| 18 | `composer outdated --direct` | 10 pachete au update-uri (Laravel 12.59, Cashier 16.5.3, Inertia 3.1, Tinker 3.0) | Plan upgrade ulterior — major bumps testate (Inertia 3 = breaking) |
| 19 | `notification_prefs` (json), `meta` (json) | Coloane json fără default `{}` — null inițial | Adaugă default sau cast cu fallback |
| 20 | Niciun `Console/Kernel.php` | Laravel 12 nu mai folosește (routes/console.php) | OK — comportament Laravel 12 |

### Stare cache

| Cache | Status | Recomandare prod |
|---|---|---|
| Config | ❌ NOT CACHED | Rulează `php artisan config:cache` post-deploy |
| Routes | ❌ NOT CACHED | Rulează `php artisan route:cache` post-deploy |
| Events | ❌ NOT CACHED | Rulează `php artisan event:cache` |
| Views | ✅ CACHED | Auto-cached la primul render |
| `bootstrap/cache/packages.php` și `services.php` | ✅ Exist | Generate de `composer install` |

---

## 11. PERFORMANȚĂ

### `php artisan about` (extras)

```
Environment: local                ← schimbă în prod
PHP Version: 8.2.12
Debug Mode: ENABLED               ← dezactivează în prod
URL: 127.0.0.1:8000               ← schimbă cu APP_URL prod
Timezone: UTC
Locale: en

Cache: NOT CACHED (Config, Events, Routes)
Views: CACHED

Drivers:
  Broadcasting: log
  Cache: database
  Database: pgsql
  Logs: stack / single
  Mail: smtp
  Queue: database
  Session: database

Storage: C:\Users\Hacker\Desktop\REALTIX\REALTIX\public\storage LINKED
Spatie Permissions: v6.25.0
```

### Module PHP încărcate (relevante)

`bcmath, ctype, curl, date, dom, exif, fileinfo, filter, hash, iconv, intl, json, libxml, mbstring, openssl, pcre, PDO, pdo_pgsql (presupus), zip` (necesar pentru DOCX).

**🟠 Verifică pe VPS** că modulele `pdo_pgsql`, `gd`, `intl`, `mbstring`, `zip`, `openssl`, `curl`, `xml`, `dom`, `tokenizer` sunt instalate (cerințe Laravel 12 + DOCX/PDF).

### Disk usage

| Director | Mărime |
|---|---:|
| `storage/` | 19 MB (logs, cached views, scraped images) |
| `database/` | 11 MB (legacy SQLite — pgsql e cel folosit) |

### Index audit (rezumat)

Vezi secțiunea 3 — pentru cele 7 tabele majore, listate `🟡 Lipsă`:
- `users.agency_id`
- `generated_contracts.(agency_id, template_id, created_at)`
- `scraped_listings.(type, transaction_type, city)`

---

## 12. DEPENDENȚE EXTERNE

### Composer (`--direct`, outdated)

```
google/apiclient              2.19.2  → 2.19.3   patch
inertiajs/inertia-laravel     2.0.24  → 3.1.0    MAJOR (breaking)
laravel/boost                 2.4.4   → 2.4.6    patch
laravel/cashier               16.5.1  → 16.5.3   patch
laravel/framework             12.56.0 → 12.59.0  minor
laravel/sail                  1.57.0  → 1.59.0   minor (dev only)
laravel/sanctum               4.3.1   → 4.3.2    patch
laravel/socialite             5.26.1  → 5.27.0   minor
laravel/tinker                2.11.1  → 3.0.2    MAJOR (dev only)
nunomaduro/collision          8.9.3   → 8.9.4    patch (dev only)
```

### NPM (audit summary)

```
1 high severity vulnerability:
  axios (Invisible JSON Response Tampering via Prototype Pollution Gadget)
  Fix: npm audit fix
```

### Composer audit (security advisory)

```
phpseclib/phpseclib — CVE-2026-44167 (HIGH)
"phpseclib has a CVE-2024-27355 mitigation bypass —
 OID amplification DoS in ASN1::decodeOID()"
Affected: >=0.1.1,<=1.0.28 | >=3.0.0,<=3.0.51 | >=2.0.0,<=2.0.53
Fix: update la versiune patched
```

### Pachete abandonate / deprecated

Nu am detectat pachete explicit marked-as-abandoned în composer.lock.

---

## 13. ÎNTREBĂRI DESCHISE ÎNAINTE DE DEPLOY

1. **Domeniu + SSL**: Ce domeniu folosești? Există certificat (Let's Encrypt cu Certbot, Cloudflare)? `APP_URL` trebuie să fie HTTPS și domeniul real.

2. **Backup DB**: PostgreSQL backup-uri sunt configurate? Recomandare: `pg_dump` zilnic la 03:00 cu retention 7 zile + 4 săptămâni + 12 luni, push la storage extern (S3, B2, sau alt VPS).

3. **Stripe LIVE keys**: Toate cheile actuale par `test` mode. Înainte de deploy, schimbi pe `live` keys din [dashboard.stripe.com](https://dashboard.stripe.com/apikeys)? Webhook-ul LIVE trebuie reconfigurat la noul URL.

4. **Storage scrape-uit local crește indefinit**: Limita disk-ului VPS-ului? Plan de housekeeping pentru `storage/app/public/scraped/<id>/` (cel mai vechi/cel mai puțin vizualizat → ștergere)?

5. **Logs**: `LOG_CHANNEL=stack, LOG_STACK=single` scrie totul în `storage/logs/laravel.log` care crește. Add `daily` (max 14 zile) sau use `papertail`/external?

6. **Email SMTP throttle Brevo**: Brevo free are 300 emails/zi. Câte notificări estimezi/zi? Trecere la plan plătit sau switch la Resend/Postmark/SES?

7. **AI provider**: `AI_PROVIDER=groq` cu Llama 3.3 — pentru evaluare imobiliară, e suficient calitativ? Anthropic Claude (Sonnet/Haiku) e mai bun dar plătit. Care e bugetul?

8. **Rate limiting 999.md scraping**: Plafonul de 200/zi e setat. Dar 999.md poate bana IP-ul VPS-ului dacă detectează scraping agresiv. Plan B (rotație IP, proxy, sau switch la Partners API doar)?

9. **Queue worker downtime**: Systemd `realtix-queue.service` recomandat în deploy. Dar dacă crashes consecutive? Plan de monitoring (Sentry, Bugsnag, plain email alert pe failed_jobs >0)?

10. **Onboarding flow + Stripe trial**: User-ul nou primește 14 zile trial. La expirare, ce se întâmplă? Read-only sau hard-block? `EnsureAgencySubscription` middleware-ul are toate guard-urile corect setate?

11. **Imagine `public/storage/scraped/...`**: Acces direct prin URL fără auth? Trebuie autenticate sau OK public?

12. **GDPR / Date personale**: Stocate IDNP-uri în `generated_contracts.data` (json) și `contacts.meta`. Politică de retenție? Dreptul la ștergere (cascade delete pe user/contact)?

---

## REZUMAT DECIZII DE DEPLOY (action items)

### Înainte de `git push` final:
- [ ] `.env` production: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`
- [ ] Setează `STRIPE_WEBHOOK_SECRET` (din Stripe dashboard)
- [ ] `composer update phpseclib/phpseclib` (CVE)
- [ ] `npm audit fix` (axios)
- [ ] Schimbă Stripe la LIVE keys

### Pe VPS post-clone:
- [ ] `composer install --no-dev --optimize-autoloader`
- [ ] `npm ci && npm run build`
- [ ] `php artisan migrate --force`
- [ ] `php artisan storage:link`
- [ ] `php artisan config:cache && route:cache && view:cache && event:cache`
- [ ] Setup systemd `realtix-queue.service` (vezi `python_scraper/DEPLOY_VPS.md`)
- [ ] Crontab `* * * * * php artisan schedule:run` pentru user `www-data`
- [ ] `realtix:backfill-agency-admins` (one-shot) pentru a asigura admin pe fiecare agenție
- [ ] Configurează `pg_dump` zilnic

### Index-uri lipsă (migrație nouă):
```php
Schema::table('users', fn($t) => $t->index('agency_id'));
Schema::table('generated_contracts', function($t) {
    $t->index('agency_id');
    $t->index('template_id');
    $t->index('created_at');
});
Schema::table('scraped_listings', function($t) {
    $t->index(['type', 'transaction_type', 'city']);
});
```

---

*Raport generat automat pe 2026-05-17 pentru deployul de mâine. Toate problemele 🔴 trebuie rezolvate înainte de prima sesiune live.*
