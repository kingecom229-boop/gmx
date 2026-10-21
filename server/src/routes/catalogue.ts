import { Router, type Request, type Response } from 'express';
import { productFiltersSchema } from '../../../shared/validation.js';
import { loose, publicClient } from '../supabase.js';

/**
 * API publique en lecture seule.
 * Aucune écriture n'est possible ici : la RLS et ces routes sont toutes
 * orientées « select ». Les prix ne sont jamais calculés côté client.
 */

export const catalogueRouter = Router();

/** Ligne générique renvoyée par PostgREST. */
type Row = Record<string, any>;

/** Accès PostgREST à typage lâche (voir `loose()` dans supabase.ts). */
function db() {
  return loose(publicClient());
}

const PRODUCT_SELECT =
  'id, sku, slug, name, model, brand_id, category_id, subcategory_id, condition, availability, ' +
  'price_public, price_on_quote, short_description, description, specs, warranty_text, delivery_text, ' +
  'is_featured, is_active, is_archived, is_demo, view_count, popularity, seo_title, seo_description, ' +
  'published_at, created_at, updated_at, ' +
  'brand:brands(id, slug, name, logo_url, sort_order, is_active), ' +
  'category:categories(id, slug, name, parent_id, image_url), ' +
  'subcategory:categories!products_subcategory_id_fkey(id, slug, name), ' +
  'product_images(id, url, alt, sort_order, is_primary)';

const PRODUCT_DETAIL_SELECT =
  PRODUCT_SELECT + ', product_attributes(id, group_name, label, value, sort_order)';

catalogueRouter.get('/settings', async (_req: Request, res: Response) => {
  const { data, error } = await db().from('site_settings').select('key, value');
  if (error) return res.status(502).json({ error: 'settings_unavailable' });

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) settings[row.key as string] = row.value;
  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ settings });
});

catalogueRouter.get('/categories', async (_req: Request, res: Response) => {
  const { data, error } = await db()
    .from('categories')
    .select('id, slug, name, description, parent_id, image_url, sort_order, is_active, show_on_home, seo_title, seo_description')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return res.status(502).json({ error: 'categories_unavailable' });

  // Compte des produits publiés par catégorie (lecture publique uniquement).
  const { data: products } = await db()
    .from('products')
    .select('id, category_id, subcategory_id')
    .eq('is_active', true)
    .eq('is_archived', false);

  const counts = new Map<string, number>();
  for (const product of (products ?? []) as Row[]) {
    if (product.category_id) counts.set(product.category_id as string, (counts.get(product.category_id as string) ?? 0) + 1);
    if (product.subcategory_id) counts.set(product.subcategory_id as string, (counts.get(product.subcategory_id as string) ?? 0) + 1);
  }

  const categories = ((data ?? []) as Row[]).map((category) => ({
    ...category,
    product_count: counts.get(category.id as string) ?? 0,
  }));

  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ categories });
});

catalogueRouter.get('/brands', async (_req: Request, res: Response) => {
  const { data, error } = await db()
    .from('brands')
    .select('id, slug, name, logo_url, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return res.status(502).json({ error: 'brands_unavailable' });
  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ brands: data ?? [] });
});

catalogueRouter.get('/products', async (req: Request, res: Response) => {
  const parsed = productFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_filters', details: parsed.error.flatten() });
  }
  const filters = parsed.data;

  let query = db()
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('is_active', true)
    .eq('is_archived', false);

  if (filters.category) {
    const { data: cats } = await db()
      .from('categories')
      .select('id')
      .or(`slug.eq.${encodeURIComponent(filters.category)},id.eq.${encodeURIComponent(filters.category)}`);
    const ids = ((cats ?? []) as Row[]).map((c) => c.id as string);
    if (ids.length === 0) return res.json({ products: [], total: 0, page: 1, per_page: filters.per_page, facets: {} });

    // La catégorie sélectionnée inclut ses sous-catégories.
    const { data: children } = await db()
      .from('categories')
      .select('id, parent_id')
      .in('parent_id', ids);
    const allIds = [...new Set([...ids, ...((children ?? []) as Row[]).map((c) => c.id as string)])];
    query = query.or(`category_id.in.(${allIds.join(',')}),subcategory_id.in.(${allIds.join(',')})`);
  }

  if (filters.brand) {
    const { data: brands } = await db()
      .from('brands')
      .select('id')
      .or(`slug.eq.${encodeURIComponent(filters.brand)},id.eq.${encodeURIComponent(filters.brand)}`);
    const ids = ((brands ?? []) as Row[]).map((b) => b.id as string);
    if (ids.length === 0) return res.json({ products: [], total: 0, page: filters.page, per_page: filters.per_page, facets: {} });
    query = query.in('brand_id', ids);
  }

  if (filters.availability) {
    const values = filters.availability.split(',').filter((v) => v.length > 0).slice(0, 8);
    if (values.length > 0) query = query.in('availability', values);
  }
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.featured) query = query.eq('is_featured', true);
  if (filters.min_price !== undefined) query = query.gte('price_public', filters.min_price);
  if (filters.max_price !== undefined) query = query.lte('price_public', filters.max_price);

  if (filters.q) {
    const term = filters.q.replace(/[%_,()]/g, ' ').trim();
    if (term.length > 0) {
      query = query.or(
        `name.ilike.%${term}%,sku.ilike.%${term}%,model.ilike.%${term}%,short_description.ilike.%${term}%`,
      );
    }
  }

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    relevance: { column: 'popularity', ascending: false },
    popularity: { column: 'popularity', ascending: false },
    price_asc: { column: 'price_public', ascending: true },
    price_desc: { column: 'price_public', ascending: false },
    newest: { column: 'created_at', ascending: false },
    name: { column: 'name', ascending: true },
  };
  const sort = sortMap[filters.sort] ?? sortMap.relevance;

  const from = (filters.page - 1) * filters.per_page;
  const { data, error, count } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, from + filters.per_page - 1);

  if (error) return res.status(502).json({ error: 'products_unavailable' });

  // Promotions réellement actives appliquées aux produits retournés.
  const products = await attachActivePromotions(data ?? []);

  res.set('Cache-Control', 'public, max-age=30');
  return res.json({
    products,
    total: count ?? products.length,
    page: filters.page,
    per_page: filters.per_page,
  });
});

catalogueRouter.get('/products/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '').trim().slice(0, 160);
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return res.status(400).json({ error: 'invalid_slug' });

  const { data, error } = await db()
    .from('products')
    .select(PRODUCT_DETAIL_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_archived', false)
    .maybeSingle();

  if (error) return res.status(502).json({ error: 'product_unavailable' });
  if (!data) return res.status(404).json({ error: 'product_not_found' });

  const [product] = await attachActivePromotions([data]);

  // Incrémentation du compteur de vues — best effort, jamais bloquant.
  const viewBuilder = db()
    .from('products')
    .update({ view_count: (product.view_count ?? 0) + 1 })
    .eq('id', product.id);
  void Promise.resolve(viewBuilder).then(
    () => undefined,
    () => undefined,
  );

  // Produits associés : même catégorie ou même marque.
  const NIL = '00000000-0000-0000-0000-000000000000';
  const categoryId = product.category_id ?? NIL;
  const brandId = product.brand_id ?? NIL;
  let related: unknown[] = [];

  if (product.category_id || product.brand_id) {
    const { data: rel } = await db()
      .from('products')
      .select('id, slug, name, price_public, price_on_quote, availability, is_featured, popularity, product_images(url, alt, sort_order, is_primary)')
      .eq('is_active', true)
      .eq('is_archived', false)
      .neq('id', product.id)
      .or(`category_id.eq.${categoryId},brand_id.eq.${brandId}`)
      .order('popularity', { ascending: false })
      .limit(4);
    related = rel ?? [];
  }

  res.set('Cache-Control', 'public, max-age=30');
  return res.json({ product, related });
});

const PROMOTION_SELECT =
  'id, code, title, description, kind, discount_type, discount_value, starts_at, ends_at, is_active, ' +
  'banner_image_url, conditions_text, show_on_home, promotion_products(product_id, promo_price)';

catalogueRouter.get('/promotions', async (_req: Request, res: Response) => {
  // Pas de filtre SQL sur les dates : starts_at/ends_at peuvent être NULL,
  // et `lte` exclurait ces lignes. Le filtrage de validité se fait ici.
  const { data, error } = await db()
    .from('promotions')
    .select(PROMOTION_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(502).json({ error: 'promotions_unavailable' });

  const promotions = filterActive(data ?? []);

  // Récupération des produits concernés pour la page « Offres ».
  const productIds = [
    ...new Set(
      promotions.flatMap((promo) =>
        ((promo.promotion_products ?? []) as { product_id: string }[]).map((link) => link.product_id),
      ),
    ),
  ];

  let productMap = new Map<string, Record<string, unknown>>();
  if (productIds.length > 0) {
    const { data: products } = await db()
      .from('products')
      .select(
        'id, sku, slug, name, model, condition, availability, price_public, price_on_quote, ' +
          'short_description, is_featured, is_demo, popularity, ' +
          'product_images(url, alt, sort_order, is_primary)',
      )
      .in('id', productIds)
      .eq('is_active', true)
      .eq('is_archived', false);
    productMap = new Map(((products ?? []) as Row[]).map((p) => [p.id as string, p as Record<string, unknown>]));
  }

  const enriched = promotions.map((promo) => ({
    ...promo,
    products: ((promo.promotion_products ?? []) as { product_id: string; promo_price: number | null }[])
      .map((link) => {
        const product = productMap.get(link.product_id);
        return product ? { ...product, promo_price: link.promo_price } : null;
      })
      .filter(Boolean),
  }));

  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ promotions: enriched });
});

catalogueRouter.get('/faqs', async (_req: Request, res: Response) => {
  const { data, error } = await db()
    .from('faqs')
    .select('id, question, answer, category, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(502).json({ error: 'faqs_unavailable' });
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ faqs: data ?? [] });
});

catalogueRouter.get('/pages/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '').trim().slice(0, 160);
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return res.status(400).json({ error: 'invalid_slug' });

  const { data, error } = await db()
    .from('pages')
    .select('id, slug, title, content, is_published, indexable, seo_title, seo_description, updated_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) return res.status(502).json({ error: 'page_unavailable' });
  if (!data) return res.status(404).json({ error: 'page_not_found' });

  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ page: data });
});

catalogueRouter.get('/navigation', async (_req: Request, res: Response) => {
  const { data, error } = await db()
    .from('navigation_items')
    .select('id, label, url, placement, parent_id, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(502).json({ error: 'navigation_unavailable' });
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ navigation: data ?? [] });
});

/** Sitemap : liste les URLs publiques réellement présentes en base. */
catalogueRouter.get('/sitemap', async (_req: Request, res: Response) => {
  const [products, categories, pages] = await Promise.all([
    db().from('products').select('slug, updated_at').eq('is_active', true).eq('is_archived', false),
    db().from('categories').select('slug, updated_at').eq('is_active', true),
    db().from('pages').select('slug, updated_at').eq('is_published', true).eq('indexable', true),
  ]);

  res.set('Cache-Control', 'public, max-age=3600');
  return res.json({
    static: ['', 'catalogue', 'offres', 'devis', 'contact', 'mentions-legales', 'confidentialite', 'cgv', 'a-propos'],
    products: products.data ?? [],
    categories: categories.data ?? [],
    pages: pages.data ?? [],
  });
});

/* ------------------------------------------------------------------------- */

type PromotionRow = {
  id: string;
  code: string;
  title: string;
  kind: string;
  discount_type: string;
  discount_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  promotion_products?: { product_id: string; promo_price: number | null }[];
};

function filterActive(rows: unknown[]): PromotionRow[] {
  const now = Date.now();
  return (rows as PromotionRow[]).filter((promo) => {
    if (!promo.is_active) return false;
    if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return false;
    if (promo.ends_at && new Date(promo.ends_at).getTime() <= now) return false;
    return true;
  });
}

/** Attache la promotion réellement active à chaque produit. */
async function attachActivePromotions<T extends { id: string }>(
  products: T[],
): Promise<(T & { active_promotion: Record<string, unknown> | null })[]> {
  if (products.length === 0) return [];

  const ids = products.map((product) => product.id);
  const { data: links } = await db()
    .from('promotion_products')
    .select('product_id, promo_price, promotion_id, promotions(id, code, title, kind, discount_type, discount_value, starts_at, ends_at, is_active)')
    .in('product_id', ids);

  const now = Date.now();
  const byProduct = new Map<string, Record<string, unknown>>();

  for (const link of (links ?? []) as Record<string, unknown>[]) {
    const promo = link.promotions as PromotionRow | null;
    if (!promo || !promo.is_active) continue;
    if (promo.starts_at && new Date(promo.starts_at).getTime() > now) continue;
    if (promo.ends_at && new Date(promo.ends_at).getTime() <= now) continue;

    byProduct.set(link.product_id as string, {
      promotion_id: promo.id,
      code: promo.code,
      title: promo.title,
      kind: promo.kind,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      ends_at: promo.ends_at,
      promo_price: link.promo_price,
    });
  }

  return products.map((product) => ({
    ...product,
    active_promotion: byProduct.get(product.id) ?? null,
  }));
}
