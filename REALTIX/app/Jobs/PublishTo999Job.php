<?php

namespace App\Jobs;

use App\Models\AutoPostRequest;
use App\Services\Portals\Portal999Service;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PublishTo999Job implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 60;

    public function __construct(public AutoPostRequest $autoPost) {}

    public function handle(Portal999Service $service): void
    {
        $autoPost = $this->autoPost->load('property.media', 'property.user');
        $property = $autoPost->property;
        $agency   = $autoPost->property->user->agency ?? null;

        if (! $property || ! $agency) {
            $this->fail('Property or agency not found.');
            return;
        }

        $results  = $autoPost->platform_results ?? [];
        $existing = $results['999md']['external_id'] ?? null;

        try {
            if ($existing) {
                $response = $service->updateAd($existing, $property, $agency);
            } else {
                $response = $service->createAd($property, $agency);
            }

            $externalId  = $response['id'] ?? $response['advert_id'] ?? null;
            $externalUrl = $externalId
                ? "https://999.md/ro/anunturi/{$externalId}"
                : null;

            $results['999md'] = [
                'status'      => 'posted',
                'external_id' => $externalId,
                'url'         => $externalUrl,
                'error'       => null,
            ];

            $autoPost->update([
                'status'           => AutoPostRequest::STATUS_POSTED,
                'platform_results' => $results,
                'posted_at'        => now(),
            ]);

        } catch (\Throwable $e) {
            Log::error("PublishTo999Job failed for autoPost#{$autoPost->id}: " . $e->getMessage());

            $results['999md'] = [
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ];

            $autoPost->update([
                'status'           => AutoPostRequest::STATUS_FAILED,
                'platform_results' => $results,
            ]);

            throw $e;
        }
    }
}
