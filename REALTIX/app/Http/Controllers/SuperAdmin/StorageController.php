<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
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
            'byAgency'     => $byAgency,
            'foldersByDir' => $foldersByDir,
            'planLabels'   => ['starter' => 'Solo', 'medium' => 'Team', 'pro' => 'Growth'],
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
