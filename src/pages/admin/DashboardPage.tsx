import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { PageHeader, StatCard } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { QUOTE_STATUS_LABELS, type DashboardStats, type QuoteRequest } from '@shared/types';
import { relativeTime } from '@/lib/format';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ mail_configured: boolean } | null>(null);

  const load = (): void => {
    setLoading(true);
    setError(null);
    api.admin
      .stats()
      .then((data) => setStats(data as unknown as DashboardStats))
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <>
      <PageHeader
        title={`Bonjour${user?.email ? ` ${user.email.split('@')[0]}` : ''}`}
        description="Vue d'ensemble de l'activité commerciale et du catalogue."
        actions={
          <Link
            to="/admin/devis"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-800 px-4 text-sm font-semibold text-white no-underline hover:bg-brand-700"
          >
            Ouvrir les demandes
          </Link>
        }
      />

      {error ? (
        <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-semibold">Chargement du tableau de bord impossible</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Demandes de devis" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Demandes reçues" value={loading ? '—' : (stats?.quotes_total ?? 0)} icon="inbox" tone="brand" />
            <StatCard
              label="Nouvelles à traiter"
              value={loading ? '—' : (stats?.quotes_new ?? 0)}
              icon="alert"
              tone={stats?.quotes_new ? 'accent' : 'neutral'}
              hint="Statut « nouveau »"
            />
            <StatCard
              label="En cours"
              value={loading ? '—' : (stats?.quotes_in_progress ?? 0)}
              icon="clock"
              hint="En cours, préparé, envoyé"
            />
            <StatCard
              label="Finalisées"
              value={loading ? '—' : (stats?.quotes_closed ?? 0)}
              icon="check"
              tone="brand"
              hint="Acceptées, refusées, clôturées"
            />
          </section>

          <section aria-label="Catalogue" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Produits actifs" value={loading ? '—' : (stats?.products_active ?? 0)} icon="package" />
            <StatCard
              label="Indisponibles"
              value={loading ? '—' : (stats?.products_unavailable ?? 0)}
              icon="alert"
              tone="warning"
            />
            <StatCard label="En promotion" value={loading ? '—' : (stats?.products_promoted ?? 0)} icon="tag" tone="accent" />
            <StatCard label="Archivés" value={loading ? '—' : (stats?.products_archived ?? 0)} icon="file" tone="neutral" />
          </section>

          <section aria-label="Notifications" className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-base">File d'envoi des e-mails</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">En attente</dt>
                  <dd className="font-semibold text-ink-900">{loading ? '—' : (stats?.notifications_pending ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">En échec</dt>
                  <dd className="font-semibold text-ink-900">{loading ? '—' : (stats?.notifications_failed ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">Fournisseur configuré</dt>
                  <dd>
                    <Badge tone={health?.mail_configured ? 'success' : 'warning'}>
                      {health?.mail_configured ? 'Resend actif' : 'Non configuré'}
                    </Badge>
                  </dd>
                </div>
              </dl>
              {!health?.mail_configured ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
                  Aucun fournisseur d'e-mails n'est configuré. Les demandes sont enregistrées et visibles ici, mais
                  aucune notification n'est envoyée automatiquement. Renseignez <code>MAIL_PROVIDER=resend</code> et{' '}
                  <code>RESEND_API_KEY</code> dans <code>.env</code>, puis redémarrez le serveur.
                </p>
              ) : null}
            </div>

            <div className="card p-5">
              <h2 className="text-base">Raccourcis</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { to: '/admin/produits', label: 'Gérer les produits' },
                  { to: '/admin/promotions', label: 'Créer une opération commerciale' },
                  { to: '/admin/parametres', label: 'Modifier les textes du site' },
                  { to: '/admin/contenu', label: 'Pages, FAQ et navigation' },
                  { to: '/admin/utilisateurs', label: 'Comptes et rôles' },
                ].map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="flex items-center justify-between rounded-lg px-2 py-1.5 no-underline hover:bg-ink-50">
                      <span className="font-medium text-ink-700">{item.label}</span>
                      <span className="text-brand-700">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Activité récente" className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-xl">Demandes récentes</h2>
              <Link to="/admin/devis" className="text-sm font-semibold text-brand-700">
                Tout voir
              </Link>
            </div>

            {loading ? (
              <div className="card divide-y divide-ink-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton mx-5 my-4 h-4 w-2/3" />
                ))}
              </div>
            ) : (stats?.recent_quotes?.length ?? 0) === 0 ? (
              <div className="card px-6 py-12 text-center">
                <p className="font-semibold text-ink-800">Aucune demande pour le moment</p>
                <p className="mt-1.5 text-sm text-ink-600">
                  Les demandes envoyées depuis le site apparaîtront ici dès réception.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <ul className="divide-y divide-ink-100">
                  {(stats?.recent_quotes ?? []).map((quote: QuoteRequest) => (
                    <li key={quote.id}>
                      <Link
                        to={`/admin/devis/${quote.id}`}
                        className="flex flex-wrap items-center gap-3 px-5 py-4 no-underline transition-colors hover:bg-ink-50"
                      >
                        <span className="font-mono text-xs font-semibold text-brand-800">{quote.reference}</span>
                        <span className="font-semibold text-ink-900">
                          {quote.first_name} {quote.last_name}
                        </span>
                        {quote.company ? <span className="text-sm text-ink-500">· {quote.company}</span> : null}
                        <span className="text-sm text-ink-500">· {quote.city}</span>
                        <Badge
                          tone={
                            quote.status === 'nouveau'
                              ? 'accent'
                              : quote.status === 'accepte'
                                ? 'success'
                                : quote.status === 'refuse' || quote.status === 'cloture'
                                  ? 'neutral'
                                  : 'info'
                          }
                          className="ml-auto"
                        >
                          {QUOTE_STATUS_LABELS[quote.status]}
                        </Badge>
                        <span className="w-full text-xs text-ink-500 sm:w-auto">{relativeTime(quote.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
