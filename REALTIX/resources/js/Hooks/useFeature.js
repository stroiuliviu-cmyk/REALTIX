import { usePage } from '@inertiajs/react';

const FEATURE_MIN_PLAN = {
    ai_tools:      'medium',
    scraper:       'medium',
    pdf_contracts: 'medium',
    autoposting:   'medium',
    team:          'medium',
    analytics:     'pro',
    export:        'pro',
    white_label:   'pro',
    api:           'pro',
};

const FEATURE_LABELS = {
    ai_tools:      'Instrumente AI',
    scraper:       'Web Offers (scraping piață)',
    pdf_contracts: 'Contracte PDF',
    autoposting:   'Autopostare 999.md / FB',
    team:          'Echipă (multi-agent)',
    analytics:     'Statistici avansate',
    export:        'Export PDF / Excel',
    white_label:   'White-label',
    api:           'API public',
};

export function useFeature(feature) {
    const agency = usePage().props.auth?.user?.agency;
    const features = agency?.features ?? [];
    return {
        allowed: features.includes(feature),
        plan: agency?.subscription_plan,
        minPlan: FEATURE_MIN_PLAN[feature],
        label: FEATURE_LABELS[feature] ?? feature,
    };
}
