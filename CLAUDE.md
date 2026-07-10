# REALTIX — context permanent

## Proiect
Asistent AI imobiliar pentru clienți (realtix.eu/assistant), peste ~40.000 anunțuri agregate
(intern + scraped 999.md/imobiliare.md/piata). CRM = pentru agenți; asistentul = pentru clienți.
Repo: github.com/stroiuliviu-cmyk/REALTIX. Appul Laravel e în subfolderul REALTIX/.

## Stack
Laravel 12, PHP 8.3 (prod; constraint composer `^8.2`), PostgreSQL 16 (prod) / 17 (dev),
Inertia + React 18, Vite 7, Tailwind 4, lucide-react, Spatie Permission (roluri:
super_admin/admin/realtor). Deploy: Laravel Forge zero-downtime. Cloudflare (SSL/CDN,
TrustProxies configurat pe range-uri CF explicite), Supervisor, Hetzner. Stripe via Cashier
(abonamente agenți), Socialite (Google — integrare Calendar existentă), scraper Python.
Locale: `ro` (default), `ru`, `en`.

## Arhitectură & foldere (din cod real)
Seam hexagonal (DDD-lite) pentru catalog + asistent, impus de teste de arhitectură:
- `app/Domain/{Catalog,Assistant}/` — DTO-uri readonly + contracte, PUR (fără Eloquent/DB/HTTP):
  `Contracts/PublicCatalog`, `Contracts/LlmClient`, `ListingCard/AgencyCard/ListingDetails/ListingQuery/Geo`.
- `app/Application/Assistant/Tools/` — orchestrare tool-use: `ToolRegistry`, `ToolDispatcher`,
  `Search{Listings,Agencies}Tool`, `GetListingDetailsTool`, `SchemaValidator`, `ToolResult`.
  NU atinge Models/DB/Infrastructure (doar contracte).
- `app/Infrastructure/{Catalog,Llm}/` — SINGURA zonă care atinge Eloquent/HTTP: `EloquentPublicCatalog`,
  `PublicListingQuery`, `PublicAgencyQuery`, `AnthropicClient`, `GroqClient`.
- `app/Services/Assistant/` — `ChatService` (SSE), `ChatEvent`, `ConversationManager`,
  `FavoritesService`, `QuotaService/QuotaOwner/QuotaConsumeResult`, `SystemPrompt`.
- `app/Http/Controllers/Assistant/` — `ChatController` (stream SSE), `ConversationsController`.
- `app/Http/Middleware/` — asistent: `AssistantGate` (poarta), `AssistantSession` (cookie owner_token);
  CRM: `EnsureSuperAdmin`, `EnsureAgencySubscription`, `CheckUserActive`, `ResolveAgencyFromSubdomain`,
  `BlockBlacklistedIp`, `HandleInertiaRequests`, `SetLocale`.
- `app/Listeners/MergeAnonymousAssistantData` — la login/register mută datele anonime pe cont.
- `app/Models/{Conversation,Message}` (+ modelele CRM existente).
- Frontend asistent: `resources/js/Features/Assistant/` — `AssistantApp.tsx`, `Markdown.tsx`,
  `transport/`, `hooks/{useChatStream,useFavorites,useLanguage,useIsMobile}`, `i18n/{ro,ru}`, `mock/`,
  `conversationsApi.ts`. Pagina Inertia: `resources/js/Pages/Assistant/Index.jsx` (toate paginile `.jsx`,
  vezi convenția blade @vite). Layout CRM principal: `resources/js/Layouts/AppLayout.jsx`.
- Prompt/knowledge editabil: `resources/assistant/domain_context.{ro,ru}.md`; config `config/assistant.php`.
- Migrații asistent (aditive): `conversations`, `messages`, `favorites`, `assistant_quota_ledger`,
  `assistant_quota_seen`.
- Scraper: `python_scraper/scraper_999.py` (scrie poze la `storage/app/public/scraped/{id}/NN.jpg`).
- Teste: `tests/Feature/{Assistant,Catalog}`, `tests/Unit/{AssistantArchTest,CatalogArchTest}`.

## Producție & deploy (CRITIC — nu redescoperi)
- Structură zero-downtime: `/home/forge/realtix.eu/current -> releases/*`; appul e la `current/REALTIX/`.
- `.env` pe care-l citește appul = `current/REALTIX/.env` (NU `~/realtix.eu/.env` shared). Orice
  schimbare de `.env` cere `php artisan config:cache`.
- Git: remote SSH (deploy key), branch de lucru `feat/assistant-backend` → merge în `main` → pe server
  `cd ~/realtix.eu/current && git pull origin main && cd REALTIX`.
- Runbook deploy după pull (din `REALTIX/`):
    • schimbare FRONTEND: `npm ci && npm run build && php artisan optimize:clear &&
      php artisan config:cache && php artisan route:cache`
    • schimbare PHP: la fel + `sudo service php8.3-fpm reload` (opcache)
    • doar `.env`: `php artisan config:cache`
- Migrații: ÎNTÂI `php artisan migrate:status | grep pending` (verifică), apoi `migrate --force`.
  INTERZIS pe prod: `migrate:fresh` / `migrate:refresh` / `migrate:reset` / `db:wipe` / `db:seed`.
- `VITE_ASSISTANT_MOCK=false` trebuie în `.env` ÎNAINTE de `npm run build` (altfel frontend pe mock).

## Asistent — config cheie
- Poartă: `ASSISTANT_ACCESS = disabled|preview|public` (AssistantGate; preview = super_admin sau IP).
  Acum: public.
- LLM: `ASSISTANT_LLM_PROVIDER = groq | anthropic`. Comutarea pe Anthropic = set `provider=anthropic`
  + `ANTHROPIC_API_KEY` + `config:cache` (cod deja gata: AnthropicClient/GroqClient).
  Notă: default-ul din cod e `anthropic` — env-ul trebuie să seteze explicit `groq` până e cheia.
- Modele: răspuns = Sonnet 5 (`claude-sonnet-5`); intent = Haiku 4.5 (`claude-haiku-4-5`);
  joburi în masă (normalizare/traducere) = Haiku 4.5. NU folosi Opus/Fable la runtime.

## Invarianți de arhitectură (nu încălca)
- Catalogul se citește DOAR prin `PublicCatalog` (`PublicListingQuery`/`PublicAgencyQuery`). `App\Domain\Catalog`
  e pur (fără Eloquent/DB); doar `App\Infrastructure\Catalog` atinge modelele. `App\Application` NU importă
  `App\Models`/`Illuminate\Database`/`App\Infrastructure` (doar contractul). Testele arch impun asta
  (`App\Application` + `App\Domain`). Notă: regula NU e impusă GLOBAL pe Http — CRM-ul legacy folosește
  modelele; controllerele ASISTENTULUI trebuie totuși să treacă prin seam.
- Doar câmpuri publice (whitelist); NICIODATĂ `raw_data`/`phone`/date de contact în DTO.
- Migrațiile asistentului sunt aditive (`Schema::create`), nu ating tabelele CRM.

## Convenții & calitate
- PHP tipat strict; DTO readonly; injectează contracte, nu implementări; enums pentru valori fixe.
- Rulează ÎNAINTE de a raporta: typecheck + vitest + pest. (15 eșecuri PHP preexistente în
  Auth/Profile/Scraper sunt independente — nu le număra ca noi.)
- Discovery → confirmare → implementare pentru orice atinge date reale/producție sau users/auth.
- Commit-uri mici, mesaje clare; NU face merge în main fără confirmare; NU comite `.env`/secrete.

## Securitate
- Nu comite `.env`. Rotește orice cheie expusă. Poarta 404 (nu 403). `raw_data`/`phone` niciodată public.

## Priorități strategice (coada de execuție)
1. Sonnet 5 (comutare când e cheia). 2. System prompt consultant + legislație MD. 3. Price
intelligence (AI valuation în carduri). 4. Calitate date (dedup/prospețime/poze). 5. Cont client +
Google login → căutări salvate + alerte. 6. „Revendică-ți anunțurile" + dashboard leaduri agenții.
Model de business: cumpărători gratuiți; venit din agenți (abonament + boost + leaduri).

## Model recomandat pentru Claude Code
Default Sonnet 5; Opus 4.8 doar la taskuri grele (arhitectură, bug urât, refactor mare).

## Principii de lucru (obligatoriu la fiecare task)

1. DUCE TASKUL CAP-COADĂ. Nu raporta „gata" până nu e: implementat + testat (typecheck +
   vitest + pest verzi) + criteriile de acceptanță bifate + (dacă atinge producția) pașii de
   deploy verificați. Fiecare task are criterii de acceptanță explicite; le bifezi pe toate.
   Dacă rămâne ceva neterminat, spui clar CE și DE CE, nu maschezi.

2. ANTICIPEAZĂ ERORILE ÎNAINTE SĂ APARĂ. Înainte de a scrie cod, întreabă-te „ce poate crăpa?"
   și tratează proactiv:
   - diferențe dev↔prod: opcache (PHP → php-fpm reload), config cache (env → config:cache),
     .env real la current/REALTIX/.env, zero-downtime, appul în subfolder, IP prin Cloudflare;
   - cazuri limită: null/gol, date scraped murdare, valute multiple (EUR/MDL/USD), imagini moarte,
     paginare, follow-up fără context;
   - efecte colaterale pe CRM-ul existent (nu strica fluxul agenților);
   - build-time vs runtime (ex. VITE_* se coace la build).
   Adaugă teste pentru cazurile-limită pe care le prevezi.

3. SOLUȚIA CEA MAI BUNĂ PE TERMEN LUNG, nu patch-ul rapid. Reparație la CAUZA-RĂDĂCINĂ, nu la
   simptom. Dacă alegi o scurtătură, spune explicit de ce și ce datorie tehnică lasă. Preferă
   consistența (ex. simetria internal/external) și refolosirea (contracte, helpers existenți).

4. AUTO-REVIEW ÎNAINTE DE RAPORT. Rulează testele, citește-ți diff-ul, gândește „ce aș putea
   sparge?". Nu raporta fără să fi rulat verificările.

5. DISCOVERY → CONFIRMARE → IMPLEMENTARE pentru orice atinge date reale, producție, users/auth
   sau tabele partajate. Oprește-te și întreabă când e ambiguu — NU ghici (mai ales câmpuri de
   contact/PII sau nume de coloane).

6. RAPORTEAZĂ CINSTIT: ce ai făcut, ce riscuri/edge-case-uri rămân, ce ai schimbat peste ce s-a
   cerut (cu motivul), și ce trebuie decis de om. Semnalează proactiv orice ai găsit pe parcurs
   (bug preexistent, risc de securitate, datorie tehnică).

---
<!-- Protocoale + reguli acumulate (self-improvement). Păstrate din versiunea anterioară. -->

## Self-improvement protocol

- После любой моей коррекции ты обязан предложить лаконичное правило и дописать его в этот CLAUDE.md в подходящую секцию.
- Формат правила: одно императивное предложение, без обоснования и без примеров, если случай не двусмысленный.
- Перед добавлением правила выполни поиск по этому файлу. Если уже есть правило, покрывающее этот случай, не дублируй, а уточни существующее.
- Держи секции протоколов/правил компактными. При превышении объедини пересекающиеся правила и удали устаревшие.
- После фикса бага записывай правило про класс корневой причины, а не про конкретный симптом. Никогда не пиши правила про единичный инцидент. Всегда обобщай до класса ошибок.
- Если правило начинает противоречить более раннему, явно укажи это и предложи мне выбор, какое оставить.
- Раз в неделю при первой сессии прогоняй CLAUDE.md и сообщай: какие правила ни разу не сработали, какие пересекаются, какие можно удалить.

## Bug fix protocol

- При фиксе бага сначала сформулируй корневую причину одной строкой до правок кода.
- После успешного фикса предложи правило в Self-improvement protocol про класс этой ошибки.
- Если фикс получился плохой и я попросил переделать, не патчь поверх — откати и реализуй заново с учётом нового понимания.
- Если воспроизводимость бага неполная, сначала добавь тест, который его ловит, потом фикси.
- Перед написанием `selectRaw`/`whereRaw`/`DB::table()` запросов на таблицу, к которой раньше не обращался, выполни `information_schema.columns` или `\Schema::hasColumn` для проверки имён колонок; не предполагай схему по имени поля в модели или по логичной догадке.
- В Route::… с implicit model binding имя сегмента (`{agent}`) обязано совпадать с именем переменной в сигнатуре контроллера (`User $agent`); при рассинхроне Laravel инжектит пустую модель, `abort_unless` срабатывает на null, и фронт получает тихий 403, который Inertia заглатывает — кнопка визуально не работает.
- При массовом `update()`/`firstWhere()` фильтруй по уникальному полю (`name`, `slug`, `id`), а не по полю с возможными дубликатами (`type`, `status`, `role`) — иначе обновишь не ту запись и заметишь только при визуальной проверке.

## File hygiene

- Не раздувай CLAUDE.md — лучше короткое плотное правило, чем абзац.
- Группируй правила по секциям.
- Перед коммитом любых правок CLAUDE.md показывай мне diff и жди подтверждения.

## CRM — reguli acumulate (Architecture / Style / Project-specific)

- Многоарендность по `agency_id` через trait `BelongsToAgency`; не запрашивай данные другой агенции из контроллера.
- Применяй `BelongsToAgency` только к моделям, чьи строки принадлежат конкретной агенции (клиенты, листинги, контракты). Публичные/общие данные (скрейпленные внешние объявления, справочники, конфиги платформы) держи без global scope — иначе новый пользователь без собственных данных ничего не увидит.
- Роли через Spatie Permission: `super_admin` (платформа), `admin` (агенция), `realtor` (агент); первый зарегистрированный пользователь получает `admin` автоматически.
- Communication по умолчанию на румынском; технические термины на английском.
- Inertia-страницы в `resources/js/Pages/<Domain>/<Action>.jsx`; React-компоненты определяй в module scope, никогда внутри render-функции.
- Контроллеры возвращают `Inertia::render` или `RedirectResponse` с `flash()`; никогда не оба.
- Не дублируй на одном элементе Tailwind-классы, задающие одно и то же CSS-свойство.
- В segmented control / toggle-pill ширину анимированной подсветки выражай через `items.length` (`calc(100% / ${items.length})`), а не хардкодом.
- При интеграции растровых ассетов проверяй прозрачность фона и плотность обрезки до правок кода.
- API ключ 999.md Partners хранится в `agency->settings['portal_999md_api_key']`; никогда не хардкодь его в коде.
- Шаблоны контрактов добавляй через `App\Services\DefaultContractTemplates`, а не правкой сидера напрямую.
- Очереди работают через `QUEUE_CONNECTION=database`; диспатченные джобы не выполнятся, пока не запущен `php artisan queue:work`.
- На Postgres не используй `DB::table()->truncate()` в циклах по таблицам с FK (Laravel генерирует `TRUNCATE ... CASCADE`); используй `migrate:fresh` один раз или `DELETE FROM`.
- При включённом `Cashier::calculateTaxes()` в Stripe Checkout всегда передавай `billing_address_collection='required'` и `customer_update[address]='auto'`.
- Для редиректа из Inertia POST-а на внешний URL (Stripe Checkout, OAuth) используй `Inertia::location($url)`, а не `redirect($url)` — обычный 302 ловится axios-ом и падает на CORS.
- В `selectRaw`/`whereRaw` не используй функции одного движка (`strftime` — SQLite; `MONTH()`, `GROUP_CONCAT()` — MySQL); используй Postgres-native (`EXTRACT`, `STRING_AGG`, `PERCENTILE_CONT ... WITHIN GROUP`) или группируй в PHP.
- В Postgres алиасы из `SELECT` (`COUNT(*) as foo`) НЕ видны в `HAVING`/`WHERE`; используй `->havingRaw('COUNT(*) >= 3')` или подзапрос.
- При scraping/HTML-extract сначала ищи в узком CSS-селекторе, потом общий regex по всей странице; держи blacklist сервисных телефонов/URL-ов площадки.
- Относительный путь к медиа из БД (`scraped/{id}/NN.jpg`) всегда прогоняй через `Storage::disk('public')->url()` перед отдачей на фронт; если один путь маппится из нескольких мест (internal vs external), все ветки используют один резолвер.
- Ответы LLM с числами + производным label (`min/max/regional_avg` + `valuation`) пересчитывай детерминированно в коде из чисел, не доверяя метке модели.
- Перед использованием не-default PHP-расширений (`zip`, `gd`, `imagick`, `intl`) проверяй `class_exists()` и показывай явную ошибку в UI.
- В DomPDF не используй core PDF-шрифты (`Times-Roman`, `Helvetica`, `Courier`) — Latin-1-only, ломают диакритику; ставь `defaultFont` на `DejaVu Serif/Sans/Mono` или embed кастомный TTF.
