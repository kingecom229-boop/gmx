// Environnement de test : pas de variable réelle, pas d'appel réseau.
// Les assertions DOM (toHaveAttribute, toBeInTheDocument…) viennent de jest-dom.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
