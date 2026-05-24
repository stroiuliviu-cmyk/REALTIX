<?php

namespace App\Http\Controllers;

use App\Jobs\Sync999AdvertsJob;
use App\Models\Property;
use App\Models\ScrapedListing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class WebOffersController extends Controller
{
    public function sync(Request $request): RedirectResponse
    {
        $agency = $request->user()->agency;

        if (! $agency) {
            return back()->with('error', 'Nu ai o agenție asociată.');
        }

        // Run Python scraper in background (Symfony Process, non-blocking)
        $script = base_path('python_scraper/scraper_999.py');
        if (! file_exists($script)) {
            return back()->with('error', 'Scraper-ul Python lipsește din python_scraper/scraper_999.py');
        }

        $python = env('PYTHON_BIN', 'python');
        $cmd = sprintf(
            '%s %s --pages=1 --skip-recent-hours=0 --agency=%d',
            $python,
            escapeshellarg($script),
            $agency->id,
        );

        // Detach to background so the user gets immediate UI response
        $logFile = storage_path('logs/scraper_999.log');
        if (PHP_OS_FAMILY === 'Windows') {
            // pclose+popen in background mode on Windows
            pclose(popen("start /B {$cmd} > " . escapeshellarg($logFile) . " 2>&1", 'r'));
        } else {
            shell_exec("nohup {$cmd} > " . escapeshellarg($logFile) . " 2>&1 &");
        }

        return back()->with('success', 'Sincronizarea cu 999.md a fost inițiată. Procesul rulează în fundal (~3-7 minute pentru toate categoriile). Reîncarcă pagina după ce se termină.');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $applyNonFacetFilters = function ($q) use ($request, $user) {
            $q->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                    $q->where('title',    'like', "%{$s}%")
                      ->orWhere('city',   'like', "%{$s}%")
                      ->orWhere('district','like', "%{$s}%")
                      ->orWhere('phone',  'like', "%{$s}%");
                }))
                ->when($request->city,     fn ($q, $c) => $q->where('city',     'like', "%{$c}%"))
                ->when($request->district, fn ($q, $d) => $q->where('district', 'like', "%{$d}%"))
                ->when($request->price_min, fn ($q, $v) => $q->where('price', '>=', (float) $v))
                ->when($request->price_max, fn ($q, $v) => $q->where('price', '<=', (float) $v))
                ->when($request->area_min,  fn ($q, $v) => $q->where('area', '>=', (float) $v))
                ->when($request->area_max,  fn ($q, $v) => $q->where('area', '<=', (float) $v))
                ->when($request->ai_valuation, fn ($q, $v) => $q->where('ai_valuation', $v))
                ->when($request->date_from, fn ($q, $d) => $q->where('created_at', '>=', \Carbon\Carbon::parse($d)->startOfDay()))
                ->when($request->date_to,   fn ($q, $d) => $q->where('created_at', '<=', \Carbon\Carbon::parse($d)->endOfDay()))
                ->when($request->favorite,
                    fn ($q) => $q->whereHas('favoritedByUsers', fn ($fq) => $fq->where('user_id', $user->id)));
        };

        $applySources = function ($q) use ($request) {
            $q->when($request->filled('sources') && is_array($request->sources),
                fn ($q) => $q->whereIn('source', $request->sources));
        };

        $applyOwnerTypes = function ($q) use ($request) {
            $q->when($request->filled('owner_types') && is_array($request->owner_types),
                fn ($q) => $q->whereIn('owner_type', $request->owner_types));
        };

        $applyTypes = function ($q) use ($request) {
            $q->when($request->filled('types') && is_array($request->types),
                fn ($q) => $q->whereIn('type', $request->types));
        };

        $applyTransaction = function ($q) use ($request) {
            $q->when($request->transaction_type,
                fn ($q, $t) => $q->where('transaction_type', $t));
        };

        $query = ScrapedListing::query()
            ->tap($applyNonFacetFilters)
            ->tap($applySources)
            ->tap($applyOwnerTypes)
            ->tap($applyTypes)
            ->tap($applyTransaction);

        match ($request->sort) {
            'price_asc'   => $query->orderBy('price'),
            'price_desc'  => $query->orderByDesc('price'),
            'cheap_first' => $query->orderByRaw("CASE ai_valuation WHEN 'cheap' THEN 0 WHEN 'average' THEN 1 ELSE 2 END"),
            default       => $query->latest(),
        };

        // Faceted counts: each facet group's count applies all OTHER active filters
        // (non-facet + the 3 other facet groups) but NOT its own — so checkboxes
        // in the same group stay clickable while still reflecting the rest of the query.
        $countsByType = ScrapedListing::query()
            ->tap($applyNonFacetFilters)
            ->tap($applySources)
            ->tap($applyOwnerTypes)
            ->tap($applyTransaction)
            ->selectRaw('type, COUNT(*) as cnt')
            ->groupBy('type')
            ->pluck('cnt', 'type');

        $countsByTransaction = ScrapedListing::query()
            ->tap($applyNonFacetFilters)
            ->tap($applySources)
            ->tap($applyOwnerTypes)
            ->tap($applyTypes)
            ->selectRaw('transaction_type, COUNT(*) as cnt')
            ->groupBy('transaction_type')
            ->pluck('cnt', 'transaction_type');

        $countsBySource = ScrapedListing::query()
            ->tap($applyNonFacetFilters)
            ->tap($applyOwnerTypes)
            ->tap($applyTypes)
            ->tap($applyTransaction)
            ->selectRaw('source, COUNT(*) as cnt')
            ->groupBy('source')
            ->pluck('cnt', 'source');

        $countsByOwner = ScrapedListing::query()
            ->tap($applyNonFacetFilters)
            ->tap($applySources)
            ->tap($applyTypes)
            ->tap($applyTransaction)
            ->selectRaw('owner_type, COUNT(*) as cnt')
            ->groupBy('owner_type')
            ->pluck('cnt', 'owner_type');

        $totalCount = ScrapedListing::count();
        $lastSyncedAt = ScrapedListing::max('updated_at');

        // Distinct districts (for the location dropdown)
        $districts = ScrapedListing::query()
            ->whereNotNull('district')
            ->where('district', '!=', '')
            ->when($request->city, fn ($q, $c) => $q->where('city', 'like', "%{$c}%"))
            ->selectRaw('district, COUNT(*) as cnt')
            ->groupBy('district')
            ->orderByDesc('cnt')
            ->limit(50)
            ->get(['district', 'cnt']);

        $cities = ScrapedListing::query()
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->selectRaw('city, COUNT(*) as cnt')
            ->groupBy('city')
            ->orderByDesc('cnt')
            ->limit(30)
            ->get(['city', 'cnt']);

        return Inertia::render('WebOffers/Index', [
            'listings'    => $query->paginate(20)->withQueryString(),
            'filters'     => $request->only([
                'search', 'sources', 'owner_types', 'types', 'transaction_type',
                'city', 'district', 'price_min', 'price_max', 'area_min', 'area_max',
                'ai_valuation', 'date_from', 'date_to', 'favorite', 'sort',
            ]),
            'counts' => [
                'total'        => $totalCount,
                'by_type'      => $countsByType,
                'by_transaction'=> $countsByTransaction,
                'by_source'    => $countsBySource,
                'by_owner'     => $countsByOwner,
                'last_synced'  => $lastSyncedAt,
            ],
            'districts'        => $districts,
            'cities'           => $cities,
            'favoriteIds' => $user->favoriteScrapedListings()->pluck('scraped_listing_id')->all(),
            'importedIds' => $user->importedScrapedListings()->pluck('scraped_listing_id')->all(),
        ]);
    }

    public function toggleFavorite(Request $request, ScrapedListing $scrapedListing): RedirectResponse
    {
        $user = $request->user();

        if ($user->favoriteScrapedListings()->where('scraped_listing_id', $scrapedListing->id)->exists()) {
            $user->favoriteScrapedListings()->detach($scrapedListing->id);
        } else {
            $user->favoriteScrapedListings()->attach($scrapedListing->id);
        }

        return back();
    }

    public function import(Request $request, ScrapedListing $scrapedListing): RedirectResponse
    {
        $user = $request->user();

        if ($existing = $user->importedScrapedListings()->where('scraped_listing_id', $scrapedListing->id)->first()) {
            $propId = $existing->pivot->property_id ?? null;
            if ($propId) {
                return redirect()->route('properties.show', $propId)
                    ->with('info', 'Acest anunț era deja în proprietățile tale.');
            }
        }

        $property = Property::create([
            'agency_id'        => $user->agency_id,
            'user_id'          => $user->id,
            'title'            => $scrapedListing->title,
            'description_ro'   => $scrapedListing->description,
            'type'             => $scrapedListing->type ?? 'apartment',
            'transaction_type' => $scrapedListing->transaction_type ?? 'sale',
            'price'            => $scrapedListing->price,
            'currency'         => $scrapedListing->currency ?? 'EUR',
            'area_total'       => $scrapedListing->area,
            'rooms'            => $scrapedListing->rooms,
            'floor'            => $scrapedListing->floor,
            'floors_total'     => $scrapedListing->floors_total,
            'city'             => $scrapedListing->city ?? 'Chișinău',
            'district'         => $scrapedListing->district,
            'address'          => $scrapedListing->address,
            'status'           => 'active',
            'meta'             => array_filter([
                'imported_from'    => $scrapedListing->source,
                'source_url'       => $scrapedListing->external_url,
                'imported_at'      => now()->toIso8601String(),
                'phone'            => $scrapedListing->phone,
                'year_built'       => $scrapedListing->year_built,
                'condition'        => $scrapedListing->condition,
                'building_type'    => $scrapedListing->building_type,
                'heating'          => $scrapedListing->heating,
                'furnished'        => $scrapedListing->furnished,
                'parking'          => $scrapedListing->parking,
                'balcony'          => $scrapedListing->balcony,
                'elevator'         => $scrapedListing->elevator,
                'pets_allowed'     => $scrapedListing->pets_allowed,
                'air_conditioning' => $scrapedListing->air_conditioning,
            ], fn($v) => $v !== null && $v !== ''),
        ]);

        // Copy images: max 15. Local scraper paths (scraped/{id}/N.jpg) are reused
        // as-is; remote CDN URLs (https://i.simpalsmedia.com/...) are downloaded
        // into storage/properties/{id}/ so the property owns its own copy.
        if (! empty($scrapedListing->images) && is_array($scrapedListing->images)) {
            $sortOrder = 0;
            foreach (array_slice($scrapedListing->images, 0, 15) as $imgPath) {
                if (! is_string($imgPath) || $imgPath === '') continue;

                $localPath = str_starts_with($imgPath, 'http')
                    ? $this->downloadRemoteImage($imgPath, $property->id, $sortOrder + 1)
                    : $imgPath;

                if (! $localPath) continue;

                $property->media()->create([
                    'path'       => $localPath,
                    'is_cover'   => $sortOrder === 0,
                    'sort_order' => $sortOrder,
                ]);
                $sortOrder++;
            }
        }

        $user->importedScrapedListings()->attach($scrapedListing->id, [
            'property_id' => $property->id,
        ]);

        return redirect()->route('properties.show', $property)
            ->with('success', 'Anunțul a fost adăugat în proprietățile tale.');
    }

    private const ALLOWED_IMG_EXT = ['jpg', 'jpeg', 'png', 'webp'];

    private function downloadRemoteImage(string $url, int $propertyId, int $idx): ?string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 REALTIX-Importer/1.0',
                'Accept'     => 'image/*,*/*;q=0.8',
            ])->timeout(15)->get($url);

            if (! $response->successful()) return null;

            $body = $response->body();
            if (strlen($body) < 1000) return null; // likely 1x1 placeholder

            $path = parse_url($url, PHP_URL_PATH) ?: '';
            $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (! in_array($ext, self::ALLOWED_IMG_EXT, true)) {
                $ext = 'jpg';
            }

            $filename     = sprintf('%02d.%s', $idx, $ext);
            $relativePath = "properties/{$propertyId}/{$filename}";

            // Forge: storage/ is shared between releases. Storage::disk('public')
            // resolves to release-local on agentic deploys, breaking URLs.
            // Write absolute path to shared storage, with local-dev fallback.
            $shared = '/home/forge/realtix.eu/storage/app/public';
            $absoluteBase = is_dir($shared) ? $shared : storage_path('app/public');
            $absolutePath = $absoluteBase . '/' . $relativePath;

            if (! is_dir(dirname($absolutePath))) {
                @mkdir(dirname($absolutePath), 0775, true);
            }

            if (file_put_contents($absolutePath, $body) === false) {
                return null;
            }

            return $relativePath;
        } catch (\Throwable) {
            return null;
        }
    }
}
