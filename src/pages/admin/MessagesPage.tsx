import { Badge } from '@/components/ui';
import { AdminListPage, PageHeader, Timestamp, type Column } from './_shared';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: 'nouveau' | 'traite' | 'archive';
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  traite: 'Traité',
  archive: 'Archivé',
};

export function MessagesPage(): JSX.Element {
  const columns: Column<ContactMessage>[] = [
    {
      key: 'from',
      header: 'Expéditeur',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.name}</p>
          <a href={`mailto:${row.email}`} className="text-xs text-brand-700 hover:underline">
            {row.email}
          </a>
          {row.phone ? <p className="text-xs text-ink-500">{row.phone}</p> : null}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Message',
      render: (row) => (
        <div>
          {row.subject ? <p className="font-semibold text-ink-800">{row.subject}</p> : null}
          <p className="line-clamp-2 text-xs text-ink-600">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={row.status === 'nouveau' ? 'accent' : row.status === 'traite' ? 'success' : 'neutral'}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Reçu',
      render: (row) => <Timestamp value={row.created_at} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Messages reçus"
        description="Messages envoyés depuis le formulaire de contact du site."
      />
      <AdminListPage<ContactMessage>
        resource="contact-messages"
        title=""
        columns={columns}
        searchPlaceholder="Rechercher par nom, e-mail ou objet…"
      />
      <p className="mt-4 text-xs text-ink-500">
        Les messages sont conservés 3 ans. Les adresses IP ne sont pas enregistrées en clair : seule une empreinte
        hachée est conservée, conformément à la politique de confidentialité.
      </p>
    </>
  );
}
