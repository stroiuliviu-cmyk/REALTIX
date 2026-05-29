import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, setTheme: () => {} });

/**
 * App-wide light/dark theme provider.
 *
 * - Initialises from localStorage `rt-theme` (read in app.blade.php's inline
 *   <script> too, so the <html class="dark"> is set BEFORE React hydrates —
 *   avoids a white flash on dark-mode users).
 * - Syncs the `dark` class on documentElement + persists to localStorage on
 *   every change.
 * - Exposes { theme: 'light' | 'dark', toggleTheme, setTheme }.
 *
 * Wrap the Inertia <App> with this in app.jsx; consume via useTheme().
 */
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        if (typeof document === 'undefined') return 'light';
        // The no-flash script in app.blade.php may have already added the class
        // based on localStorage; mirror that so React + DOM agree on first render.
        if (document.documentElement.classList.contains('dark')) return 'dark';
        try {
            return localStorage.getItem('rt-theme') === 'dark' ? 'dark' : 'light';
        } catch (_) {
            return 'light';
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        try {
            localStorage.setItem('rt-theme', theme);
        } catch (_) {
            // localStorage disabled (private mode); fail silently — DOM class is still set.
        }
    }, [theme]);

    const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeState }}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Hook: returns { theme, toggleTheme, setTheme }. */
export function useTheme() {
    return useContext(ThemeContext);
}
