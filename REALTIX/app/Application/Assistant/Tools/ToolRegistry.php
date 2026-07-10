<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

/**
 * SOURCE OF TRUTH for the assistant's tool definitions (Anthropic `tools`
 * format: name + description + input_schema as strict JSON-Schema). The
 * executors validate against these schemas; the future ChatService sends
 * exactly these definitions to the model. Keep schema and executor in sync.
 */
final class ToolRegistry
{
    public const SEARCH_LISTINGS = 'search_listings';
    public const GET_LISTING_DETAILS = 'get_listing_details';
    public const SEARCH_AGENCIES = 'search_agencies';

    /** @return list<array<string,mixed>> all definitions, in Anthropic tool format */
    public static function definitions(): array
    {
        return [
            [
                'name' => self::SEARCH_LISTINGS,
                'description' => 'Caută anunțuri imobiliare publice din Moldova (inventar intern al agențiilor '
                    . '+ anunțuri externe de pe site-urile publice). Întoarce cel mult 10 rezultate pe pagină. '
                    . 'Prețurile sunt în moneda originală a anunțului, fără conversie: price_min/price_max se '
                    . 'interpretează în `currency` (implicit EUR). '
                    . 'Nu inventa obiecte; folosește doar ce întorc rezultatele — dacă lista e goală, spune '
                    . 'utilizatorului că nu s-a găsit nimic și propune lărgirea criteriilor.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'deal_type' => [
                            'type' => 'string',
                            'enum' => ['sale', 'rent'],
                            'description' => 'Tipul tranzacției: vânzare sau chirie.',
                        ],
                        'property_type' => [
                            'type' => 'string',
                            'enum' => ['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'garage'],
                            'description' => 'Tipul imobilului.',
                        ],
                        'location' => [
                            'type' => 'string',
                            'description' => 'Oraș/localitate (ex. „Chișinău", „Bălți"). Variante ca „Chisinau"/„Kishinev" sunt acceptate.',
                        ],
                        'district' => [
                            'type' => 'string',
                            'description' => 'Sector/cartier (ex. „Botanica", „Râșcani", „Buiucani").',
                        ],
                        'price_min' => ['type' => 'number', 'minimum' => 0, 'description' => 'Preț minim, în `currency`.'],
                        'price_max' => ['type' => 'number', 'minimum' => 0, 'description' => 'Preț maxim, în `currency`.'],
                        'currency' => [
                            'type' => 'string',
                            'enum' => ['EUR', 'MDL', 'USD'],
                            'description' => 'Moneda pentru price_min/price_max (implicit EUR). Nu se face conversie.',
                        ],
                        'rooms_min' => ['type' => 'integer', 'minimum' => 1, 'description' => 'Număr minim de camere.'],
                        'rooms_max' => ['type' => 'integer', 'minimum' => 1, 'description' => 'Număr maxim de camere.'],
                        'area_min' => ['type' => 'number', 'minimum' => 0, 'description' => 'Suprafață minimă (m²).'],
                        'area_max' => ['type' => 'number', 'minimum' => 0, 'description' => 'Suprafață maximă (m²).'],
                        'owner_type' => [
                            'type' => 'string',
                            'enum' => ['owner', 'agency'],
                            'description' => 'Cine a publicat: proprietar direct sau agenție. `owner` restrânge la anunțuri externe.',
                        ],
                        'site' => [
                            'type' => 'string',
                            'enum' => ['999.md', 'imobiliare.md', 'piata.md'],
                            'description' => 'Doar anunțuri externe de pe acest site.',
                        ],
                        'source' => [
                            'type' => 'string',
                            'enum' => ['internal', 'external', 'any'],
                            'description' => 'Sursa: inventar intern al agențiilor, anunțuri externe, sau ambele (implicit any).',
                        ],
                        'sort' => [
                            'type' => 'string',
                            'enum' => ['relevance', 'price_asc', 'price_desc', 'date_desc'],
                            'description' => 'Ordinea rezultatelor (implicit relevance).',
                        ],
                        'page' => ['type' => 'integer', 'minimum' => 1, 'description' => 'Pagina de rezultate (implicit 1).'],
                    ],
                    'required' => [],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => self::GET_LISTING_DETAILS,
                'description' => 'Întoarce detaliile publice extinse ale unui anunț găsit anterior cu search_listings '
                    . '(descriere, etaj, an construcție, stare, dotări). Folosește exact `id`-ul și `source`-ul '
                    . 'din rezultatul căutării. Nu inventa obiecte; folosește doar ce întorc rezultatele.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'listing_id' => [
                            'type' => 'string',
                            'description' => 'Id-ul anunțului, exact cum apare în rezultatul search_listings.',
                        ],
                        'source' => [
                            'type' => 'string',
                            'enum' => ['internal', 'external'],
                            'description' => 'Sursa anunțului, exact cum apare în rezultatul search_listings.',
                        ],
                    ],
                    'required' => ['listing_id', 'source'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => self::SEARCH_AGENCIES,
                'description' => 'Caută în directorul public de agenții imobiliare (nume, oraș, specializări și '
                    . 'numărul de anunțuri publice active). Nu inventa agenții; folosește doar ce întorc rezultatele.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Text căutat în numele agenției.'],
                        'city' => ['type' => 'string', 'description' => 'Filtrează după orașul principal al agenției.'],
                        'specialization' => [
                            'type' => 'string',
                            'enum' => ['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'garage'],
                            'description' => 'Filtrează după tipul de imobil în care agenția activează.',
                        ],
                    ],
                    'required' => [],
                    'additionalProperties' => false,
                ],
            ],
        ];
    }

    /** @return array<string,mixed>|null one definition by name */
    public static function get(string $name): ?array
    {
        foreach (self::definitions() as $def) {
            if ($def['name'] === $name) {
                return $def;
            }
        }

        return null;
    }

    /** @return array<string,mixed> input_schema for a tool (empty schema when unknown) */
    public static function schema(string $name): array
    {
        return self::get($name)['input_schema'] ?? ['type' => 'object', 'properties' => [], 'required' => []];
    }

    /** @return list<string> */
    public static function names(): array
    {
        return array_column(self::definitions(), 'name');
    }
}
