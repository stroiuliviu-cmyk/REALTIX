<?php

namespace App\Jobs;

use App\Models\Agency;
use App\Services\Portals\Scrape999Service;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class Fetch999ListingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 300;

    public function __construct(
        public Agency $agency,
        public int    $pagesPerCategory = 2,
    ) {}

    public function handle(Scrape999Service $scraper): void
    {
        $count = $scraper->syncAll($this->agency, $this->pagesPerCategory);
        Log::info("Fetch999ListingsJob: {$count} anunțuri noi salvate pentru agency #{$this->agency->id}");
    }
}
