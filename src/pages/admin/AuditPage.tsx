import { Badge } from '@/components/ui';
import { AdminListPage, PageHeader, type Column } from './_shared';
import { formatDateTime } from '@/lib/format';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  quote_update: 'Mise à jour de devis',
  role_change: 'Changement de rôle',
  account_created: 'Création de compte',
  account_enabled: 'Compte activé',
  account_disabled: 'Compte désactivé',
  site_settings_update: 'Paramètres du site modifiés',
  products_insert: 'Produit créé',
  products_update: 'Produit modifié',
  products_delete: 'Produit supprimé',
  categories_insert: 'Catégorie créée',
  categories_update: 'Catégorie modifiée',
  categories_delete: 'Catégorie supprimée',
  brands_insert: 'Marque créée',
  brands_update: 'Marque modifiée',
  brands_delete: 'Marque supprimée',
  promotions_insert: 'Opération créée',
  promotions_update: 'Opération modifiée',
  promotions_delete: 'Opération supprimée',
  promotion_products_update: 'Produits d’une opération modifiés',
  pages_insert: 'Page créée',
  pages_update: 'Page modifiée',
  pages_delete: 'Page supprimée',
  faqs_insert: 'FAQ créée',
  faqs_update: 'FAQ modifiée',
  faqs_delete: 'FAQ supprimée',
};

export function AuditPage(): JSX.Element {
  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{ACTION_LABELS[row.action] ?? row.action}</p>
          {row.entity ? <p className="font-mono text-[11px] text-ink-500">{row.entity}</p> : null}
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Cible',
      render: (row) => (
        <span className="font-mono text-xs text-ink-600">{row.entity_id ? row.entity_id.slice(0, 8) : '—'}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Auteur',
      render: (row) => (
        <span className="font-mono text-xs text-ink-600">{row.actor_id ? row.actor_id.slice(0, 8) : 'système'}</span>
      ),
    },
    {
      key: 'details',
      header: 'Détails',
      render: (row) => (
        <span className="text-xs text-ink-600">
          {Object.keys(row.payload ?? {}).length > 0 ? JSON.stringify(row.payload).slice(0, 120) : '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <Badge tone="neutral">{formatDateTime(row.created_at)}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Trace des opérations administratives sensibles. Aucune donnée de devis ni mot de passe n'y est enregistré."
      />
      <AdminListPage<AuditLog>
        resource="audit-logs"
        title=""
        columns={columns}
        searchable={false}
        perPage={30}
      />
    </>
  );
}
