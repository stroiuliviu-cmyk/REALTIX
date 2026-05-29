import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * Sun/Moon theme toggle button. Sits inline anywhere — typical placement is
 * the top-bar action row next to notifications. Slot it into AppLayout in
 * Etapa 1; for now it's available to drop into any page.
 */
export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const Icon = theme === 'dark' ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Comută tema"
            className={`w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors ${className}`}
        >
            <Icon size={18} />
        </button>
    );
}
