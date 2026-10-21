import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@shared/types';
import { api } from '@/lib/api';

interface SettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** true si les paramètres n'ont pas pu être lus : valeurs par défaut affichées. */
  offline: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Fusionne la configuration stockée dans `site_settings` avec les valeurs par défaut. */
function mergeSettings(stored: Record<string, unknown>): SiteSettings {
  const merged = { ...DEFAULT_SITE_SETTINGS } as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(stored)) {
    if (value === null || value === undefined) continue;
    if (key in merged) merged[key] = value;
  }
  return merged as unknown as SiteSettings;
}

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .settings()
      .then((response) => {
        if (cancelled) return;
        setSettings(mergeSettings(response.settings ?? {}));
        setOffline(false);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setOffline(true);
        setError('Paramètres du site indisponibles — affichage des valeurs par défaut.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, error, offline, refresh: () => setNonce((n) => n + 1) }),
    [settings, loading, error, offline],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings doit être utilisé dans un SettingsProvider');
  return context;
}
