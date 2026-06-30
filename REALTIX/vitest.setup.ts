import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Demontează componentele randate după fiecare test (altfel render-urile se
// acumulează în DOM și getBy* găsește „multiple elements").
afterEach(() => {
  cleanup();
});
