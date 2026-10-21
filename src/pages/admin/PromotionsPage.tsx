import { useEffect, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { FormModal, PageHeader, type FieldDef } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import { PROMOTION_KIND_LABELS, type Promotion, type Product } from '@shared/types';

const EMPTY: Record<string, unknown> = {
  code: '',
  title: '',
  description: '',
  kind: 'promotion',
  discount_type: 'aucune',
  discount_value: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  banner_image_url: '',
  conditions_text: '',
  show_on_home: false,
};

const FIELDS: FieldDef[] = [
  { key: 'title', label: "Titre de l'opération", required: true, span: 2 },
  { key: 'code', label: 'Code interne', required: true, hint: 'Identifiant unique, non affiché au client.' },
  {
    key: 'kind',
    label: 'Type',
    type: 'select',
    required: true,
    options: Object.entries(PROMOTION_KIND_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
  {
    key: 'discount_type',
    label: 'Type de remise',
    type: 'select',
    required: true,
    options: [
      { value: 'aucune', label: 'Aucune remise chiffrée' },
      { value: 'pourcentage', label: 'Pourcentage' },
      { value: 'montant', label: 'Montant en euros' },
    ],
    hint: 'Toute remise affichée doit reposer sur un prix de référence enregistré.',
  },
  { key: 'discount_value', label: 'Valeur de la remise', type: 'number', hint: 'Obligatoire si un type de remise est choisi.' },
  { key: 'starts_at', label: 'Début', type: 'date' },
  { key: 'ends_at', label: 'Fin', type: 'date' },
  { key: 'banner_image_url', label: 'URL du visuel', type: 'url', span: 2, placeholder: '/images/offre.jpg' },
  { key: 'conditions_text', label: "Conditions de l'offre", type: 'textarea', span: 2, rows: 3, hint: "Affichées telles quelles sur la page Offres." },
  { key: 'is_active', label: 'Active', type: 'checkbox', hint: 'Visible sur le site' },
  { key: 'show_on_home', label: 'Page d’accueil', type: 'checkbox', hint: 'Afficher dans les offres du moment' },
];

export function PromotionsPage(): JSX.Element {
  const toast = useToast();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.admin
      .list('promotions', new URLSearchParams({ per_page: '100' }))
      .then((response) => {
        if (!cancelled) setRows(response.items as Promotion[]);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  useEffect(() => {
    api.admin
      .list('products', new URLSearchParams({ per_page: '200' }))
      .then((response) => setProducts(response.items as Product[]))
      .catch(() => setProducts([]));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setSelectedProducts([]);
    setEditing({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (promotion: Promotion) => {
    setEditingId(promotion.id);
    setSelectedProducts(
      ((promotion as Promotion & { promotion_products?: { product_id: string }[] }).promotion_products ?? []).map(
        (link) => link.product_id,
      ),
    );
    setEditing({
      code: promotion.code,
      title: promotion.title,
      description: promotion.description ?? '',
      kind: promotion.kind,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value ?? '',
      starts_at: promotion.starts_at ? promotion.starts_at.slice(0, 10) : '',
      ends_at: promotion.ends_at ? promotion.ends_at.slice(0, 10) : '',
      is_active: promotion.is_active,
      banner_image_url: promotion.banner_image_url ?? '',
      conditions_text: promotion.conditions_text ?? '',
      show_on_home: promotion.show_on_home,
    });
    setOpen(true);
  };

  const save = async (values: Record<string, unknown>): Promise<void> => {
    const discountType = String(values.discount_type ?? 'aucune');
    const rawValue = String(values.discount_value ?? '').trim();

    if (discountType !== 'aucune' && rawValue === '') {
      throw new ApiError(400, 'missing_value', 'Indiquez la valeur de la remise ou choisissez « Aucune remise chiffrée ».');
    }
    if (discountType === 'pourcentage' && rawValue !== '' && (Number(rawValue) <= 0 || Number(rawValue) >= 100)) {
      throw new ApiError(400, 'invalid_value', 'Un pourcentage doit être compris entre 0 et 100 exclus.');
    }

    const startsAt = values.starts_at ? new Date(`${values.starts_at}T00:00:00`).toISOString() : null;
    const endsAt = values.ends_at ? new Date(`${values.ends_at}T23:59:59`).toISOString() : null;
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new ApiError(400, 'invalid_period', 'La date de fin doit être postérieure à la date de début.');
    }

    const payload: Record<string, unknown> = {
      code: String(values.code ?? '').trim(),
      title: String(values.title ?? '').trim(),
      description: String(values.description ?? '').trim() || null,
      kind: values.kind,
      discount_type: discountType,
      discount_value: discountType === 'aucune' ? null : Number(rawValue),
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: Boolean(values.is_active),
      banner_image_url: String(values.banner_image_url ?? '').trim() || null,
      conditions_text: String(values.conditions_text ?? '').trim() || null,
      show_on_home: Boolean(values.show_on_home),
    };

    let promotionId = editingId;
    if (promotionId) {
      await api.admin.update('promotions', promotionId, payload);
    } else {
      const response = await api.admin.create('promotions', payload);
      promotionId = (response.item as { id: string }).id;
    }

    // Produits concernés : route dédiée qui remplace l'ensemble des liens.
    if (promotionId) {
      await api.admin.setPromotionProducts(promotionId, selectedProducts);
    }

    toast.success(editingId ? 'Opération mise à jour' : 'Opération créée');
    setNonce((value) => value + 1);
  };

  const remove = async (promotion: Promotion): Promise<void> => {
    if (!window.confirm(`Supprimer l'opération « ${promotion.title} » ?`)) return;
    try {
      await api.admin.remove('promotions', promotion.id);
      toast.success('Opération supprimée');
      setNonce((value) => value + 1);
    } catch (caught) {
      toast.error('Suppression impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const isActive = (promotion: Promotion): boolean => {
    if (!promotion.is_active) return false;
    const now = Date.now();
    if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) return false;
    if (promotion.ends_at && new Date(promotion.ends_at).getTime() <= now) return false;
    return true;
  };

  return (
    <>
      <PageHeader
        title="Promotions & opérations commerciales"
        description="Chaque opération est datée, conditionnée et rattachée à des produits précis. Aucune remise n'est affichée sans prix de référence enregistré."
        actions={
          <Button icon="plus" onClick={openCreate}>
            Nouvelle opération
          </Button>
        }
      />

      {error ? (
        <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div>
      ) : loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton mx-5 my-4 h-4 w-2/3" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="text-lg font-semibold text-ink-900">Aucune opération commerciale</p>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-ink-600">
            Aucune promotion n'est affichée sur le site tant que vous n'en avez pas créé une. La page Offres indique
            alors explicitement qu'aucune opération n'est en cours.
          </p>
          <Button className="mt-6" icon="plus" onClick={openCreate}>
            Créer une opération
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((promotion) => (
            <article key={promotion.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={isActive(promotion) ? 'success' : 'neutral'}>
                      {isActive(promotion) ? 'Active sur le site' : 'Inactive'}
                    </Badge>
                    <Badge tone="accent">{PROMOTION_KIND_LABELS[promotion.kind]}</Badge>
                    <span className="font-mono text-[11px] text-ink-500">{promotion.code}</span>
                  </div>
                  <h2 className="mt-2 text-xl">{promotion.title}</h2>
                  {promotion.description ? <p className="mt-1.5 text-sm text-ink-600">{promotion.description}</p> : null}
                  <p className="mt-2 text-xs text-ink-500">
                    {promotion.starts_at ? `Du ${formatDate(promotion.starts_at)}` : 'Sans date de début'}
                    {' · '}
                    {promotion.ends_at ? `au ${formatDate(promotion.ends_at)}` : 'sans date de fin'}
                    {promotion.discount_type !== 'aucune' && promotion.discount_value !== null
                      ? ` · remise ${promotion.discount_value}${promotion.discount_type === 'pourcentage' ? ' %' : ' €'}`
                      : ' · aucune remise chiffrée'}
                  </p>
                  {promotion.conditions_text ? (
                    <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
                      {promotion.conditions_text}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" icon="edit" onClick={() => openEdit(promotion)}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => void remove(promotion)}>
                    <span className="sr-only">Supprimer</span>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <FormModal
          open={open}
          title={editingId ? "Modifier l'opération" : 'Nouvelle opération commerciale'}
          fields={FIELDS}
          initial={editing ?? EMPTY}
          size="lg"
          onClose={() => setOpen(false)}
          onSubmit={save}
          extra={
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <p className="text-sm font-semibold text-ink-800">Produits concernés ({selectedProducts.length})</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Sans produit rattaché, l'offre est présentée comme s'appliquant sur demande — jamais comme une remise
                appliquée à des produits non définis.
              </p>
              <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {products.map((product) => {
                  const selected = selectedProducts.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        setSelectedProducts((current) =>
                          selected ? current.filter((id) => id !== product.id) : [...current, product.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-300 bg-white text-ink-700'
                      }`}
                    >
                      {product.name}
                    </button>
                  );
                })}
                {products.length === 0 ? <span className="text-xs text-ink-500">Aucun produit créé pour le moment.</span> : null}
              </div>
            </div>
          }
        />
      ) : null}

    </>
  );
}
