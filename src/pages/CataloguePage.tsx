import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import {
  Breadcrumbs,
  Button,
  EmptyState,
  ErrorState,
  LinkButton,
  Pagination,
  Select,
} from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { useApi, useDebounced } from '@/hooks/useApi';
import { useBrands, useCategories } from '@/hooks/useCatalogue';
import { api } from '@/lib/api';
import { breadcrumbJsonLd, useSeo } from '@/lib/seo';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  type Brand,
  type Category,
  type Product,
} from '@shared/types';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'popularity', label: 'Popularité' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Ordre alphabétique' },
];

const PER_PAGE = 12;

export function CataloguePage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();
  const { brands } = useBrands();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const debouncedSearch = useDebounced(searchInput, 350);

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      category: searchParams.get('categorie') ?? '',
      brand: searchParams.get('marque') ?? '',
      availability: searchParams.get('disponibilite') ?? '',
      condition: searchParams.get('etat') ?? '',
      min_price: searchParams.get('prix_min') ?? '',
      max_price: searchParams.get('prix_max') ?? '',
      sort: searchParams.get('tri') ?? 'relevance',
      page: Number(searchParams.get('page') ?? '1'),
    }),
    [searchParams],
  );

  // Répercute la saisie de recherche dans l'URL (debounce + remise à page 1).
  useEffect(() => {
    if (debouncedSearch === filters.q) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setSearchParams(next, { replace: key === 'page' });
      setMobileFiltersOpen(false);
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
    setSearchInput('');
  }, [setSearchParams]);

  const result = useApi<{ products: Product[]; total: number }>(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.condition) params.set('condition', filters.condition);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    params.set('sort', filters.sort);
    params.set('page', String(filters.page));
    params.set('per_page', String(PER_PAGE));
    return api.products(params) as unknown as Promise<{ products: Product[]; total: number }>;
  }, [
    filters.q,
    filters.category,
    filters.brand,
    filters.availability,
    filters.condition,
    filters.min_price,
    filters.max_price,
    filters.sort,
    filters.page,
  ]);

  const activeCategory = categories.find((category: Category) => category.slug === filters.category);
  const activeFiltersCount =
    [filters.q, filters.category, filters.brand, filters.availability, filters.condition, filters.min_price, filters.max_price]
      .filter(Boolean).length;

  const products = result.data?.products ?? [];
  const total = result.data?.total ?? 0;

  useSeo({
    title: activeCategory ? activeCategory.name : 'Catalogue de matériel agricole',
    description:
      activeCategory?.seo_description ??
      "Tracteurs, machines agricoles, matériel de sol, semis, récolte, manutention, pièces détachées, huiles et lubrifiants. Filtrez par catégorie, marque, disponibilité et budget.",
    path: '/catalogue',
    jsonLd: breadcrumbJsonLd([
      { name: 'Accueil', path: '/' },
      { name: activeCategory?.name ?? 'Catalogue', path: '/catalogue' },
    ]),
  });

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <label htmlFor="filter-search" className="mb-2 block text-sm font-bold text-ink-900">
          Recherche
        </label>
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            id="filter-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nom, référence, modèle…"
            maxLength={120}
            className="h-10 w-full rounded-xl border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>
      </div>

      <FilterGroup title="Catégorie">
        <ul className="space-y-1">
          <li>
            <FilterRadio
              name="categorie"
              label="Toutes les catégories"
              checked={!filters.category}
              onChange={() => updateFilter('categorie', '')}
            />
          </li>
          {categories
            .filter((category: Category) => !category.parent_id)
            .map((category: Category) => (
              <li key={category.id}>
                <FilterRadio
                  name="categorie"
                  label={category.name}
                  count={category.product_count ?? 0}
                  checked={filters.category === category.slug}
                  onChange={() => updateFilter('categorie', category.slug)}
                />
              </li>
            ))}
        </ul>
      </FilterGroup>

      {brands.length > 0 ? (
        <FilterGroup title="Marque">
          <ul className="space-y-1">
            <li>
              <FilterRadio
                name="marque"
                label="Toutes les marques"
                checked={!filters.brand}
                onChange={() => updateFilter('marque', '')}
              />
            </li>
            {brands.map((brand: Brand) => (
              <li key={brand.id}>
                <FilterRadio
                  name="marque"
                  label={brand.name}
                  checked={filters.brand === brand.slug}
                  onChange={() => updateFilter('marque', brand.slug)}
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Disponibilité">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Toutes" active={!filters.availability} onClick={() => updateFilter('disponibilite', '')} />
          {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
            <FilterChip
              key={value}
              label={label}
              active={filters.availability === value}
              onClick={() => updateFilter('disponibilite', filters.availability === value ? '' : value)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="État">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Tous" active={!filters.condition} onClick={() => updateFilter('etat', '')} />
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <FilterChip
              key={value}
              label={label}
              active={filters.condition === value}
              onClick={() => updateFilter('etat', filters.condition === value ? '' : value)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Budget indicatif">
        <div className="flex items-center gap-2">
          <label htmlFor="prix-min" className="sr-only">
            Prix minimum
          </label>
          <input
            id="prix-min"
            type="number"
            min={0}
            inputMode="numeric"
            value={filters.min_price}
            onChange={(event) => updateFilter('prix_min', event.target.value)}
            placeholder="Min"
            className="h-10 w-full rounded-xl border border-ink-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
          <span className="text-ink-400">—</span>
          <label htmlFor="prix-max" className="sr-only">
            Prix maximum
          </label>
          <input
            id="prix-max"
            type="number"
            min={0}
            inputMode="numeric"
            value={filters.max_price}
            onChange={(event) => updateFilter('prix_max', event.target.value)}
            placeholder="Max"
            className="h-10 w-full rounded-xl border border-ink-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>
        <p className="mt-2 text-xs text-ink-500">
          Les équipements proposés uniquement sur devis ne sont pas filtrables par budget.
        </p>
      </FilterGroup>

      {activeFiltersCount > 0 ? (
        <Button variant="outline" block icon="close" onClick={clearFilters}>
          Réinitialiser les filtres ({activeFiltersCount})
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="bg-cream">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-site py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: 'Accueil', to: '/' },
              { label: 'Catalogue', to: '/catalogue' },
              ...(activeCategory ? [{ label: activeCategory.name }] : []),
            ]}
          />
          <h1 className="text-3xl sm:text-4xl">
            {activeCategory ? activeCategory.name : 'Catalogue de matériel agricole'}
          </h1>
          <p className="mt-3 max-w-3xl text-ink-600">
            {activeCategory?.description ??
              'Parcourez l’ensemble des équipements disponibles : tracteurs, machines, matériel de sol, semis, récolte, manutention, pièces détachées, huiles et lubrifiants.'}
          </p>
        </div>
      </div>

      <div className="container-site py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          {/* Filtres — bureau */}
          <aside className="hidden lg:block" aria-label="Filtres du catalogue">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">{filterPanel}</div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-600" aria-live="polite">
                {result.loading ? (
                  'Recherche en cours…'
                ) : (
                  <>
                    <span className="font-bold text-ink-900">{total}</span> équipement{total > 1 ? 's' : ''}
                    {activeCategory ? ` dans « ${activeCategory.name} »` : ''}
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon="list"
                  className="lg:hidden"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  Filtres{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                </Button>
                <label htmlFor="sort" className="sr-only">
                  Trier les résultats
                </label>
                <Select
                  id="sort"
                  value={filters.sort}
                  onChange={(event) => updateFilter('tri', event.target.value)}
                  options={SORT_OPTIONS}
                  className="h-10 w-[190px]"
                />
              </div>
            </div>

            {activeFiltersCount > 0 ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {filters.q ? <ActiveFilter label={`« ${filters.q} »`} onClear={() => { setSearchInput(''); updateFilter('q', ''); }} /> : null}
                {activeCategory ? (
                  <ActiveFilter label={activeCategory.name} onClear={() => updateFilter('categorie', '')} />
                ) : null}
                {filters.brand ? (
                  <ActiveFilter
                    label={brands.find((brand: Brand) => brand.slug === filters.brand)?.name ?? filters.brand}
                    onClear={() => updateFilter('marque', '')}
                  />
                ) : null}
                {filters.availability ? (
                  <ActiveFilter
                    label={AVAILABILITY_LABELS[filters.availability as keyof typeof AVAILABILITY_LABELS]}
                    onClear={() => updateFilter('disponibilite', '')}
                  />
                ) : null}
                {filters.condition ? (
                  <ActiveFilter
                    label={CONDITION_LABELS[filters.condition as keyof typeof CONDITION_LABELS]}
                    onClear={() => updateFilter('etat', '')}
                  />
                ) : null}
                {filters.min_price || filters.max_price ? (
                  <ActiveFilter
                    label={`${filters.min_price || '0'} € — ${filters.max_price || '∞'} €`}
                    onClear={() => {
                      updateFilter('prix_min', '');
                      updateFilter('prix_max', '');
                    }}
                  />
                ) : null}
              </div>
            ) : null}

            {result.error ? (
              <ErrorState title="Catalogue indisponible" description={result.error} onRetry={result.reload} />
            ) : result.loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon="search"
                title="Aucun équipement ne correspond à ces critères"
                description="Élargissez votre recherche ou réinitialisez les filtres. Vous pouvez aussi nous décrire précisément l'équipement recherché : nous vous répondons."
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" icon="refresh" onClick={clearFilters}>
                      Réinitialiser les filtres
                    </Button>
                    <LinkButton to="/devis">Demander un devis</LinkButton>
                  </div>
                }
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination
                  page={filters.page}
                  total={total}
                  perPage={PER_PAGE}
                  onChange={(page) => updateFilter('page', String(page))}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtres — mobile (panneau plein écran) */}
      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-cream lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <header className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-4">
            <h2 className="text-lg">Filtrer</h2>
            <Button variant="ghost" size="sm" icon="close" onClick={() => setMobileFiltersOpen(false)}>
              Fermer
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-6">{filterPanel}</div>
          <footer className="border-t border-ink-200 bg-white p-4">
            <Button block size="lg" onClick={() => setMobileFiltersOpen(false)}>
              Voir {result.loading ? '…' : `${total} résultat${total > 1 ? 's' : ''}`}
            </Button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function FilterGroup({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-ink-900">{title}</h2>
      {children}
    </div>
  );
}

function FilterRadio({
  name,
  label,
  checked,
  onChange,
  count,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-100">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-brand-700"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined ? <span className="text-xs text-ink-400">{count}</span> : null}
    </label>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-ink-300 bg-white text-ink-700 hover:border-brand-400'
      }`}
    >
      {label}
    </button>
  );
}

function ActiveFilter({ label, onClear }: { label: string; onClear: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 transition-colors hover:border-brand-400"
    >
      {label}
      <Icon name="close" size={12} />
      <span className="sr-only">Retirer ce filtre</span>
    </button>
  );
}

