import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, hasSecretKey } from './config.js';

/**
 * Fabriques de clients Supabase.
 *
 * - `serviceClient()` : utilise la clé SECRÈTE lorsqu'elle est fournie.
 *   Réservé aux écritures serveur (devis, file d'envoi). Ne JAMAIS renvoyer
 *   cette instance ni sa clé au navigateur.
 * - `publicClient()` : clé publishable. RLS pleinement appliquée.
 * - `userClient(jwt)` : clé publishable + jeton de l'utilisateur connecté.
 *   Toute opération d'administration passe par ici, ce qui laisse la RLS
 *   vérifier le privilège administrateur côté base de données.
 */

let serviceInstance: SupabaseClient | null = null;
let publicInstance: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (!serviceInstance) {
    serviceInstance = createClient(config.supabaseUrl, config.supabaseSecretKey || config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceInstance;
}

export function publicClient(): SupabaseClient {
  if (!publicInstance) {
    publicInstance = createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicInstance;
}

export function userClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function usesSecretKey(): boolean {
  return hasSecretKey;
}

/* ------------------------------------------------------------------------- */
/* Client à typage lâche pour les sélections PostgREST dynamiques             */
/* ------------------------------------------------------------------------- */

/**
 * Les chaînes `select()` construites dynamiquement (jointures nommées,
 * relations multiples) ne peuvent pas être inférées par supabase-js : elles
 * produisent des types `GenericStringError` inexploitables.
 *
 * La couche d'accès aux données est une frontière : on traverse cette frontière
 * avec un typage lâche, puis on caste vers les types partagés (`shared/types`),
 * qui restent la référence pour tout le reste de l'application.
 */
export interface LooseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  auth: SupabaseClient['auth'];
  storage: SupabaseClient['storage'];
}

export function loose(client: SupabaseClient): LooseClient {
  return client as unknown as LooseClient;
}
