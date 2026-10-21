import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Breadcrumbs, EmptyState, ErrorState, LinkButton } from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { useApi } from '@/hooks/useApi';
import { useCategories } from '@/hooks/useCatalogue';
import { api } from '@/lib/api';
import { breadcrumbJsonLd, useSeo } from '@/lib/seo';
import type { Category, Product } from '@shared/types';

const PER_PAGE = 12;

export function CategoryPage(): JSX.Element {
  const { slug = '' } = useParams<{ slug: string }>();
  const { categories, loading: categoriesLoading } = useCategories();

  const category = categories.find((item: Category) => item.slug === slug) ?? null;

  const result = useApi<{ products: Product[]; total: number }>(() => {
    const params = new URLSearchParams({
      category: slug,
      sort: 'popularity',
      per_page: String(PER_PAGE),
    });
    return api.products(params) as unknown as Promise<{ products: Product[]; total: number }>;
  }, [slug]);

  const children = useMemo(
    () => categories.filter((item: Category) => item.parent_id && item.parent_id === category?.id),
    [categories, category],
  );

  useSeo({
    title: category ? (category.seo_title ?? category.name) : 'Catégorie',
    description:
      category?.seo_description ??
      category?.description ??
      `Découvrez notre sélection de ${category?.name ?? 'matériel agricole'} et demandez un devis en ligne.`,
    path: `/categorie/${slug}`,
    image: category?.image_url ?? undefined,
    noindex: !category,
    jsonLd: breadcrumbJsonLd([
      { name: 'Accueil', path: '/' },
      { name: 'Catalogue', path: '/catalogue' },
      { name: category?.name ?? slug, path: `/categorie/${slug}` },
    ]),
  });

  if (!categoriesLoading && !category) {
    return <Navigate to="/catalogue" replace />;
  }

  const products = result.data?.products ?? [];
  const total = result.data?.total ?? 0;

  return (
    <div className="bg-cream">
      <section className="border-b border-ink-200 bg-white">
        <div className="container-site py-9 sm:py-12">
          <Breadcrumbs
            items={[
              { label: 'Accueil', to: '/' },
              { label: 'Catalogue', to: '/catalogue' },
              { label: category?.name ?? '…' },
            ]}
          />
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="text-3xl sm:text-4xl">{categoriesLoading ? 'Chargement…' : category?.name}</h1>
              {category?.description ? (
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">{category.description}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <LinkButton to={`/catalogue?categorie=${slug}`} variant="outline" size="sm" icon="list">
                  Filtrer dans le catalogue
                </LinkButton>
                <LinkButton to="/devis" variant="ghost" size="sm" iconRight="arrow-right">
                  Demander un devis
                </LinkButton>
              </div>
            </div>
            {category?.image_url ? (
              <img
                src={category.image_url}
                alt=""
                width={640}
                height={480}
                loading="lazy"
                decoding="async"
                className="hidden aspect-[4/3] w-full rounded-2xl object-cover lg:block"
              />
            ) : null}
          </div>
        </div>
      </section>

      {children.length > 0 ? (
        <section className="border-b border-ink-200 bg-white">
          <div className="container-site py-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-500">Sous-catégories</h2>
            <ul className="flex flex-wrap gap-2">
              {children.map((child: Category) => (
                <li key={child.id}>
                  <Link
                    to={`/categorie/${child.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-sm font-medium text-ink-700 no-underline transition-colors hover:border-brand-400 hover:text-brand-800"
                  >
                    {child.name}
                    <Icon name="chevron-right" size={13} className="text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="container-site py-10">
        <p className="mb-6 text-sm text-ink-600" aria-live="polite">
          {result.loading ? (
            'Chargement des équipements…'
          ) : (
            <>
              <span className="font-bold text-ink-900">{total}</span> équipement{total > 1 ? 's' : ''} disponible
              {total > 1 ? 's' : ''}
            </>
          )}
        </p>

        {result.error ? (
          <ErrorState title="Catalogue indisponible" description={result.error} onRetry={result.reload} />
        ) : result.loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Aucun équipement publié dans cette catégorie"
            description="Cette catégorie n'a pas encore de référence publiée. Décrivez-nous l'équipement recherché : un commercial vous répond avec les disponibilités réelles."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <LinkButton to="/catalogue" variant="outline">
                  Voir tout le catalogue
                </LinkButton>
                <LinkButton to="/devis">Demander un devis</LinkButton>
              </div>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {total > PER_PAGE ? (
              <div className="mt-10 text-center">
                <LinkButton to={`/catalogue?categorie=${slug}`} variant="outline" iconRight="arrow-right">
                  Voir les {total} équipements de cette catégorie
                </LinkButton>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
