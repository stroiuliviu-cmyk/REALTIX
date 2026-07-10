import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/Components/ui/ThemeProvider';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        // Suportă atât pagini .jsx (existente) cât și .tsx (migrare TS treptată).
        const pages = import.meta.glob('./Pages/**/*.{jsx,tsx}');
        const tsxPath = `./Pages/${name}.tsx`;
        const path = pages[tsxPath] ? tsxPath : `./Pages/${name}.jsx`;
        return resolvePageComponent(path, pages);
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Wrap Inertia <App/> with ThemeProvider so any page can read or
        // toggle the theme via useTheme(). The provider keeps the `dark`
        // class on <html> in sync with localStorage `rt-theme`.
        root.render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
