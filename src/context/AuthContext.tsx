import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setApiToken } from '@/lib/api';

/**
 * Session d'administration.
 *
 * Le jeton est transmis à l'API pour chaque opération sensible : c'est la
 * base de données (RLS) qui vérifie le privilège, jamais le navigateur.
 * Un rôle présent uniquement dans le profil utilisateur n'ouvre aucun droit.
 */

export type AdminRole = 'admin' | 'commercial' | 'client' | null;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AdminRole;
  loading: boolean;
  /** Supabase n'est pas configuré : l'administration est inaccessible. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setApiToken(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setApiToken(data.session?.access_token ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setApiToken(nextSession?.access_token ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const role = useMemo<AdminRole>(() => {
    const meta = (user?.app_metadata?.role as string | undefined) ?? null;
    return meta === 'admin' || meta === 'commercial' ? meta : meta === 'client' ? 'client' : null;
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas configuré (.env)." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      // Message volontairement générique : ne pas révéler si le compte existe.
      return { ok: false, message: 'Identifiants incorrects ou compte désactivé.' };
    }
    setApiToken(data.session?.access_token ?? null);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setApiToken(null);
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, role, loading, configured: Boolean(supabase), signIn, signOut }),
    [user, session, role, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}
