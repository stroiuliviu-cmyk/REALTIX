import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone test config (does NOT load vite.config.js, so the Laravel
// plugin is not pulled into the test run).
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['./vitest.setup.ts'],
        include: ['resources/js/Features/Assistant/**/*.test.{ts,tsx}'],
    },
});
