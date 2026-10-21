import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Pagination } from '@/components/ui';
import { PageHeader, Timestamp } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { QUOTE_STATUS_LABELS, type QuoteRequest, type QuoteStatus } from '@shared/types';

const PER_PAGE = 20;

export function QuotesListPage(): JSX.Element {
  const [rows, setRows] = useState<QuoteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (debounced) params.set('q', debounced);
    if (status) params.set('status', status);

    api.admin
      .list('quotes', params)
      .then((response) => {
        if (cancelled) return;
        setRows(response.items as QuoteRequest[]);
        setTotal(response.total);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debounced, status]);

  const exportCsv = async (): Promise<void> => {
    setExporting(true);
    try {
      await api.adminDownload('/admin/quotes/export/csv', `devis-gmx-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Export généré');
    } catch {
      toast.error("L'export a échoué");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Demandes de devis"
        description="Toutes les demandes reçues depuis le site, avec leur statut commercial et l'état de la notification."
        actions={
          <Button variant="outline" icon="download" loading={exporting} onClick={() => void exportCsv()}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <label htmlFor="quote-search" className="sr-only">
            Rechercher une demande
          </label>
          <input
            id="quote-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Référence, e-mail, nom…"
            maxLength={120}
            className="h-10 w-full rounded-xl border border-ink-300 bg-white pl-3.5 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>

        <label htmlFor="quote-status" className="sr-only">
          Filtrer par statut
        </label>
        <select
          id="quote-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-ink-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <p className="ml-auto text-sm text-ink-500" aria-live="polite">
          {loading ? '…' : `${total} demande${total > 1 ? 's' : ''}`}
        </p>
      </div>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div>
      ) : loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton mx-5 my-4 h-4 w-2/3" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="text-lg font-semibold text-ink-900">Aucune demande</p>
          <p className="mt-1.5 text-sm text-ink-600">
            Les demandes envoyées depuis le site apparaissent ici dès leur enregistrement.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50">
                  {['Référence', 'Prospect', 'Localisation', 'Reçue', 'Statut', 'Notification', ''].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-600"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((quote) => (
                  <tr key={quote.id} className="transition-colors hover:bg-ink-50">
                    <td className="px-5 py-3.5">
                      <Link to={`/admin/devis/${quote.id}`} className="font-mono text-xs font-bold text-brand-800">
                        {quote.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/admin/devis/${quote.id}`} className="block no-underline">
                        <span className="font-semibold text-ink-900">
                          {quote.first_name} {quote.last_name}
                        </span>
                        {quote.company ? <span className="block text-xs text-ink-500">{quote.company}</span> : null}
                        <span className="block text-xs text-ink-500">{quote.email}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-600">
                      {quote.postal_code} {quote.city}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-600">
                      <Timestamp value={quote.created_at} />
                    </td>
                    <td className="px-5 py-3.5">
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
                      >
                        {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        tone={
                          quote.notification_status === 'envoye'
                            ? 'success'
                            : quote.notification_status === 'echec'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {quote.notification_status === 'envoye'
                          ? 'Envoyée'
                          : quote.notification_status === 'echec'
                            ? 'Échec'
                            : 'En attente'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/admin/devis/${quote.id}`}
                        className="text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
    </>
  );
}
