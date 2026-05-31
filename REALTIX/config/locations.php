<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 999.md region catalog path
    |--------------------------------------------------------------------------
    |
    | Used by App\Services\RegionResolver to map a (city, district) tuple back
    | to its 999.md region. The resolver tries the explicit env override first,
    | then the production shared path used by the Python scraper, finally the
    | repo-shipped fallback used in local dev.
    |
    */

    'catalog_path' => env('LOCATIONS_CATALOG_PATH'),

    'catalog_search_paths' => [
        '/home/forge/realtix.eu/shared/scraper_data/catalog_999.json',
        resource_path('data/catalog_999.json'),
    ],

];
