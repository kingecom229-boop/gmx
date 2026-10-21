import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer, NoPaymentNotice } from './Footer';
import { QuoteDrawer } from '../quote/QuoteDrawer';
import { Alert } from '../ui';
import { useSettings } from '@/context/SettingsContext';

/** Remonte en haut de page à chaque navigation. */
function ScrollToTop(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

/**
 * Bandeau de transparence affiché uniquement lorsque le catalogue contient des
 * données de démonstration (`is_demo`). Ne masque jamais une limite réelle.
 */
function DemoNotice(): JSX.Element | null {
  const { offline, error } = useSettings();
  if (!offline) return null;
  return (
    <div className="container-site pt-4">
      <Alert tone="warning" title="Backend Supabase injoignable">
        {error ?? 'Vérifiez votre connexion et le fichier .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'}
      </Alert>
    </div>
  );
}

export function PublicLayout(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="skip-link">
        Aller au contenu principal
      </a>
      <ScrollToTop />
      <Header />
      <DemoNotice />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <NoPaymentNotice />
      <Footer />
      <QuoteDrawer />
    </div>
  );
}
