import { useEffect } from 'react';

interface SeoOptions {
  title?: string;
  description?: string;
  /** Chemin relatif, ex. `/catalogue/tracteurs-agricoles` */
  path?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'GMX Motors';
const JSONLD_ID = 'gmx-jsonld';

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Gère title, méta-description, canonique, Open Graph, robots et JSON-LD
 * pour chaque page. Aucun contenu privé n'est indexable.
 */
export function useSeo(options: SeoOptions): void {
  const { title, description, path, image, noindex = false, jsonLd } = options;

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Matériel agricole professionnel`;
    document.title = fullTitle;

    const desc =
      description ??
      "Tracteurs, machines agricoles, pièces détachées, huiles et lubrifiants pour les professionnels et les particuliers. Demandez votre devis en ligne.";
    upsertMeta('meta[name="description"]', 'name', 'description', desc);

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);

    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
    }

    if (path) {
      const href = `${window.location.origin}${path}`;
      upsertLink('canonical', href);
      upsertMeta('meta[property="og:url"]', 'property', 'og:url', href);
    }

    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    );
  }, [title, description, path, image, noindex]);

  useEffect(() => {
    const existing = document.getElementById(JSONLD_ID);
    if (existing) existing.remove();
    if (!jsonLd) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSONLD_ID;
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }, [jsonLd]);
}

/** Structure Organization — uniquement des informations réelles. */
export function organizationJsonLd(brandName: string, contactEmail: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brandName,
    description:
      "Distribution de matériel agricole : tracteurs, machines, pièces détachées, huiles et lubrifiants pour les professionnels et les particuliers.",
    areaServed: 'FR',
    email: contactEmail || undefined,
    url: typeof window !== 'undefined' ? window.location.origin : undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };
}

export function productJsonLd(product: {
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  brand?: string | null;
  image?: string | null;
  price?: number | null;
  priceOnQuote?: boolean;
  availability?: string;
}): Record<string, unknown> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const availabilityMap: Record<string, string> = {
    en_stock: 'https://schema.org/InStock',
    sur_commande: 'https://schema.org/PreOrder',
    a_confirmer: 'https://schema.org/LimitedAvailability',
    indisponible: 'https://schema.org/OutOfStock',
  };

  const offers =
    product.priceOnQuote || product.price === null || product.price === undefined
      ? {
          '@type': 'Offer',
          url: `${origin}/produit/${product.slug}`,
          availability: availabilityMap[product.availability ?? 'a_confirmer'],
          priceCurrency: 'EUR',
          description: 'Prix communiqué sur devis',
        }
      : {
          '@type': 'Offer',
          url: `${origin}/produit/${product.slug}`,
          price: product.price,
          priceCurrency: 'EUR',
          availability: availabilityMap[product.availability ?? 'a_confirmer'],
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.image ? [product.image] : undefined,
    offers,
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
