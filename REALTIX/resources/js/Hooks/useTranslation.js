import { usePage } from '@inertiajs/react';

export function useTranslation() {
    const { translations } = usePage().props;
    const app = translations?.app ?? {};

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = app;
        for (const k of keys) {
            value = value?.[k];
        }
        if (!value || typeof value !== 'string') return key;
        return Object.entries(params).reduce(
            (str, [k, v]) => str.replace(`:${k}`, String(v)),
            value
        );
    };

    const ta = (key) => {
        const keys = key.split('.');
        let value = app;
        for (const k of keys) {
            value = value?.[k];
        }
        return Array.isArray(value) ? value : [];
    };

    return { t, ta };
}
