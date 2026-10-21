import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  EmptyState,
  LinkButton,
  Skeleton,
} from '@/components/ui';
import { ProductCard, promotionPrice } from '@/components/product/ProductCard';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { useSettings } from '@/context/SettingsContext';
import { useProduct } from '@/hooks/useCatalogue';
import { availabilityLabel, conditionLabel, formatDate, formatPrice } from '@/lib/format';
import { breadcrumbJsonLd, productJsonLd, useSeo } from '@/lib/seo';
import type { ProductAttribute } from '@shared/types';

export function ProductPage(): JSX.Element {
  const { slug = '' } = useParams<{ slug: string }>();
  const { product, related, loading, error } = useProduct(slug);
  const { settings } = useSettings();
  const { add, open } = useQuoteCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const images = useMemo(
    () => [...(product?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [product],
  );

  const attributes = useMemo(() => {
    const groups = new Map<string, ProductAttribute[]>();
    for (const attribute of product?.product_attributes ?? []) {
      const list = groups.get(attribute.group_name) ?? [];
      list.push(attribute);
      groups.set(attribute.group_name, list);
    }
    return [...groups.entries()].map(([name, items]) => ({
      name,
      items: items.sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [product]);

  const specs = useMemo(
    () => Object.entries(product?.specs ?? {}).filter(([, value]) => Boolean(value)),
    [product],
  );

  const promotion = product ? promotionPrice(product) : null;

  useSeo({
    title: product ? (product.seo_title ?? product.name) : 'Équipement',
    description:
      product?.seo_description ??
      product?.short_description ??
      `${product?.name ?? 'Équipement'} — référence ${product?.sku ?? ''}. Caractéristiques techniques, disponibilité et demande de devis.`,
    path: `/produit/${slug}`,
    image: images[0]?.url ?? undefined,
    noindex: !product,
    jsonLd: product
      ? [
          productJsonLd({
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: product.short_description ?? product.description,
            brand: product.brand?.name ?? null,
            image: images[0]?.url ?? null,
            price: promotion?.price ?? product.price_public,
            priceOnQuote: product.price_on_quote || product.price_public === null,
            availability: product.availability,
          }),
          breadcrumbJsonLd([
            { name: 'Accueil', path: '/' },
            { name: 'Catalogue', path: '/catalogue' },
            ...(product.category ? [{ name: product.category.name, path: `/categorie/${product.category.slug}` }] : []),
            { name: product.name, path: `/produit/${product.slug}` },
          ]),
        ]
      : undefined,
  });

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="mb-6 h-5 w-64" />
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon="search"
          title="Cet équipement est introuvable"
          description="La référence demandée n'existe pas ou n'est plus publiée. Consultez le catalogue ou décrivez-nous votre besoin."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/catalogue">Voir le catalogue</LinkButton>
              <LinkButton to="/devis" variant="outline">
                Demander un devis
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  const unavailable = product.availability === 'indisponible';
  const hasAttributes = attributes.length > 0 || specs.length > 0;

  return (
    <div className="bg-cream">
      <div className="container-site py-6 sm:py-8">
        <Breadcrumbs
          items={[
            { label: 'Accueil', to: '/' },
            { label: 'Catalogue', to: '/catalogue' },
            ...(product.category
              ? [{ label: product.category.name, to: `/categorie/${product.category.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          {/* Colonne visuels */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]?.url}
                  alt={images[activeImage]?.alt || product.name}
                  width={1000}
                  height={750}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-ink-100 text-ink-300">
                  <Icon name="package" size={72} />
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Galerie d'images">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Afficher l'image ${index + 1}`}
                    aria-current={index === activeImage}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      index === activeImage ? 'border-brand-700' : 'border-transparent hover:border-ink-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      width={96}
                      height={80}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Description détaillée */}
            {product.description ? (
              <section className="mt-10" aria-labelledby="description-title">
                <h2 id="description-title" className="text-2xl">
                  Description
                </h2>
                <div className="prose-cms mt-4 text-ink-700">
                  {product.description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Caractéristiques */}
            {hasAttributes ? (
              <section className="mt-10" aria-labelledby="specs-title">
                <h2 id="specs-title" className="text-2xl">
                  Caractéristiques techniques
                </h2>

                {attributes.map((group) => (
                  <div key={group.name} className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
                    {group.name !== 'Caractéristiques' ? (
                      <h3 className="border-b border-ink-200 bg-ink-50 px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] text-ink-700">
                        {group.name}
                      </h3>
                    ) : null}
                    <dl className="divide-y divide-ink-100">
                      {group.items.map((attribute) => (
                        <div key={attribute.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 px-5 py-3">
                          <dt className="text-sm font-medium text-ink-600">{attribute.label}</dt>
                          <dd className="text-sm font-semibold text-ink-900">{attribute.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}

                {specs.length > 0 ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
                    <dl className="divide-y divide-ink-100">
                      {specs.map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 px-5 py-3">
                          <dt className="text-sm font-medium text-ink-600">{key}</dt>
                          <dd className="text-sm font-semibold text-ink-900">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="mt-10">
                <Alert tone="info" title="Caractéristiques détaillées sur demande">
                  Les spécifications techniques de cet équipement vous sont transmises avec le devis. Précisez votre
                  usage dans votre demande pour obtenir les informations pertinentes.
                </Alert>
              </section>
            )}
          </div>

          {/* Colonne achat */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card overflow-hidden">
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      product.availability === 'en_stock'
                        ? 'success'
                        : product.availability === 'sur_commande'
                          ? 'info'
                          : product.availability === 'indisponible'
                            ? 'neutral'
                            : 'warning'
                    }
                  >
                    {availabilityLabel(product.availability)}
                  </Badge>
                  <Badge tone="neutral">{conditionLabel(product.condition)}</Badge>
                  {product.is_demo ? <Badge tone="warning">Donnée de démonstration</Badge> : null}
                </div>

                {product.brand?.name ? (
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-ink-500">
                    {product.brand.name}
                    {product.model ? ` · ${product.model}` : ''}
                  </p>
                ) : null}

                <h1 className="mt-2 text-3xl leading-tight">{product.name}</h1>
                <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-500">Réf. {product.sku}</p>

                {product.short_description ? (
                  <p className="mt-4 leading-relaxed text-ink-600">{product.short_description}</p>
                ) : null}

                {/* Prix */}
                <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 p-4">
                  {promotion ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">
                        Offre en cours{product.active_promotion?.ends_at ? ` — jusqu'au ${formatDate(product.active_promotion.ends_at)}` : ''}
                      </p>
                      <div className="mt-1 flex items-end gap-3">
                        <span className="font-display text-3xl font-bold text-accent-700">
                          {formatPrice(promotion.price)}
                        </span>
                        <span className="pb-1 text-sm text-ink-500 line-through">{formatPrice(promotion.base)}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-500">
                        Prix indicatif, calculé sur le prix de référence enregistré. Le prix définitif est confirmé au
                        devis.
                      </p>
                    </>
                  ) : product.price_on_quote || product.price_public === null ? (
                    <>
                      <p className="font-display text-3xl font-bold text-ink-900">Prix sur devis</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">
                        Le tarif dépend de la configuration, de la quantité et des conditions de livraison. Un
                        commercial vous communique un prix ferme.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-3xl font-bold text-ink-900">
                        {formatPrice(product.price_public)}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        Prix indicatif, non contractuel. Le prix définitif est confirmé lors du devis.
                      </p>
                    </>
                  )}
                </div>

                {/* Quantité + CTA */}
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-3">
                    <label htmlFor="quantity" className="text-sm font-semibold text-ink-800">
                      Quantité
                    </label>
                    <div className="inline-flex items-center rounded-xl border border-ink-300 bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        aria-label="Diminuer la quantité"
                        className="flex h-10 w-10 items-center justify-center text-ink-600 hover:text-brand-700"
                      >
                        <Icon name="minus" size={15} />
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        min={1}
                        max={9999}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(Math.min(9999, Math.max(1, Math.trunc(Number(event.target.value) || 1))))
                        }
                        className="h-10 w-14 border-x border-ink-200 bg-transparent text-center font-semibold text-ink-900 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.min(9999, value + 1))}
                        aria-label="Augmenter la quantité"
                        className="flex h-10 w-10 items-center justify-center text-ink-600 hover:text-brand-700"
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                  </div>

                  <Button
                    block
                    size="lg"
                    icon={added ? 'check' : 'cart'}
                    disabled={unavailable}
                    onClick={() => {
                      add(product, quantity);
                      setAdded(true);
                      open();
                      window.setTimeout(() => setAdded(false), 2500);
                    }}
                  >
                    {unavailable ? 'Équipement indisponible' : added ? 'Ajouté à la demande' : 'Ajouter à ma demande de devis'}
                  </Button>

                  <LinkButton to="/devis" block variant="outline" size="lg" className="mt-3" iconRight="arrow-right">
                    Envoyer ma demande maintenant
                  </LinkButton>

                  {unavailable ? (
                    <Alert tone="warning" className="mt-4" title="Équipement momentanément indisponible">
                      Contactez-nous : nous vous informons des délais de réapprovisionnement ou des équivalents
                      disponibles.
                    </Alert>
                  ) : null}
                </div>
              </div>

              {/* Informations complémentaires */}
              <dl className="divide-y divide-ink-100 border-t border-ink-200 bg-ink-50/60 text-sm">
                {product.delivery_text || settings.delivery_text ? (
                  <div className="flex gap-3 px-6 py-4">
                    <Icon name="truck" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                    <div>
                      <dt className="font-semibold text-ink-800">Livraison</dt>
                      <dd className="mt-0.5 text-ink-600">{product.delivery_text ?? settings.delivery_text}</dd>
                    </div>
                  </div>
                ) : null}
                {product.warranty_text || settings.warranty_text ? (
                  <div className="flex gap-3 px-6 py-4">
                    <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                    <div>
                      <dt className="font-semibold text-ink-800">Garantie</dt>
                      <dd className="mt-0.5 text-ink-600">{product.warranty_text ?? settings.warranty_text}</dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-3 px-6 py-4">
                  <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <div>
                    <dt className="font-semibold text-ink-800">Une question sur cet équipement ?</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${settings.contact_email}?subject=${encodeURIComponent(`Question — ${product.sku} ${product.name}`)}`} className="font-semibold">
                        {settings.contact_email}
                      </a>
                      {settings.contact_phone ? (
                        <>
                          {' · '}
                          <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="font-semibold">
                            {settings.contact_phone}
                          </a>
                        </>
                      ) : null}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {product.active_promotion ? (
              <Link to="/offres" className="card mt-4 flex items-start gap-3 border-accent-200 bg-accent-50 p-4 no-underline">
                <Icon name="tag" size={18} className="mt-0.5 shrink-0 text-accent-700" />
                <div>
                  <p className="text-sm font-semibold text-accent-900">{product.active_promotion.title}</p>
                  <p className="mt-0.5 text-xs text-accent-800">
                    Voir les conditions de l'opération commerciale
                  </p>
                </div>
              </Link>
            ) : null}
          </aside>
        </div>

        {/* Produits associés */}
        {related.length > 0 ? (
          <section className="mt-16" aria-labelledby="related-title">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="related-title" className="text-2xl sm:text-3xl">
                Équipements complémentaires
              </h2>
              <Link to="/catalogue" className="text-sm font-semibold text-brand-700">
                Tout le catalogue
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

