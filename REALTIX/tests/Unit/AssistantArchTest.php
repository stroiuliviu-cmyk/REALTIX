<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Assistant LLM seam — architecture guards
|--------------------------------------------------------------------------
|
| App\Domain\Assistant holds only the LlmClient contract (pure, no framework,
| no HTTP). App\Infrastructure\Llm is the ONE place that talks to the
| Anthropic API. ChatService (Application) will depend on the contract.
*/

arch('assistant domain layer is free of Eloquent, DB and HTTP')
    ->expect('App\Domain\Assistant')
    ->not->toUse([
        'App\Models',
        'App\Infrastructure',
        'Illuminate\Database',
        'Illuminate\Support\Facades\Http',
        'Illuminate\Support\Facades\DB',
    ]);

arch('Infrastructure\Llm depends on the assistant domain contract')
    ->expect('App\Infrastructure\Llm')
    ->toUse('App\Domain\Assistant\Contracts\LlmClient');

arch('the LLM implementation never touches Eloquent models')
    ->expect('App\Infrastructure\Llm')
    ->not->toUse(['App\Models', 'Illuminate\Database']);
