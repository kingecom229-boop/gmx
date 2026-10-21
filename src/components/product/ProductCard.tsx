import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import { Badge, Button } from '../ui';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { availabilityLabel, conditionLabel, formatPrice } from '@/lib/format';
import type { Product } from '@shared/types';

/**
 * Placeholder sobre : un produit sans visuel n'affiche jamais d'image
 * mensongère ni d'illustration de substitution présentée comme réelle.
 */
function ProductMedia({ product, sizes }: { product: Product; sizes?: string }): JSX.Element {
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const image = images[0];

  if (!image?.url) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-ink-100 text-ink-300">
        <Icon name="package" size={40} />
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={image.alt || product.name}
      width={640}
      height={480}
      loading="lazy"
      decoding="async"
      sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

function availabilityTone(availability: Product['availability']): 'success' | 'info' | 'warning' | 'neutral' {
  switch (availability) {
    case 'en_stock':
      return 'success';
    case 'sur_commande':
      return 'info';
    case 'indisponible':
      return 'neutral';
    default:
      return 'warning';
  }
}

/** Prix promotionnel réel : calculé à partir du prix de référence enregistré. */
export function promotionPrice(product: Product): { price: number; base: number; percent: number } | null {
  const promo = product.active_promotion;
  const base = product.price_public;
  if (!promo || base === null || base === undefined) return null;

  if (promo.promo_price !== null && promo.promo_price !== undefined && promo.promo_price < base) {
    return { price: promo.promo_price, base, percent: Math.round((1 - promo.promo_price / base) * 100) };
  }
  if (promo.discount_type === 'pourcentage' && promo.discount_value) {
    const price = Math.round(base * (1 - promo.discount_value / 100) * 100) / 100;
    if (price < base) return { price, base, percent: Math.round(promo.discount_value) };
  }
  if (promo.discount_type === 'montant' && promo.discount_value) {
    const price = base - promo.discount_value;
    if (price > 0 && price < base) return { price, base, percent: Math.round((promo.discount_value / base) * 100) };
  }
  return null;
}

export const ProductCard = memo(function ProductCard({ product }: { product: Product }): JSX.Element {
  const { add, open } = useQuoteCart();
  const promotion = promotionPrice(product);

  return (
    <article className="group card relative flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lift">
      <Link to={`/produit/${product.slug}`} className="relative block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <ProductMedia product={product} />
      </Link>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
        {product.condition === 'occasion' ? <Badge tone="neutral">Occasion</Badge> : null}
        {promotion ? <Badge tone="accent" icon="tag">{`−${promotion.percent}%`}</Badge> : null}
        {product.is_demo ? <Badge tone="warning">Démo</Badge> : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={availabilityTone(product.availability)}>{availabilityLabel(product.availability)}</Badge>
          {product.brand?.name ? <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{product.brand.name}</span> : null}
        </div>

        <h3 className="text-[17px] leading-snug">
          <Link to={`/produit/${product.slug}`} className="text-ink-900 no-underline hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-500">Réf. {product.sku}</p>

        {product.short_description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">{product.short_description}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-end justify-between gap-2">
            {promotion ? (
              <div>
                <p className="text-xs text-ink-500 line-through">{formatPrice(promotion.base)}</p>
                <p className="font-display text-2xl font-bold text-accent-700">{formatPrice(promotion.price)}</p>
              </div>
            ) : product.price_on_quote || product.price_public === null ? (
              <p className="font-display text-xl font-bold text-ink-800">Prix sur devis</p>
            ) : (
              <div>
                <p className="font-display text-2xl font-bold text-ink-900">{formatPrice(product.price_public)}</p>
                <p className="text-[11px] text-ink-500">Prix indicatif</p>
              </div>
            )}
            {product.condition === 'neuf' && product.price_public !== null ? (
              <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-600">
                {conditionLabel(product.condition)}
              </span>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              icon="cart"
              disabled={product.availability === 'indisponible'}
              onClick={() => {
                add(product);
                open();
              }}
            >
              Ajouter
            </Button>
            <Link
              to={`/produit/${product.slug}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-ink-300 px-3 text-sm font-semibold text-ink-700 no-underline transition-colors hover:border-brand-500 hover:text-brand-800"
              aria-label={`Voir la fiche de ${product.name}`}
            >
              Détails
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
});

export function ProductCardSkeleton(): JSX.Element {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-9 w-full" />
      </div>
    </div>
  );
}
