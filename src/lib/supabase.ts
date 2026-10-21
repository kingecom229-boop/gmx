import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase du navigateur.
 *
 * La clé utilisée est la clé PUBLIQUE (publishable / anon) : elle est conçue
 * pour être embarquée dans le bundle, à condition que la RLS soit activée —
 * ce qui est le cas sur toutes les tables du projet.
 *
 * Aucune clé secrète (`sb_secret_...` ou `service_role`) ne doit jamais
 * apparaître ici ni dans aucune variable préfixée VITE_.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!clientInstance) {
    clientInstance = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gmx-auth',
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabase();
