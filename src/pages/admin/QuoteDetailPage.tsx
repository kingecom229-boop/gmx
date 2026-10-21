import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Alert, Badge, Breadcrumbs, Button, EmptyState, Select, Spinner } from '@/components/ui';
import { PageHeader } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTime, formatPrice } from '@/lib/format';
import { QUOTE_STATUS_LABELS, type QuoteEvent, type QuoteItem, type QuoteRequest, type QuoteStatus } from '@shared/types';

interface QuoteDetail extends QuoteRequest {
  quote_items?: QuoteItem[];
  quote_events?: QuoteEvent[];
  assigned_profile?: { id: string; full_name: string | null; email: string } | null;
}

const STATUS_TONES: Record<QuoteStatus, 'accent' | 'info' | 'success' | 'neutral'> = {
  nouveau: 'accent',
  en_cours: 'info',
  devis_prepare: 'info',
  envoye: 'info',
  accepte: 'success',
  refuse: 'neutral',
  cloture: 'neutral',
};

export function QuoteDetailPage(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifying, setNotifying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.admin
      .quoteDetail(id)
      .then((response) => {
        const detail = response.quote as QuoteDetail;
        setQuote(detail);
        setNotes(detail.internal_notes ?? '');
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} className="text-brand-600" />
      </div>
    );
  }

  if (error || !quote) {
    return <EmptyState title="Demande introuvable" description={error ?? ''} action={<Link to="/admin/devis">Retour à la liste</Link>} />;
  }

  const items = quote.quote_items ?? [];
  const events = [...(quote.quote_events ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const totalIndicative = items.reduce(
    (sum, item) => sum + (item.price_on_quote || item.unit_price_indicative === null ? 0 : (item.unit_price_indicative ?? 0) * item.quantity),
    0,
  );
  const allOnQuote = items.every((item) => item.price_on_quote || item.unit_price_indicative === null);

  const changeStatus = async (status: string): Promise<void> => {
    setSaving(true);
    try {
      const response = await api.admin.quoteUpdate(id, { status });
      setQuote(response.quote as QuoteDetail);
      toast.success('Statut mis à jour');
      load();
    } catch (caught) {
      toast.error('Mise à jour impossible', caught instanceof ApiError ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.admin.quoteUpdate(id, { internal_notes: notes });
      toast.success('Note enregistrée');
      load();
    } catch (caught) {
      toast.error('Enregistrement impossible', caught instanceof ApiError ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const resend = async (): Promise<void> => {
    setNotifying(true);
    try {
      const response = await api.admin.quoteNotify(id);
      toast.success(
        'Relance enregistrée',
        response.queued > 0 ? `${response.queued} message(s) remis en file.` : 'Aucun message en file : vérifiez la configuration e-mail.',
      );
      load();
    } catch (caught) {
      toast.error('Relance impossible', caught instanceof ApiError ? caught.message : undefined);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Administration', to: '/admin' },
          { label: 'Demandes de devis', to: '/admin/devis' },
          { label: quote.reference ?? id },
        ]}
      />

      <PageHeader
        title={`Demande ${quote.reference ?? ''}`}
        description={`Reçue le ${formatDateTime(quote.created_at)} · dernière mise à jour ${formatDateTime(quote.updated_at)}`}
        actions={
          <>
            <Badge tone={STATUS_TONES[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            <Button variant="outline" icon="mail" loading={notifying} onClick={() => void resend()}>
              Renvoyer la notification
            </Button>
          </>
        }
      />

      {quote.notification_status === 'echec' ? (
        <div className="mb-6">
          <Alert tone="warning" title="Notification commerciale non envoyée">
            {quote.notification_error === 'mailer_not_configured'
              ? "Aucun fournisseur d'e-mails n'est configuré sur le serveur. La demande est bien enregistrée : vous pouvez relancer l'envoi après configuration."
              : `Erreur d'envoi : ${quote.notification_error ?? 'inconnue'}. La demande est conservée : utilisez « Renvoyer la notification ».`}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          {/* Prospect */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-ink-200 bg-ink-50 px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-ink-700">
              Prospect
            </h2>
            <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
              <Info label="Nom" value={`${quote.first_name} ${quote.last_name}`} />
              <Info label="Entreprise" value={quote.company ?? '—'} />
              <Info
                label="E-mail"
                value={
                  <a href={`mailto:${quote.email}`} className="font-semibold">
                    {quote.email}
                  </a>
                }
              />
              <Info
                label="Téléphone"
                value={
                  <a href={`tel:${quote.phone.replace(/\s/g, '')}`} className="font-semibold">
                    {quote.phone}
                  </a>
                }
              />
              <Info label="Localisation" value={`${quote.postal_code} ${quote.city}`} />
              <Info label="Projet" value={quote.project_type ?? '—'} />
              <Info label="Contact souhaité" value={quote.contact_preference ?? 'Sans préférence'} />
              <Info label="Source" value={quote.source ?? 'site'} />
            </dl>
            {quote.message ? (
              <div className="border-t border-ink-200 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-600">Message du client</p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
                  {quote.message}
                </p>
              </div>
            ) : null}
          </section>

          {/* Équipements */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-ink-200 bg-ink-50 px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-ink-700">
              Équipements demandés ({items.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-200">
                    <th scope="col" className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-600">
                      Équipement
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-ink-600">
                      Qté
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-ink-600">
                      Prix indicatif
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-900">{item.name}</p>
                        {item.sku ? <p className="font-mono text-[11px] text-ink-500">Réf. {item.sku}</p> : null}
                        {item.note ? (
                          <p className="mt-1 text-xs italic text-ink-600">« {item.note} »</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-sm">
                        {item.price_on_quote || item.unit_price_indicative === null
                          ? 'Sur devis'
                          : formatPrice(item.unit_price_indicative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-ink-200 bg-ink-50 px-5 py-3.5 text-sm">
              {allOnQuote ? (
                <p className="text-ink-600">
                  Tous les équipements de cette demande sont proposés sur devis : aucun montant indicatif à afficher.
                </p>
              ) : (
                <p className="text-ink-600">
                  Total indicatif partiel :{' '}
                  <span className="font-bold text-ink-900">{formatPrice(totalIndicative)}</span> — certains équipements
                  restent sur devis.
                </p>
              )}
            </div>
          </section>

          {/* Notes internes */}
          <section className="card p-5">
            <label htmlFor="internal-notes" className="text-sm font-bold uppercase tracking-[0.08em] text-ink-700">
              Notes internes
            </label>
            <textarea
              id="internal-notes"
              rows={5}
              value={notes}
              maxLength={20000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Échanges, engagements, points à vérifier…"
              className="mt-3 w-full rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
            <div className="mt-3 flex justify-end">
              <Button icon="check" loading={saving} onClick={() => void saveNotes()}>
                Enregistrer la note
              </Button>
            </div>
          </section>

          {/* Historique */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-ink-200 bg-ink-50 px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-ink-700">
              Historique
            </h2>
            {events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-500">Aucune action enregistrée.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                    <Icon name="clock" size={15} className="mt-0.5 shrink-0 text-ink-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold capitalize text-ink-800">{event.action}</p>
                      {event.detail ? <p className="text-xs text-ink-600">{event.detail}</p> : null}
                    </div>
                    <span className="ml-auto shrink-0 text-xs text-ink-500">{formatDateTime(event.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink-700">Statut commercial</h2>
            <label htmlFor="status" className="mt-3 block text-xs font-semibold text-ink-600">
              Changer le statut
            </label>
            <Select
              id="status"
              className="mt-1.5"
              value={quote.status}
              onChange={(event) => void changeStatus(event.target.value)}
              disabled={saving}
              options={Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Le statut est purement commercial. L'acceptation d'un devis ne déclenche aucun paiement : ce site ne
              procède à aucun encaissement.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink-700">Notification</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Équipe commerciale</dt>
                <dd>
                  <Badge
                    tone={
                      quote.notification_status === 'envoye'
                        ? 'success'
                        : quote.notification_status === 'echec'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {quote.notification_status}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Accusé client</dt>
                <dd>
                  <Badge
                    tone={
                      quote.ack_status === 'envoye'
                        ? 'success'
                        : quote.ack_status === 'echec'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {quote.ack_status}
                  </Badge>
                </dd>
              </div>
              {quote.notification_sent_at ? (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">Envoyée le</dt>
                  <dd className="text-xs text-ink-700">{formatDateTime(quote.notification_sent_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink-700">Attribution</h2>
            <p className="mt-2 text-sm text-ink-600">
              {quote.assigned_profile
                ? `${quote.assigned_profile.full_name || quote.assigned_profile.email}`
                : 'Aucun commercial attribué.'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              L'attribution s'effectue depuis la gestion des utilisateurs, une fois les comptes commerciaux créés.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm text-ink-800">{value}</dd>
    </div>
  );
}
