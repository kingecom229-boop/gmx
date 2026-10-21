// Environnement de test : pas de variable réelle, pas d'appel réseau.
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
