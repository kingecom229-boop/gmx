import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';

/**
 * Traduit une panne en message actionnable.
 *
 * « La requête n'a pas abouti » n'aide personne : il faut distinguer trois
 * causes très différentes, qui n'appellent pas le même geste.
 */
function messageFor(caught: unknown): string {
  if (caught instanceof ApiError) {
    if (caught.status >= 500) {
      return (
        "Le serveur répond mais n'arrive pas à joindre la base de données. " +
        'Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le fichier .env, ' +
        'puis relancez npm run dev.'
      );
    }
    return caught.message;
  }
  // Échec réseau : aucune réponse HTTP. L'API Express n'écoute pas.
  return (
    "Impossible de joindre le serveur de l'application. Vérifiez que « npm run dev » " +
    'tourne toujours dans le terminal et que le port 8787 est libre, puis cliquez sur Réessayer.'
  );
}

/**
 * Petit hook de requête : évite d'ajouter une dépendance de data-fetching
 * tout en gérant chargement, erreur, annulation et rechargement.
 */

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setError(messageFor(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, reload };
}

/** Débounce une valeur (recherche, filtres). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Ferme un panneau au clic extérieur et à la touche Échap. */
export function useDismiss(onDismiss: () => void, active = true): (node: HTMLElement | null) => void {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss, active]);

  return useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
}
