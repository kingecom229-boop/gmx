import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Accordion, Badge, EmptyState, ErrorState, LinkButton, Skeleton } from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { useSettings } from '@/context/SettingsContext';
import { useApi } from '@/hooks/useApi';
import { useCategories, useFaqs, usePromotions } from '@/hooks/useCatalogue';
import { api } from '@/lib/api';
import { organizationJsonLd, faqJsonLd, useSeo } from '@/lib/seo';
import { PROMOTION_KIND_LABELS, type Category, type Faq, type Product, type Promotion } from '@shared/types';
import { formatDate } from '@/lib/format';

const CATEGORY_ICONS: Record<string, 'truck' | 'wrench' | 'leaf' | 'package' | 'gauge' | 'tag'> = {
  tracteurs: 'truck',
  machines: 'gauge',
  pieces: 'wrench',
  huiles: 'package',
  recolte: 'leaf',
  manutention: 'package',
};

function iconFor(slug: string): 'truck' | 'wrench' | 'leaf' | 'package' | 'gauge' | 'tag' {
  for (const [key, value] of Object.entries(CATEGORY_ICONS)) {
    if (slug.includes(key)) return value;
  }
  return 'tag';
}

export function HomePage(): JSX.Element {
  const { settings } = useSettings();
  const { categories, loading: categoriesLoading } = useCategories();
  const { promotions } = usePromotions();
  const { faqs, loading: faqsLoading } = useFaqs();

  const featured = useApi<{ products: Product[]; total: number }>(
    () => {
      const params = new URLSearchParams({ featured: 'true', sort: 'popularity', per_page: '8' });
      return api.products(params) as unknown as Promise<{ products: Product[]; total: number }>;
    },
    [],
  );

  const popular = useApi<{ products: Product[]; total: number }>(
    () => {
      const params = new URLSearchParams({ sort: 'popularity', per_page: '8' });
      return api.products(params) as unknown as Promise<{ products: Product[]; total: number }>;
    },
    [],
  );

  const homeCategories = useMemo(
    () => categories.filter((category: Category) => !category.parent_id).slice(0, 10),
    [categories],
  );

  const homePromotions = useMemo(
    () => promotions.filter((promotion: Promotion) => promotion.show_on_home).slice(0, 3),
    [promotions],
  );

  const visibleFaqs = faqs.slice(0, 6);
  const products = featured.data?.products?.length ? featured.data.products : (popular.data?.products ?? []);
  const productsLoading = featured.loading && popular.loading;

  const jsonLd = useMemo(() => {
    const base = organizationJsonLd(settings.brand_name, settings.contact_email);
    return visibleFaqs.length > 0 ? [base, faqJsonLd(visibleFaqs)] : base;
  }, [settings.brand_name, settings.contact_email, visibleFaqs]);

  useSeo({
    title: undefined,
    description: settings.hero_subtitle.slice(0, 155),
    path: '/',
    image: settings.hero_image,
    jsonLd,
  });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="absolute inset-0">
          {settings.hero_image ? (
            <img
              src={settings.hero_image}
              alt=""
              width={1920}
              height={1080}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover opacity-55"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-900 via-ink-900 to-ink-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-transparent" />
        </div>

        <div className="container-site relative py-20 sm:py-28 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/50 bg-ink-900/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-200 backdrop-blur">
              <Icon name="leaf" size={14} />
              Matériel agricole professionnel
            </span>

            <h1 className="mt-6 text-4xl leading-[1.05] text-white sm:text-5xl lg:text-[3.75rem]">
              {settings.hero_title}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-200">{settings.hero_subtitle}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to={settings.hero_primary_cta_url || '/catalogue'} size="lg" iconRight="arrow-right">
                {settings.hero_primary_cta_label || 'Découvrir nos équipements'}
              </LinkButton>
              <LinkButton
                to={settings.hero_secondary_cta_url || '/devis'}
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:border-white hover:text-white"
                icon="cart"
              >
                {settings.hero_secondary_cta_label || 'Demander un devis'}
              </LinkButton>
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-300">
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-brand-400" />
                Devis sans engagement
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-brand-400" />
                Aucun paiement en ligne
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-brand-400" />
                Disponibilités annoncées clairement
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="section bg-white" aria-labelledby="categories-title">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Nos univers</span>
              <h2 id="categories-title" className="mt-2 text-3xl sm:text-4xl">
                Tout l'équipement de l'exploitation
              </h2>
            </div>
            <LinkButton to="/catalogue" variant="outline" iconRight="arrow-right">
              Tout le catalogue
            </LinkButton>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : homeCategories.length === 0 ? (
            <EmptyState
              title="Catalogue en cours de constitution"
              description="Les catégories seront affichées dès que le catalogue aura été renseigné depuis l'administration."
              action={<LinkButton to="/devis">Demander un équipement spécifique</LinkButton>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {homeCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/categorie/${category.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-ink-200 bg-ink-900 no-underline"
                >
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt=""
                      width={400}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/5] w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-brand-800 to-ink-900 text-brand-200">
                      <Icon name={iconFor(category.slug)} size={44} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-[17px] leading-tight text-white">{category.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-300">
                      {category.product_count ?? 0} référence{(category.product_count ?? 0) > 1 ? 's' : ''}
                      <Icon name="arrow-right" size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* OFFRES */}
      {homePromotions.length > 0 ? (
        <section className="section bg-cream" aria-labelledby="offres-title">
          <div className="container-site">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Opérations en cours</span>
                <h2 id="offres-title" className="mt-2 text-3xl sm:text-4xl">
                  Offres du moment
                </h2>
              </div>
              <LinkButton to="/offres" variant="outline" iconRight="arrow-right">
                Toutes les offres
              </LinkButton>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {homePromotions.map((promotion) => (
                <article key={promotion.id} className="card overflow-hidden">
                  {promotion.banner_image_url ? (
                    <img
                      src={promotion.banner_image_url}
                      alt=""
                      width={640}
                      height={320}
                      loading="lazy"
                      className="aspect-[2/1] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-brand-800 to-brand-950">
                      <Icon name="tag" size={44} className="text-brand-300" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{PROMOTION_KIND_LABELS[promotion.kind]}</Badge>
                      {promotion.ends_at ? (
                        <span className="text-xs text-ink-500">Jusqu'au {formatDate(promotion.ends_at)}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-xl">{promotion.title}</h3>
                    {promotion.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">{promotion.description}</p>
                    ) : null}
                    {promotion.conditions_text ? (
                      <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
                        {promotion.conditions_text}
                      </p>
                    ) : null}
                    <LinkButton to="/offres" variant="outline" size="sm" className="mt-4" iconRight="arrow-right">
                      Voir l'offre
                    </LinkButton>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* PRODUITS */}
      <section className="section bg-white" aria-labelledby="produits-title">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Sélection</span>
              <h2 id="produits-title" className="mt-2 text-3xl sm:text-4xl">
                {featured.data?.products?.length ? 'Équipements mis en avant' : 'Équipements populaires'}
              </h2>
            </div>
            <LinkButton to="/catalogue" variant="outline" iconRight="arrow-right">
              Voir tout
            </LinkButton>
          </div>

          {featured.error && popular.error ? (
            <ErrorState
              title="Catalogue indisponible"
              description={featured.error}
              onRetry={() => {
                featured.reload();
                popular.reload();
              }}
            />
          ) : productsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="Aucun équipement publié pour le moment"
              description="Le catalogue se remplit depuis l'administration ou par import CSV. En attendant, décrivez-nous votre besoin : nous vous répondons."
              action={<LinkButton to="/devis">Demander un devis</LinkButton>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ARGUMENTS DE CONFIANCE */}
      <section className="section bg-brand-950 text-white" aria-labelledby="confiance-title">
        <div className="container-site">
          <h2 id="confiance-title" className="max-w-2xl text-3xl text-white sm:text-4xl">
            Une relation commerciale claire, du premier contact à la mise en service
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {settings.trust_points.map((point) => (
              <div key={point.title}>
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-brand-200">
                  <Icon name="shield" size={20} />
                </span>
                <h3 className="text-lg text-white">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-100/80">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* À PROPOS */}
      <section className="section bg-white" aria-labelledby="apropos-title">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <span className="eyebrow">L'entreprise</span>
            <h2 id="apropos-title" className="mt-2 text-3xl sm:text-4xl">
              {settings.about_title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-700">{settings.about_text}</p>
            <LinkButton to="/a-propos" variant="outline" className="mt-7" iconRight="arrow-right">
              En savoir plus
            </LinkButton>
          </div>
          <div className="order-1 lg:order-2">
            {settings.about_image ? (
              <img
                src={settings.about_image}
                alt="Parc de matériel agricole GMX Motors"
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
              />
            ) : (
              <div className="aspect-[4/3] w-full rounded-3xl bg-ink-100" />
            )}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="section bg-cream" aria-labelledby="process-title">
        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow justify-center">Votre demande de devis</span>
            <h2 id="process-title" className="mt-2 text-3xl sm:text-4xl">
              Quatre étapes, aucun paiement en ligne
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {settings.how_it_works.map((step, index) => (
              <li key={step.title} className="card relative p-6">
                <span className="font-display text-4xl font-bold text-brand-200">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-lg">{step.title.replace(/^\d+\.\s*/, '')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <LinkButton to="/devis" size="lg" iconRight="arrow-right">
              Composer ma demande
            </LinkButton>
          </div>
        </div>
      </section>

      {/* PROFESSIONNELS */}
      <section className="section bg-ink-950 text-white" aria-labelledby="pros-title">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow text-brand-300">Professionnels</span>
            <h2 id="pros-title" className="mt-2 text-3xl text-white sm:text-4xl">
              {settings.pros_title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-300">{settings.pros_text}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/devis" size="lg">
                Décrire mon besoin
              </LinkButton>
              {settings.contact_phone ? (
                <LinkButton
                  to={`tel:${settings.contact_phone.replace(/\s/g, '')}`}
                  size="lg"
                  variant="outline"
                  external
                  className="border-white/25 text-white hover:border-white hover:text-white"
                  icon="phone"
                >
                  {settings.contact_phone}
                </LinkButton>
              ) : (
                <LinkButton
                  to={`mailto:${settings.contact_email}`}
                  size="lg"
                  variant="outline"
                  external
                  className="border-white/25 text-white hover:border-white hover:text-white"
                  icon="mail"
                >
                  {settings.contact_email}
                </LinkButton>
              )}
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: 'truck', title: 'Exploitations agricoles', text: 'Tracteurs, travail du sol, semis, récolte.' },
              { icon: 'wrench', title: 'Entreprises de travaux agricoles', text: 'Flottes, pièces d’usure, disponibilité.' },
              { icon: 'package', title: 'Coopératives & revendeurs', text: 'Volumes, huiles, consommables, conditions.' },
              { icon: 'leaf', title: 'Particuliers exigeants', text: 'Matériel adapté aux petites surfaces.' },
            ].map((item) => (
              <li key={item.title} className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
                <Icon name={item.icon as 'truck'} size={22} className="text-brand-400" />
                <h3 className="mt-3 text-base text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm text-ink-400">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      {visibleFaqs.length > 0 ? (
        <section className="section bg-white" aria-labelledby="faq-title">
          <div className="container-site max-w-3xl">
            <div className="mb-8 text-center">
              <span className="eyebrow justify-center">Questions fréquentes</span>
              <h2 id="faq-title" className="mt-2 text-3xl sm:text-4xl">
                Ce que vous voulez savoir avant de demander
              </h2>
            </div>
            {faqsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Accordion
                items={visibleFaqs.map((faq: Faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }))}
              />
            )}
            <div className="mt-8 text-center">
              <Link to="/contact" className="inline-flex items-center gap-2 font-semibold text-brand-700">
                Une autre question ? Contactez-nous
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA FINAL */}
      <section className="bg-brand-800">
        <div className="container-site flex flex-col items-center gap-6 py-16 text-center">
          <h2 className="max-w-2xl text-3xl text-white sm:text-4xl">
            Prêt à équiper votre exploitation ?
          </h2>
          <p className="max-w-xl text-lg text-brand-100">
            Sélectionnez vos équipements, validez votre demande : un commercial revient vers vous avec les
            disponibilités, le prix définitif et les conditions de livraison.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/catalogue" size="lg" variant="secondary" icon="search">
              Parcourir le catalogue
            </LinkButton>
            <LinkButton
              to="/devis"
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:border-white hover:text-white"
              iconRight="arrow-right"
            >
              Demander un devis
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

