import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { QuotesListPage } from './QuotesListPage';
import { QuoteDetailPage } from './QuoteDetailPage';
import { ProductsPage } from './ProductsPage';
import { TaxonomyPage } from './TaxonomyPage';
import { PromotionsPage } from './PromotionsPage';
import { ContentPage } from './ContentPage';
import { SettingsPage } from './SettingsPage';
import { UsersPage } from './UsersPage';
import { MessagesPage } from './MessagesPage';
import { AuditPage } from './AuditPage';
import { AccountPage } from './AccountPage';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

/**
 * Garde d'accès au back-office.
 *
 * La vérification ici sert uniquement à l'affichage : l'autorisation réelle
 * est appliquée par la base de données (RLS + app_metadata du JWT) à chaque
 * appel API. Modifier ce composant n'ouvre aucun droit.
 */
function RequireAdmin({ children }: { children: JSX.Element }): JSX.Element {
  const { user, role, loading, configured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Spinner size={28} className="text-brand-400" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <div className="max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-8 text-center">
          <h1 className="text-xl text-white">Configuration incomplète</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Les variables <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> et{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> sont absentes.
            Copiez <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">.env.example</code> vers{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">.env</code>, renseignez-les puis relancez{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (role !== 'admin' && role !== 'commercial') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <div className="max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-8 text-center">
          <h1 className="text-xl text-white">Accès refusé</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Ce compte ne dispose pas d'un rôle d'administration. Le rôle est attribué côté serveur lors de la création
            du compte : il ne peut pas être obtenu depuis le site.
          </p>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export function AdminApp(): JSX.Element {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        index
        element={
          <RequireAdmin>
            <DashboardPage />
          </RequireAdmin>
        }
      />
      <Route
        path="devis"
        element={
          <RequireAdmin>
            <QuotesListPage />
          </RequireAdmin>
        }
      />
      <Route
        path="devis/:id"
        element={
          <RequireAdmin>
            <QuoteDetailPage />
          </RequireAdmin>
        }
      />
      <Route
        path="produits"
        element={
          <RequireAdmin>
            <ProductsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="catalogue"
        element={
          <RequireAdmin>
            <TaxonomyPage />
          </RequireAdmin>
        }
      />
      <Route
        path="promotions"
        element={
          <RequireAdmin>
            <PromotionsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="contenu"
        element={
          <RequireAdmin>
            <ContentPage />
          </RequireAdmin>
        }
      />
      <Route
        path="parametres"
        element={
          <RequireAdmin>
            <SettingsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="utilisateurs"
        element={
          <RequireAdmin>
            <UsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="messages"
        element={
          <RequireAdmin>
            <MessagesPage />
          </RequireAdmin>
        }
      />
      <Route
        path="journal"
        element={
          <RequireAdmin>
            <AuditPage />
          </RequireAdmin>
        }
      />
      <Route
        path="compte"
        element={
          <RequireAdmin>
            <AccountPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
