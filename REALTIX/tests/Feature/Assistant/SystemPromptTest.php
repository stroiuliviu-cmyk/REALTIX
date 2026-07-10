<?php

declare(strict_types=1);

use App\Services\Assistant\SystemPrompt;

it('embeds the advisor role and domain knowledge (RO)', function () {
    $prompt = SystemPrompt::build('ro');

    // rolul de consilier + instrucțiunea de a nu forța o căutare pentru sfaturi
    expect($prompt)->toContain('Consilier')
        ->and($prompt)->toContain('FĂRĂ a forța o căutare')
        ->and($prompt)->toContain('recomandă un specialist');

    // cunoștințele din fișierul .md sunt lipite în prompt
    expect($prompt)->toContain('prețul pe m²')
        ->and($prompt)->toContain('Botanica')
        ->and($prompt)->toContain('cărămidă / panel');
});

it('embeds the advisor role and domain knowledge (RU)', function () {
    $prompt = SystemPrompt::build('ru');

    expect($prompt)->toContain('Консультант')
        ->and($prompt)->toContain('БЕЗ принудительного поиска')
        ->and($prompt)->toContain('рекомендуй специалиста');

    expect($prompt)->toContain('цену за м²')
        ->and($prompt)->toContain('Ботаника')
        ->and($prompt)->toContain('кирпич / панель');
});

it('keeps the anti-hallucination and format rules intact', function () {
    $ro = SystemPrompt::build('ro');
    expect($ro)->toContain('anti-halucinație')          // regula 2
        ->and($ro)->toContain('NU enumera')             // regula 5 (format)
        ->and($ro)->toContain('nu inventa cifre');      // consilierul tot nu inventează
});
