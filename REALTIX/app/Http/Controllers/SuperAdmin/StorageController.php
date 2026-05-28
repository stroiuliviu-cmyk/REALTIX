<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class StorageController extends Controller
{
    public function index(): Response
    {
        // Total disk
        $diskPath = storage_path('app/public');
        $free  = @disk_free_space($diskPath) ?: 0;
        $total = @disk_total_space($diskPath) ?: 0;
        $used  = $total > 0 ? $total - $free : 0;

        // Per-agency: file COUNT from DB (cheap) + bytes from disk scan of agencies/{id} folder.
        // property_media doesn't store file size, so we walk the disk for accurate bytes.
        $byAgencyRaw = DB::table('property_media')
            ->join('properties', 'properties.id', '=', 'property_media.property_id')
            ->join('agencies', 'agencies.id', '=', 'properties.agency_id')
            ->selectRaw('agencies.id, agencies.name, agencies.subscription_plan, COUNT(property_media.id) as files')
            ->groupBy('agencies.id', 'agencies.name', 'agencies.subscription_plan')
            ->orderByRaw('COUNT(property_media.id) DESC')
            ->limit(20)->get();

        $byAgency = $byAgencyRaw->map(function ($row) {
            $row->bytes = $this->dirSize(storage_path("app/public/agencies/{$row->id}"));
            return $row;
        })->sortByDesc('bytes')->values();

        $totalFiles = DB::table('property_media')->count();
        $totalAgencyBytes = (int) $byAgency->sum('bytes');

        // Folder counts (top-level storage breakdown)
        $foldersByDir = collect(['agencies', 'users', 'scraped'])->mapWithKeys(function ($dir) {
            $path = storage_path("app/public/{$dir}");
            if (! is_dir($path)) return [$dir => ['files' => 0, 'bytes' => 0]];
            $size = 0; $count = 0;
            try {
                $iter = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS));
                foreach ($iter as $file) {
                    if ($file->isFile()) { $size += $file->getSize(); $count++; }
                }
            } catch (\Throwable $e) {}
            return [$dir => ['files' => $count, 'bytes' => $size]];
        })->all();

        // Scraped 999.md storage split by listing category (type). Images are
        // stored flat under scraped/{external_id}/NN.jpg — walking 13k+ dirs
        // per request would be slow, so we ESTIMATE size from image_count ×
        // average bytes/image (measured ~152.7 KB from a 200-file sample).
        // Postgres-only (jsonb_array_length); production runs on pgsql.
        $avgBytesPerImage = 152.7 * 1024;
        $scrapedByCategory = [];
        if (Schema::hasTable('scraped_listings')) {
            // images column is `json` (not jsonb), so we use json_array_length.
            // The CASE guard ignores rows where images is stored as a non-array
            // shape (e.g. a stray object) — those would crash json_array_length.
            $rows = DB::table('scraped_listings')
                ->where('source', '999md')
                ->whereNotNull('images')
                ->selectRaw("
                    type,
                    COUNT(*) as listings,
                    COALESCE(SUM(
                        CASE WHEN json_typeof(images) = 'array'
                             THEN json_array_length(images)
                             ELSE 0 END
                    ), 0) as total_images
                ")
                ->groupBy('type')
                ->orderByRaw('total_images DESC')
                ->get();

            $scrapedByCategory = $rows->map(fn ($r) => [
                'type'         => $r->type ?: 'necunoscut',
                'listings'     => (int) $r->listings,
                'total_images' => (int) $r->total_images,
                'est_bytes'    => (int) round($r->total_images * $avgBytesPerImage),
            ])->values()->all();
        }

        return Inertia::render('SuperAdmin/Storage/Index', [
            'disk' => [
                'used_bytes'  => $used,
                'free_bytes'  => $free,
                'total_bytes' => $total,
                'used_pct'    => $total > 0 ? round(($used / $total) * 100, 1) : 0,
            ],
            'media' => [
                'total_files'        => $totalFiles,
                'total_agency_bytes' => $totalAgencyBytes,
            ],
            'byAgency'          => $byAgency,
            'foldersByDir'      => $foldersByDir,
            'scrapedByCategory' => $scrapedByCategory,
            'planLabels'        => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
        ]);
    }

    /** Sum file sizes inside a directory recursively; returns 0 if dir missing. */
    private function dirSize(string $path): int
    {
        if (! is_dir($path)) return 0;
        $size = 0;
        try {
            $iter = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS));
            foreach ($iter as $file) {
                if ($file->isFile()) $size += $file->getSize();
            }
        } catch (\Throwable $e) {}
        return $size;
    }
}
