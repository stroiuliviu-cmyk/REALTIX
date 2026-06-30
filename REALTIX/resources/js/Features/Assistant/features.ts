// resources/js/Features/Assistant/features.ts
//
// Flag-uri de funcționalitate. Voce + atașare imagine sunt prezente în UI dar
// dezactivate pentru MVP — se reactivează schimbând valoarea în `true`.

export const FEATURES = {
  voice: false,
  imageAttach: false,
} as const;

export type FeatureFlags = typeof FEATURES;
