import { useState } from 'react';
import { Badge } from '@/components/ui';
import { CrudModalFields, PageHeader, type FieldDef } from './_shared';
import type { Faq, NavigationItem, Page } from '@shared/types';

type Tab = 'pages' | 'faqs' | 'navigation';

const TABS: { value: Tab; label: string }[] = [
  { value: 'pages', label: 'Pages éditoriales' },
  { value: 'faqs', label: 'FAQ' },
  { value: 'navigation', label: 'Navigation' },
];

export function ContentPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('pages');

  return (
    <>
      <PageHeader
        title="Contenu & SEO"
        description="Pages éditoriales, questions fréquentes et liens de navigation — modifiables sans toucher au code."
      />

      <div className="mb-6 inline-flex flex-wrap rounded-xl border border-ink-200 bg-white p-1" role="tablist" aria-label="Section">
        {TABS.map((item) => (
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

      {tab === 'pages' ? <PagesPanel /> : null}
      {tab === 'faqs' ? <FaqsPanel /> : null}
      {tab === 'navigation' ? <NavigationPanel /> : null}
    </>
  );
}

const PAGE_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Titre', required: true, span: 2 },
  { key: 'slug', label: 'URL (slug)', required: true, hint: 'Ex. : mentions-legales' },
  {
    key: 'content',
    label: 'Contenu',
    type: 'textarea',
    span: 2,
    rows: 18,
    hint: 'Markdown léger pris en charge : ## Titre, ### Sous-titre, - liste, **gras**, [lien](/url).',
  },
  { key: 'seo_title', label: 'Titre SEO' },
  { key: 'seo_description', label: 'Méta-description SEO' },
  { key: 'is_published', label: 'Publiée', type: 'checkbox', hint: 'Accessible sur le site' },
  { key: 'indexable', label: 'Indexable', type: 'checkbox', hint: 'Autoriser les moteurs de recherche' },
];

function PagesPanel(): JSX.Element {
  return (
    <CrudModalFields
      resource="pages"
      title="Pages éditoriales"
      createLabel="Nouvelle page"
      searchPlaceholder="Rechercher une page…"
      fields={PAGE_FIELDS}
      emptyValues={{
        title: '',
        slug: '',
        content: '',
        seo_title: '',
        seo_description: '',
        is_published: true,
        indexable: true,
      }}
      columns={[
        {
          key: 'title',
          header: 'Page',
          render: (row: Page) => (
            <div>
              <p className="font-semibold text-ink-900">{row.title}</p>
              <p className="font-mono text-[11px] text-ink-500">/{row.slug}</p>
            </div>
          ),
        },
        {
          key: 'state',
          header: 'État',
          render: (row: Page) => (
            <div className="flex flex-wrap gap-1">
              <Badge tone={row.is_published ? 'success' : 'neutral'}>{row.is_published ? 'Publiée' : 'Brouillon'}</Badge>
              <Badge tone={row.indexable ? 'info' : 'neutral'}>{row.indexable ? 'Indexable' : 'noindex'}</Badge>
            </div>
          ),
        },
      ]}
    />
  );
}

const FAQ_FIELDS: FieldDef[] = [
  { key: 'question', label: 'Question', required: true, span: 2 },
  { key: 'answer', label: 'Réponse', type: 'textarea', span: 2, rows: 6, required: true },
  { key: 'category', label: 'Catégorie', placeholder: 'Devis, livraison, garantie…' },
  { key: 'sort_order', label: 'Ordre', type: 'number' },
  { key: 'is_active', label: 'Publiée', type: 'checkbox', hint: 'Affichée sur le site' },
];

function FaqsPanel(): JSX.Element {
  return (
    <CrudModalFields<Faq>
      resource="faqs"
      title="Questions fréquentes"
      createLabel="Nouvelle question"
      searchPlaceholder="Rechercher une question…"
      fields={FAQ_FIELDS}
      emptyValues={{ question: '', answer: '', category: '', sort_order: 0, is_active: true }}
      columns={[
        {
          key: 'question',
          header: 'Question',
          render: (row) => (
            <div>
              <p className="font-semibold text-ink-900">{row.question}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-600">{row.answer}</p>
            </div>
          ),
        },
        { key: 'category', header: 'Catégorie', render: (row) => <span>{row.category ?? '—'}</span> },
        {
          key: 'state',
          header: 'État',
          render: (row) => <Badge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Publiée' : 'Masquée'}</Badge>,
        },
      ]}
    />
  );
}

const NAV_FIELDS: FieldDef[] = [
  { key: 'label', label: 'Libellé', required: true },
  { key: 'url', label: 'URL', required: true, placeholder: '/catalogue' },
  {
    key: 'placement',
    label: 'Emplacement',
    type: 'select',
    required: true,
    options: [
      { value: 'header', label: 'En-tête' },
      { value: 'footer', label: 'Pied de page' },
    ],
  },
  { key: 'sort_order', label: 'Ordre', type: 'number' },
  { key: 'is_active', label: 'Affiché', type: 'checkbox', hint: 'Visible sur le site' },
];

function NavigationPanel(): JSX.Element {
  return (
    <CrudModalFields<NavigationItem>
      resource="navigation"
      title="Liens de navigation"
      createLabel="Nouveau lien"
      searchPlaceholder="Rechercher un lien…"
      fields={NAV_FIELDS}
      emptyValues={{ label: '', url: '', placement: 'header', sort_order: 0, is_active: true }}
      columns={[
        { key: 'label', header: 'Libellé', render: (row) => <span className="font-semibold text-ink-900">{row.label}</span> },
        { key: 'url', header: 'URL', render: (row) => <span className="font-mono text-xs text-ink-600">{row.url}</span> },
        {
          key: 'placement',
          header: 'Emplacement',
          render: (row) => <Badge tone={row.placement === 'header' ? 'brand' : 'neutral'}>{row.placement === 'header' ? 'En-tête' : 'Pied de page'}</Badge>,
        },
        {
          key: 'state',
          header: 'État',
          render: (row) => <Badge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Affiché' : 'Masqué'}</Badge>,
        },
      ]}
    />
  );
}
