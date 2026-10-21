import { useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { Alert, Badge, Breadcrumbs, EmptyState, ErrorState, LinkButton, Skeleton } from '@/components/ui';
import { ProductCard } from '@/components/product/ProductCard';
import { usePromotions } from '@/hooks/useCatalogue';
import { formatDate } from '@/lib/format';
import { useSeo } from '@/lib/seo';
import { PROMOTION_KIND_LABELS, type Product, type Promotion } from '@shared/types';

export function OffersPage(): JSX.Element {
  const { promotions, loading, error, reload } = usePromotions();

  const grouped = useMemo(() => {
    const map = new Map<string, Promotion[]>();
    for (const promotion of promotions) {
      const list = map.get(promotion.kind) ?? [];
      list.push(promotion);
      map.set(promotion.kind, list);
    }
    return [...map.entries()];
  }, [promotions]);

  useSeo({
    title: 'Offres et opérations commerciales',
    description:
      "Opérations commerciales en cours sur le matériel agricole : remises, lots d'équipements, packs d'entretien, offres professionnels et déstockage. Conditions et périodes affichées.",
    path: '/offres',
  });

  return (
    <div className="bg-cream">
      <section className="border-b border-ink-200 bg-white">
        <div className="container-site py-9 sm:py-12">
          <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Offres' }]} />
          <h1 className="text-3xl sm:text-4xl">Offres et opérations commerciales</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Les opérations affichées ici sont réelles, datées et accompagnées de leurs conditions. Aucune remise
            n'est annoncée sans prix de référence enregistré.
          </p>
        </div>
      </section>

      <div className="container-site py-10">
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Offres indisponibles" description={error} onRetry={reload} />
        ) : promotions.length === 0 ? (
          <>
            <EmptyState
              icon="tag"
              title="Aucune opération commerciale en cours"
              description="Aucune promotion n'est active pour le moment. Nous n'affichons jamais de remise fictive, de faux prix barré ni de compte à rebours artificiel. Consultez le catalogue ou décrivez-nous votre besoin."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LinkButton to="/catalogue">Voir le catalogue</LinkButton>
                  <LinkButton to="/devis" variant="outline">
                    Demander un devis
                  </LinkButton>
                </div>
              }
            />
            <div className="mt-6">
              <Alert tone="info" title="Besoin d'un tarif négocié ?">
                Les conditions accordées aux professionnels et aux volumes sont établies au cas par cas, sur devis.
                Précisez votre activité et vos quantités dans votre demande.
              </Alert>
            </div>
          </>
        ) : (
          <div className="space-y-14">
            {grouped.map(([kind, items]) => (
              <section key={kind} aria-labelledby={`offre-${kind}`}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 id={`offre-${kind}`} className="text-2xl sm:text-3xl">
                    {PROMOTION_KIND_LABELS[kind as keyof typeof PROMOTION_KIND_LABELS] ?? 'Opérations'}
                  </h2>
                  <span className="text-sm text-ink-500">
                    {items.length} opération{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-8">
                  {items.map((promotion) => {
                    const products = (promotion.products ?? []) as (Product & { promo_price: number | null })[];
                    return (
                      <article key={promotion.id} className="card overflow-hidden">
                        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
                          {promotion.banner_image_url ? (
                            <img
                              src={promotion.banner_image_url}
                              alt=""
                              width={680}
                              height={510}
                              loading="lazy"
                              className="h-48 w-full object-cover lg:h-full"
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-800 to-brand-950 lg:h-full">
                              <Icon name="tag" size={48} className="text-brand-300" />
                            </div>
                          )}

                          <div className="p-6 lg:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="accent">{PROMOTION_KIND_LABELS[promotion.kind]}</Badge>
                              {promotion.starts_at ? (
                                <span className="text-xs text-ink-500">Depuis le {formatDate(promotion.starts_at)}</span>
                              ) : null}
                              {promotion.ends_at ? (
                                <span className="text-xs font-semibold text-accent-700">
                                  Jusqu'au {formatDate(promotion.ends_at)}
                                </span>
                              ) : (
                                <span className="text-xs text-ink-500">Sans date de fin annoncée</span>
                              )}
                            </div>

                            <h3 className="mt-3 text-2xl">{promotion.title}</h3>
                            {promotion.description ? (
                              <p className="mt-3 leading-relaxed text-ink-600">{promotion.description}</p>
                            ) : null}

                            {promotion.conditions_text ? (
                              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-600">Conditions</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{promotion.conditions_text}</p>
                              </div>
                            ) : null}

                            {products.length > 0 ? (
                              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {products.map((product) => (
                                  <ProductCard key={product.id} product={{ ...product, price_public: product.price_public }} />
                                ))}
                              </div>
                            ) : (
                              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3">
                                <Icon name="info" size={18} className="text-brand-700" />
                                <p className="text-sm text-brand-900">
                                  Cette opération s'applique sur demande. Précisez les équipements concernés dans votre
                                  demande de devis.
                                </p>
                                <LinkButton to="/devis" size="sm" variant="outline" className="ml-auto">
                                  Demander un devis
                                </LinkButton>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            <Alert tone="info" title="Transparence sur les réductions">
              Conformément aux règles applicables aux annonces de réduction de prix, toute remise affichée est calculée
              à partir d'un prix de référence enregistré. Les prix indiqués restent indicatifs : le prix définitif est
              confirmé sur devis.
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
