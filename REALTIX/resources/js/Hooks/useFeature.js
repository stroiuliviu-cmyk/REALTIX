import { usePage } from '@inertiajs/react';

export function useFeature(feature) {
    const { auth, plan_config } = usePage().props;
    const agency = auth?.user?.agency;
    const features = agency?.features ?? [];
    const minPlanMap = plan_config?.feature_min_plan ?? {};
    const labelsMap = plan_config?.feature_labels ?? {};

    return {
        allowed: features.includes(feature),
        plan: agency?.subscription_plan,
        minPlan: minPlanMap[feature],
        label: labelsMap[feature] ?? feature,
    };
}
