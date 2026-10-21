import { useEffect, useState } from 'react';
import { Badge, Button, Field, Input, Modal, Pagination, Select, Textarea } from '@/components/ui';
import { PageHeader } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useCategories, useBrands } from '@/hooks/useCatalogue';
import { slugify } from '@/lib/format';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  type Brand,
  type Category,
  type Product,
} from '@shared/types';

const PER_PAGE = 20;

const EMPTY: Record<string, unknown> = {
  sku: '',
  name: '',
  slug: '',
  model: '',
  brand_id: '',
  category_id: '',
  subcategory_id: '',
  condition: 'neuf',
  availability: 'a_confirmer',
  price_public: '',
  price_on_quote: true,
  short_description: '',
  description: '',
  specs: '{}',
  warranty_text: '',
  delivery_text: '',
  is_featured: false,
  is_active: true,
  is_archived: false,
  is_demo: false,
  seo_title: '',
  seo_description: '',
};

export function ProductsPage(): JSX.Element {
  const toast = useToast();
  const { categories } = useCategories();
  const { brands } = useBrands();

  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE), archived: String(showArchived) });
    if (debounced) params.set('q', debounced);

    api.admin
      .list('products', params)
      .then((response) => {
        if (cancelled) return;
        setRows(response.items as Product[]);
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
  }, [page, debounced, showArchived, nonce]);

  const reload = () => setNonce((value) => value + 1);

  const openCreate = () => {
    setEditingId(null);
    setFormError(null);
    setEditing({ ...EMPTY });
  };

  const openEdit = (product: Product) => {
    setFormError(null);
    setEditingId(product.id);
    setEditing({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      model: product.model ?? '',
      brand_id: product.brand_id ?? '',
      category_id: product.category_id ?? '',
      subcategory_id: product.subcategory_id ?? '',
      condition: product.condition,
      availability: product.availability,
      price_public: product.price_public ?? '',
      price_on_quote: product.price_on_quote,
      short_description: product.short_description ?? '',
      description: product.description ?? '',
      specs: JSON.stringify(product.specs ?? {}, null, 2),
      warranty_text: product.warranty_text ?? '',
      delivery_text: product.delivery_text ?? '',
      is_featured: product.is_featured,
      is_active: product.is_active,
      is_archived: product.is_archived,
      is_demo: product.is_demo,
      seo_title: product.seo_title ?? '',
      seo_description: product.seo_description ?? '',
      images: product.product_images ?? [],
    });
  };

  const save = async (): Promise<void> => {
    if (!editing) return;
    setFormError(null);

    const name = String(editing.name ?? '').trim();
    const sku = String(editing.sku ?? '').trim();
    if (!name || !sku) {
      setFormError('Le nom et la référence (SKU) sont obligatoires.');
      return;
    }

    let specs: Record<string, string> = {};
    const rawSpecs = String(editing.specs ?? '{}').trim();
    if (rawSpecs) {
      try {
        const parsed: unknown = JSON.parse(rawSpecs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setFormError('Les caractéristiques doivent être un objet JSON : { "Puissance": "120 ch" }');
          return;
        }
        specs = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
        );
      } catch {
        setFormError('JSON invalide dans les caractéristiques techniques.');
        return;
      }
    }

    const priceRaw = String(editing.price_public ?? '').trim();
    const price = priceRaw === '' ? null : Number(priceRaw);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setFormError('Prix invalide : laissez vide pour « prix sur devis », ou saisissez un nombre positif.');
      return;
    }

    const payload: Record<string, unknown> = {
      sku,
      name,
      slug: String(editing.slug ?? '').trim() || slugify(name),
      model: String(editing.model ?? '').trim() || null,
      brand_id: String(editing.brand_id ?? '') || null,
      category_id: String(editing.category_id ?? '') || null,
      subcategory_id: String(editing.subcategory_id ?? '') || null,
      condition: editing.condition,
      availability: editing.availability,
      price_public: price,
      price_on_quote: price === null ? true : Boolean(editing.price_on_quote),
      short_description: String(editing.short_description ?? '').trim() || null,
      description: String(editing.description ?? '').trim() || null,
      specs,
      warranty_text: String(editing.warranty_text ?? '').trim() || null,
      delivery_text: String(editing.delivery_text ?? '').trim() || null,
      is_featured: Boolean(editing.is_featured),
      is_active: Boolean(editing.is_active),
      is_archived: Boolean(editing.is_archived),
      is_demo: Boolean(editing.is_demo),
      seo_title: String(editing.seo_title ?? '').trim() || null,
      seo_description: String(editing.seo_description ?? '').trim() || null,
    };

    if (payload.price_on_quote === false && payload.price_public === null) {
      setFormError('Indiquez un prix ou cochez « Prix sur devis ».');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.admin.update('products', editingId, payload);
        toast.success('Produit mis à jour');
      } else {
        payload.published_at = payload.is_active ? new Date().toISOString() : null;
        await api.admin.create('products', payload);
        toast.success('Produit créé');
      }
      setEditing(null);
      reload();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (product: Product): Promise<void> => {
    try {
      const response = await api.admin.duplicateProduct(product.id);
      toast.success('Produit dupliqué', 'La copie est créée en mode brouillon (non publiée).');
      void response;
      reload();
    } catch (caught) {
      toast.error('Duplication impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const toggleActive = async (product: Product): Promise<void> => {
    try {
      await api.admin.update('products', product.id, {
        is_active: !product.is_active,
        published_at: !product.is_active && !product.published_at ? new Date().toISOString() : product.published_at,
      });
      toast.success(product.is_active ? 'Produit dépublié' : 'Produit publié');
      reload();
    } catch (caught) {
      toast.error('Mise à jour impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const remove = async (product: Product): Promise<void> => {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${product.name} » ?\n\nSes images et caractéristiques seront également supprimées. Préférez l'archivage pour conserver l'historique.`,
    );
    if (!confirmed) return;
    try {
      await api.admin.remove('products', product.id);
      toast.success('Produit supprimé');
      reload();
    } catch (caught) {
      toast.error('Suppression impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const setField = (key: string, value: unknown) => {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <>
      <PageHeader
        title="Produits"
        description="Créez, modifiez, publiez, archivez et dupliquez les références du catalogue."
        actions={
          <>
            <Button
              variant="outline"
              icon="download"
              onClick={() => void api.adminDownload('/admin/products/export/csv', `catalogue-gmx-${new Date().toISOString().slice(0, 10)}.csv`)}
            >
              Export CSV
            </Button>
            <Button icon="plus" onClick={openCreate}>
              Nouveau produit
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <label htmlFor="product-search" className="sr-only">
            Rechercher un produit
          </label>
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nom ou référence…"
            maxLength={120}
            className="h-10 w-full rounded-xl border border-ink-300 bg-white pl-3.5 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => {
              setShowArchived(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-brand-700"
          />
          Afficher les archivés
        </label>

        <p className="ml-auto text-sm text-ink-500" aria-live="polite">
          {loading ? '…' : `${total} produit${total > 1 ? 's' : ''}`}
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
          <p className="text-lg font-semibold text-ink-900">Aucun produit</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-600">
            Créez votre première référence, ou importez un catalogue existant depuis un export CSV (colonnes : sku,
            name, slug, model, brand, category, condition, availability, price_public, price_on_quote).
          </p>
          <Button className="mt-6" icon="plus" onClick={openCreate}>
            Créer un produit
          </Button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50">
                  {['Produit', 'Catégorie', 'Prix', 'Disponibilité', 'État', 'Actions'].map((header) => (
                    <th key={header} scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-ink-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-100">
                          {product.product_images?.[0]?.url ? (
                            <img
                              src={product.product_images[0].url}
                              alt=""
                              width={56}
                              height={48}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="block truncate text-left font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {product.name}
                          </button>
                          <p className="font-mono text-[11px] text-ink-500">{product.sku}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {product.is_active ? (
                              <Badge tone="success">Publié</Badge>
                            ) : (
                              <Badge tone="warning">Brouillon</Badge>
                            )}
                            {product.is_archived ? <Badge tone="neutral">Archivé</Badge> : null}
                            {product.is_featured ? <Badge tone="brand">Mis en avant</Badge> : null}
                            {product.is_demo ? <Badge tone="warning">Démo</Badge> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-600">{product.category?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm">
                      {product.price_on_quote || product.price_public === null ? (
                        <span className="font-semibold text-ink-500">Sur devis</span>
                      ) : (
                        <span className="font-semibold text-ink-900">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.price_public)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-600">{AVAILABILITY_LABELS[product.availability]}</td>
                    <td className="px-5 py-3.5 text-sm text-ink-600">{CONDITION_LABELS[product.condition]}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => openEdit(product)}>
                          <span className="sr-only">Modifier</span>
                        </Button>
                        <Button size="sm" variant="ghost" icon="copy" onClick={() => void duplicate(product)}>
                          <span className="sr-only">Dupliquer</span>
                        </Button>
                        <Button size="sm" variant="ghost" icon="eye" onClick={() => void toggleActive(product)}>
                          <span className="sr-only">{product.is_active ? 'Dépublier' : 'Publier'}</span>
                        </Button>
                        <Button size="sm" variant="ghost" icon="trash" onClick={() => void remove(product)}>
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />

      {/* Éditeur produit */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editingId ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void save()} loading={saving} icon="check">
              {editingId ? 'Enregistrer' : 'Créer le produit'}
            </Button>
          </>
        }
      >
        {formError ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</div>
        ) : null}

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom commercial" htmlFor="p-name" required>
              <Input
                id="p-name"
                value={String(editing.name ?? '')}
                maxLength={200}
                onChange={(event) => {
                  setField('name', event.target.value);
                  if (!editingId) setField('slug', slugify(event.target.value));
                }}
              />
            </Field>
            <Field label="Référence (SKU)" htmlFor="p-sku" required hint="Identifiant unique, utilisé dans les devis.">
              <Input
                id="p-sku"
                value={String(editing.sku ?? '')}
                maxLength={80}
                onChange={(event) => setField('sku', event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="URL (slug)" htmlFor="p-slug" required hint="Minuscules, chiffres et tirets.">
              <Input id="p-slug" value={String(editing.slug ?? '')} maxLength={160} onChange={(event) => setField('slug', slugify(event.target.value))} />
            </Field>
            <Field label="Modèle" htmlFor="p-model">
              <Input id="p-model" value={String(editing.model ?? '')} maxLength={120} onChange={(event) => setField('model', event.target.value)} />
            </Field>

            <Field label="Marque" htmlFor="p-brand">
              <Select
                id="p-brand"
                value={String(editing.brand_id ?? '')}
                onChange={(event) => setField('brand_id', event.target.value)}
                placeholder="Aucune"
                options={brands.map((brand: Brand) => ({ value: brand.id, label: brand.name }))}
              />
            </Field>
            <Field label="Catégorie" htmlFor="p-category">
              <Select
                id="p-category"
                value={String(editing.category_id ?? '')}
                onChange={(event) => setField('category_id', event.target.value)}
                placeholder="Aucune"
                options={categories.map((category: Category) => ({ value: category.id, label: category.name }))}
              />
            </Field>
            <Field label="Sous-catégorie" htmlFor="p-subcategory">
              <Select
                id="p-subcategory"
                value={String(editing.subcategory_id ?? '')}
                onChange={(event) => setField('subcategory_id', event.target.value)}
                placeholder="Aucune"
                options={categories
                  .filter((category: Category) => category.id !== editing.category_id)
                  .map((category: Category) => ({ value: category.id, label: category.name }))}
              />
            </Field>
            <Field label="État" htmlFor="p-condition">
              <Select
                id="p-condition"
                value={String(editing.condition ?? 'neuf')}
                onChange={(event) => setField('condition', event.target.value)}
                options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>

            <Field label="Disponibilité" htmlFor="p-availability" hint="Affichée telle quelle sur le site.">
              <Select
                id="p-availability"
                value={String(editing.availability ?? 'a_confirmer')}
                onChange={(event) => setField('availability', event.target.value)}
                options={Object.entries(AVAILABILITY_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>
            <Field label="Prix public (€)" htmlFor="p-price" hint="Laissez vide pour « prix sur devis ».">
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={String(editing.price_public ?? '')}
                onChange={(event) => setField('price_public', event.target.value)}
              />
            </Field>

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <ToggleField
                id="p-on-quote"
                label="Prix sur devis"
                hint="Affiche « Prix sur devis » au lieu d'un montant."
                checked={Boolean(editing.price_on_quote)}
                onChange={(value) => setField('price_on_quote', value)}
              />
              <ToggleField
                id="p-featured"
                label="Mis en avant"
                hint="Affiché dans la sélection de la page d'accueil."
                checked={Boolean(editing.is_featured)}
                onChange={(value) => setField('is_featured', value)}
              />
              <ToggleField
                id="p-active"
                label="Publié"
                hint="Un produit non publié reste invisible sur le site."
                checked={Boolean(editing.is_active)}
                onChange={(value) => setField('is_active', value)}
              />
              <ToggleField
                id="p-demo"
                label="Donnée de démonstration"
                hint="Signale une fiche de test, non commerciale."
                checked={Boolean(editing.is_demo)}
                onChange={(value) => setField('is_demo', value)}
              />
            </div>

            <Field label="Description courte" htmlFor="p-short" className="sm:col-span-2">
              <Textarea
                id="p-short"
                rows={2}
                maxLength={400}
                value={String(editing.short_description ?? '')}
                onChange={(event) => setField('short_description', event.target.value)}
              />
            </Field>
            <Field label="Description détaillée" htmlFor="p-description" className="sm:col-span-2">
              <Textarea
                id="p-description"
                rows={7}
                maxLength={20000}
                value={String(editing.description ?? '')}
                onChange={(event) => setField('description', event.target.value)}
              />
            </Field>

            <Field
              label="Caractéristiques techniques (JSON)"
              htmlFor="p-specs"
              className="sm:col-span-2"
              hint='Format : { "Puissance": "120 ch", "Transmission": "PowerShift" }'
            >
              <Textarea
                id="p-specs"
                rows={5}
                className="font-mono text-xs"
                value={String(editing.specs ?? '{}')}
                onChange={(event) => setField('specs', event.target.value)}
              />
            </Field>

            <Field label="Livraison" htmlFor="p-delivery">
              <Input id="p-delivery" value={String(editing.delivery_text ?? '')} maxLength={500} onChange={(event) => setField('delivery_text', event.target.value)} />
            </Field>
            <Field label="Garantie" htmlFor="p-warranty">
              <Input id="p-warranty" value={String(editing.warranty_text ?? '')} maxLength={500} onChange={(event) => setField('warranty_text', event.target.value)} />
            </Field>

            <Field label="Titre SEO" htmlFor="p-seo-title" hint="Par défaut : le nom du produit.">
              <Input id="p-seo-title" value={String(editing.seo_title ?? '')} maxLength={70} onChange={(event) => setField('seo_title', event.target.value)} />
            </Field>
            <Field label="Méta-description SEO" htmlFor="p-seo-desc">
              <Input id="p-seo-desc" value={String(editing.seo_description ?? '')} maxLength={160} onChange={(event) => setField('seo_description', event.target.value)} />
            </Field>

            {editingId ? (
              <div className="sm:col-span-2 rounded-xl border border-ink-200 bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-800">Images</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Les images du produit sont servies depuis le bucket Supabase <code>catalogue</code> (public en
                  lecture, écriture réservée aux administrateurs). Ajoutez-les depuis le tableau de bord Supabase ou
                  par URL dans la table <code>product_images</code>.
                </p>
                {(editing.images as { url: string; alt: string | null }[] | undefined)?.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(editing.images as { url: string; alt: string | null }[]).map((image) => (
                      <li key={image.url} className="h-16 w-20 overflow-hidden rounded-lg border border-ink-200">
                        <img src={image.url} alt={image.alt ?? ''} className="h-full w-full object-cover" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ink-500">Aucune image associée pour le moment.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function ToggleField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): JSX.Element {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded accent-brand-700"
      />
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
      </span>
    </label>
  );
}

