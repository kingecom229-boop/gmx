import { api } from '@/lib/api';
import type { Brand, Category, Faq, NavigationItem, Page, Product, Promotion } from '@shared/types';
import { useApi } from './useApi';

/**
 * Lectures du catalogue public.
 * Toutes ces routes sont mises en cache côté serveur (30 s à 5 min) et sont
 * strictement en lecture seule : la RLS n'y autorise aucune écriture.
 */

export function useCategories() {
  const state = useApi<{ categories: Category[] }>(
    () => api.categories() as Promise<{ categories: Category[] }>,
    [],
  );
  return { ...state, categories: state.data?.categories ?? [] };
}

export function useBrands() {
  const state = useApi<{ brands: Brand[] }>(
    () => api.brands() as Promise<{ brands: Brand[] }>,
    [],
  );
  return { ...state, brands: state.data?.brands ?? [] };
}

export function useFaqs() {
  const state = useApi<{ faqs: Faq[] }>(() => api.faqs() as Promise<{ faqs: Faq[] }>, []);
  return { ...state, faqs: state.data?.faqs ?? [] };
}

export function useNavigation() {
  const state = useApi<{ navigation: NavigationItem[] }>(
    () => api.navigation() as Promise<{ navigation: NavigationItem[] }>,
    [],
  );
  return { ...state, navigation: state.data?.navigation ?? [] };
}

export function usePromotions() {
  const state = useApi<{ promotions: Promotion[] }>(
    () => api.promotions() as Promise<{ promotions: Promotion[] }>,
    [],
  );
  return { ...state, promotions: state.data?.promotions ?? [] };
}

export function usePage(slug: string) {
  const state = useApi<{ page: Page }>(() => api.page(slug) as Promise<{ page: Page }>, [slug]);
  return { ...state, page: state.data?.page ?? null };
}

export function useProduct(slug: string) {
  const state = useApi<{ product: Product; related: Product[] }>(
    () => api.product(slug) as Promise<{ product: Product; related: Product[] }>,
    [slug],
  );
  return {
    ...state,
    product: state.data?.product ?? null,
    related: state.data?.related ?? [],
  };
}
