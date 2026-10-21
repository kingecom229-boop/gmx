import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Button, EmptyState, ErrorState, Modal, Pagination, Skeleton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { relativeTime } from '@/lib/format';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: number | string;
  icon: IconName;
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'warning';
  hint?: string;
}): JSX.Element {
  const tones = {
    neutral: 'text-ink-600 bg-ink-100',
    brand: 'text-brand-700 bg-brand-50',
    accent: 'text-accent-700 bg-accent-50',
    danger: 'text-red-700 bg-red-50',
    warning: 'text-amber-700 bg-amber-50',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-600">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  rowHref,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  rowHref?: (row: T) => string | null;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  if (error) return <ErrorState description={error} onRetry={onRetry} />;

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="divide-y divide-ink-100">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="px-5 py-4">
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-600 ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => {
              const href = rowHref?.(row) ?? null;
              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${href || onRowClick ? 'cursor-pointer hover:bg-ink-50' : ''}`}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row)
                      : href
                        ? () => {
                            window.location.assign(href);
                          }
                        : undefined
                  }
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-5 py-3.5 align-top text-sm ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminListPage<T extends { id: string }>({
  resource,
  title,
  description,
  columns,
  searchable = true,
  searchPlaceholder = 'Rechercher…',
  onCreate,
  onEdit,
  onDelete,
  perPage = 20,
  toolbar,
  createLabel = 'Nouveau',
}: {
  resource: string;
  title: string;
  description?: string;
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onCreate?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  perPage?: number;
  toolbar?: ReactNode;
  createLabel?: string;
}): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (debounced) params.set('q', debounced);

    api.admin
      .list(resource, params)
      .then((response) => {
        if (cancelled) return;
        setRows(response.items as T[]);
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
  }, [resource, page, perPage, debounced, nonce]);

  const reload = () => setNonce((value) => value + 1);

  const remove = async (row: T): Promise<void> => {
    const confirmed = window.confirm('Supprimer définitivement cet élément ? Cette action est irréversible.');
    if (!confirmed) return;
    try {
      await api.admin.remove(resource, row.id);
      toast.success('Élément supprimé');
      reload();
    } catch (caught) {
      toast.error('Suppression impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const actionColumns: Column<T>[] =
    onEdit || onDelete
      ? [
          ...columns,
          {
            key: '_actions',
            header: '',
            className: 'text-right',
            render: (row) => (
              <div className="flex justify-end gap-1">
                {onEdit ? (
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => onEdit(row)}>
                    <span className="sr-only">Modifier</span>
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => void remove(row)}>
                    <span className="sr-only">Supprimer</span>
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]
      : columns;

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {toolbar}
            {onCreate ? (
              <Button icon="plus" onClick={onCreate}>
                {createLabel}
              </Button>
            ) : null}
          </>
        }
      />

      {searchable ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <label htmlFor={`${resource}-search`} className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              id={`${resource}-search`}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              maxLength={120}
              className="h-10 w-full rounded-xl border border-ink-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
            />
          </div>
          <Button variant="outline" icon="refresh" onClick={reload}>
            Actualiser
          </Button>
          <p className="ml-auto text-sm text-ink-500" aria-live="polite">
            {loading ? '…' : `${total} élément${total > 1 ? 's' : ''}`}
          </p>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={actionColumns}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="Aucun élément"
        emptyDescription="Créez un premier élément ou modifiez votre recherche."
      />

      <Pagination page={page} total={total} perPage={perPage} onChange={setPage} />
    </>
  );
}

/** Formulaire générique piloté par une définition de champs. */
export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'url';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  rows?: number;
  span?: 1 | 2;
}

export function FormModal({
  open,
  title,
  fields,
  initial,
  onClose,
  onSubmit,
  submitLabel = 'Enregistrer',
  size = 'md',
  extra,
}: {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  extra?: ReactNode;
}): JSX.Element | null {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (): Promise<void> => {
    setError(null);
    const missing = fields.filter(
      (field) => field.required && (values[field.key] === '' || values[field.key] === null || values[field.key] === undefined),
    );
    if (missing.length > 0) {
      setError(`Champ obligatoire : ${missing.map((field) => field.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} loading={saving} icon="check">
            {submitLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
            <label htmlFor={`f-${field.key}`} className="mb-1.5 block text-sm font-semibold text-ink-800">
              {field.label}
              {field.required ? <span className="ml-1 text-accent-700">*</span> : null}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={`f-${field.key}`}
                rows={field.rows ?? 4}
                value={String(values[field.key] ?? '')}
                placeholder={field.placeholder}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                className="w-full rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            ) : field.type === 'select' ? (
              <select
                id={`f-${field.key}`}
                value={String(values[field.key] ?? '')}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                className="h-11 w-full rounded-xl border border-ink-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              >
                <option value="">{field.placeholder ?? '—'}</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3">
                <input
                  id={`f-${field.key}`}
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))}
                  className="h-5 w-5 rounded accent-brand-700"
                />
                <span className="text-sm text-ink-700">{field.hint ?? 'Activé'}</span>
              </label>
            ) : (
              <input
                id={`f-${field.key}`}
                type={field.type ?? 'text'}
                value={String(values[field.key] ?? '')}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-ink-300 px-3.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            )}

            {field.hint && field.type !== 'checkbox' ? (
              <p className="mt-1.5 text-xs text-ink-500">{field.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      {extra ? <div className="mt-6">{extra}</div> : null}
    </Modal>
  );
}

export function Timestamp({ value }: { value: string | null | undefined }): JSX.Element {
  return <span title={value ?? ''}>{relativeTime(value)}</span>;
}

/* ------------------------------------------------------------------------- */
/* Composition : liste + modale de création / modification                    */
/* ------------------------------------------------------------------------- */

/**
 * Page d'administration générique : tableau paginé + modale de formulaire.
 * Utilisée pour les ressources simples (pages, FAQ, navigation…).
 */
export function CrudModalFields<T extends { id: string }>({
  resource,
  title,
  description,
  createLabel,
  searchPlaceholder,
  fields,
  emptyValues,
  columns,
  transform,
  toolbar,
}: {
  resource: string;
  title: string;
  description?: string;
  createLabel: string;
  searchPlaceholder?: string;
  fields: FieldDef[];
  emptyValues: Record<string, unknown>;
  columns: Column<T>[];
  transform?: (values: Record<string, unknown>) => Record<string, unknown>;
  toolbar?: ReactNode;
}): JSX.Element {
  const toast = useToast();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  return (
    <>
      <AdminListPage<T>
        key={`${resource}-${revision}`}
        resource={resource}
        title={title}
        description={description}
        columns={columns}
        createLabel={createLabel}
        searchPlaceholder={searchPlaceholder}
        toolbar={toolbar}
        onCreate={() => {
          setEditingId(null);
          setEditing({ ...emptyValues });
          setOpen(true);
        }}
        onEdit={(row) => {
          setEditingId(row.id);
          setEditing({ ...(row as unknown as Record<string, unknown>) });
          setOpen(true);
        }}
        onDelete={() => undefined}
      />

      {open ? (
        <FormModal
          open={open}
          title={editingId ? `Modifier — ${title}` : createLabel}
          fields={fields}
          initial={editing ?? emptyValues}
          size="lg"
          onClose={() => setOpen(false)}
          onSubmit={async (values) => {
            const payload = transform ? transform(values) : values;
            if (editingId) {
              await api.admin.update(resource, editingId, payload);
              toast.success('Modifications enregistrées');
            } else {
              await api.admin.create(resource, payload);
              toast.success('Élément créé');
            }
            setRevision((value) => value + 1);
          }}
        />
      ) : null}
    </>
  );
}
