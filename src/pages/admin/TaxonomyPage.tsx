import { useState } from 'react';
import { Badge } from '@/components/ui';
import { AdminListPage, FormModal, PageHeader, type Column, type FieldDef } from './_shared';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { slugify } from '@/lib/format';
import type { Brand, Category } from '@shared/types';

type Tab = 'categories' | 'brands';

export function TaxonomyPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <>
      <PageHeader
        title="Catégories & marques"
        description="Structurez le catalogue : les catégories apparaissent dans la navigation, le pied de page et les pages de référencement."
      />

      <div className="mb-6 inline-flex rounded-xl border border-ink-200 bg-white p-1" role="tablist" aria-label="Section">
        {(
          [
            { value: 'categories', label: 'Catégories' },
            { value: 'brands', label: 'Marques' },
          ] as { value: Tab; label: string }[]
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === item.value ? 'bg-brand-800 text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'categories' ? <CategoriesPanel /> : <BrandsPanel />}
    </>
  );
}

/** Modale de création / modification branchée sur l'API générique. */
function CrudModal({
  open,
  title,
  fields,
  initial,
  onClose,
  onDone,
  resource,
  editingId,
}: {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  onClose: () => void;
  onDone: () => void;
  resource: string;
  editingId: string | null;
}): JSX.Element | null {
  const toast = useToast();

  return (
    <FormModal
      open={open}
      title={title}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSubmit={async (values) => {
        const payload = { ...values, slug: slugify(String(values.slug ?? values.name ?? '')) };
        if (editingId) {
          await api.admin.update(resource, editingId, payload);
          toast.success('Modifications enregistrées');
        } else {
          await api.admin.create(resource, payload);
          toast.success('Élément créé');
        }
        onDone();
      }}
    />
  );
}

function CategoriesPanel(): JSX.Element {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Catégorie',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.name}</p>
          <p className="font-mono text-[11px] text-ink-500">/{row.slug}</p>
          {row.description ? <p className="mt-1 line-clamp-1 text-xs text-ink-500">{row.description}</p> : null}
        </div>
      ),
    },
    { key: 'order', header: 'Ordre', render: (row) => <span>{row.sort_order}</span> },
    {
      key: 'state',
      header: 'État',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Active' : 'Masquée'}</Badge>
          {row.show_on_home ? <Badge tone="brand">Accueil</Badge> : null}
        </div>
      ),
    },
  ];

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nom', required: true, span: 2 },
    { key: 'slug', label: 'URL (slug)', hint: 'Laisser vide pour le générer depuis le nom.' },
    { key: 'sort_order', label: 'Ordre d’affichage', type: 'number' },
    { key: 'image_url', label: "URL de l'image", type: 'url', span: 2, placeholder: '/images/cat-tracteurs.jpg' },
    { key: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
    { key: 'is_active', label: 'Active', type: 'checkbox', hint: 'Visible sur le site' },
    { key: 'show_on_home', label: 'Page d’accueil', type: 'checkbox', hint: 'Afficher dans les univers' },
    { key: 'seo_title', label: 'Titre SEO', span: 2 },
    { key: 'seo_description', label: 'Méta-description SEO', type: 'textarea', span: 2, rows: 2 },
  ];

  return (
    <>
      <AdminListPage<Category>
        key={`categories-${revision}`}
        resource="categories"
        title="Catégories"
        columns={columns}
        searchPlaceholder="Rechercher une catégorie…"
        createLabel="Nouvelle catégorie"
        onCreate={() => {
          setEditingId(null);
          setEditing({
            name: '',
            slug: '',
            description: '',
            image_url: '',
            sort_order: 0,
            is_active: true,
            show_on_home: false,
            seo_title: '',
            seo_description: '',
          });
          setOpen(true);
        }}
        onEdit={(row) => {
          setEditingId(row.id);
          setEditing({ ...row });
          setOpen(true);
        }}
        onDelete={() => undefined}
      />

      {open ? (
        <CrudModal
          open={open}
          title={editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          fields={fields}
          initial={editing ?? {}}
          onClose={() => setOpen(false)}
          onDone={() => setRevision((value) => value + 1)}
          resource="categories"
          editingId={editingId}
        />
      ) : null}
    </>
  );
}

function BrandsPanel(): JSX.Element {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      header: 'Marque',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.name}</p>
          <p className="font-mono text-[11px] text-ink-500">/{row.slug}</p>
        </div>
      ),
    },
    { key: 'order', header: 'Ordre', render: (row) => <span>{row.sort_order}</span> },
    {
      key: 'state',
      header: 'État',
      render: (row) => <Badge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Active' : 'Masquée'}</Badge>,
    },
  ];

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nom de la marque', required: true, span: 2 },
    { key: 'slug', label: 'URL (slug)', hint: 'Laisser vide pour le générer depuis le nom.' },
    { key: 'sort_order', label: 'Ordre', type: 'number' },
    { key: 'logo_url', label: 'URL du logo', type: 'url', span: 2 },
    { key: 'is_active', label: 'Active', type: 'checkbox', hint: 'Visible sur le site' },
  ];

  return (
    <>
      <AdminListPage<Brand>
        key={`brands-${revision}`}
        resource="brands"
        title="Marques"
        columns={columns}
        searchPlaceholder="Rechercher une marque…"
        createLabel="Nouvelle marque"
        onCreate={() => {
          setEditingId(null);
          setEditing({ name: '', slug: '', logo_url: '', sort_order: 0, is_active: true });
          setOpen(true);
        }}
        onEdit={(row) => {
          setEditingId(row.id);
          setEditing({ ...row });
          setOpen(true);
        }}
        onDelete={() => undefined}
      />

      {open ? (
        <CrudModal
          open={open}
          title={editingId ? 'Modifier la marque' : 'Nouvelle marque'}
          fields={fields}
          initial={editing ?? {}}
          onClose={() => setOpen(false)}
          onDone={() => setRevision((value) => value + 1)}
          resource="brands"
          editingId={editingId}
        />
      ) : null}
    </>
  );
}
