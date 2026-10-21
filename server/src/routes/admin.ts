import { Router, type NextFunction, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { loose, publicClient, serviceClient, userClient, type LooseClient } from '../supabase.js';
import { processOutbox } from '../quotes.js';

/**
 * API d'administration.
 *
 * Principe : chaque requête porte le JWT Supabase de l'utilisateur connecté.
 * Le serveur vérifie ce jeton, puis exécute l'opération AVEC ce jeton.
 * C'est donc la base de données (RLS + public.is_admin()) qui décide, pas le
 * serveur : un utilisateur ordinaire ne peut rien écrire, même en forgeant
 * une requête.
 */

export const adminRouter = Router();

interface AdminRequest extends Request {
  admin?: { userId: string; email: string; role: string; client: SupabaseClient; db: LooseClient };
}

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Trop de requêtes. Merci de patienter.' },
});

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentification requise.' });
    return;
  }
  const token = header.slice(7).trim();
  if (token.length < 20 || token.length > 4000) {
    res.status(401).json({ error: 'unauthorized', message: 'Session invalide.' });
    return;
  }

  const { data, error } = await publicClient().auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'unauthorized', message: 'Session expirée. Merci de vous reconnecter.' });
    return;
  }

  const role = (data.user.app_metadata?.role as string | undefined) ?? '';
  if (role !== 'admin' && role !== 'commercial') {
    res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux administrateurs.' });
    return;
  }

  const client = userClient(token);
  req.admin = {
    userId: data.user.id,
    email: data.user.email ?? '',
    role,
    client,
    db: loose(client),
  };
  next();
}

adminRouter.use(adminLimiter);
adminRouter.use(requireAdmin);

/* ------------------------------------------------------------------------- */
/* Tableau de bord                                                            */
/* ------------------------------------------------------------------------- */
adminRouter.get('/stats', async (req: AdminRequest, res: Response) => {
  const client = req.admin!.client;

  const [quotes, quotesNew, quotesProgress, quotesClosed, productsActive, productsUnavailable, productsArchived, promoted, outbox, recent] =
    await Promise.all([
      client.from('quote_requests').select('id', { count: 'exact', head: true }),
      client.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'nouveau'),
      client
        .from('quote_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['en_cours', 'devis_prepare', 'envoye']),
      client.from('quote_requests').select('id', { count: 'exact', head: true }).in('status', ['accepte', 'refuse', 'cloture']),
      client.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_archived', false),
      client.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_archived', false).eq('availability', 'indisponible'),
      client.from('products').select('id', { count: 'exact', head: true }).eq('is_archived', true),
      client.from('promotion_products').select('promotion_id', { count: 'exact', head: true }),
      client.from('email_outbox').select('id, status', { count: 'exact' }).in('status', ['en_attente', 'echec']),
      client
        .from('quote_requests')
        .select('id, reference, first_name, last_name, company, email, city, status, notification_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  const outboxRows = (outbox.data ?? []) as { status: string }[];

  return res.json({
    quotes_total: quotes.count ?? 0,
    quotes_new: quotesNew.count ?? 0,
    quotes_in_progress: quotesProgress.count ?? 0,
    quotes_closed: quotesClosed.count ?? 0,
    products_active: productsActive.count ?? 0,
    products_unavailable: productsUnavailable.count ?? 0,
    products_archived: productsArchived.count ?? 0,
    products_promoted: promoted.count ?? 0,
    notifications_pending: outboxRows.filter((row) => row.status === 'en_attente').length,
    notifications_failed: outboxRows.filter((row) => row.status === 'echec').length,
    recent_quotes: recent.data ?? [],
  });
});

/* ------------------------------------------------------------------------- */
/* Aide à la réutilisation : liste générique                                  */
/* ------------------------------------------------------------------------- */
const LISTABLE: Record<string, { table: string; order: [string, boolean] }> = {
  quotes: { table: 'quote_requests', order: ['created_at', false] },
  products: { table: 'products', order: ['created_at', false] },
  categories: { table: 'categories', order: ['sort_order', true] },
  brands: { table: 'brands', order: ['name', true] },
  promotions: { table: 'promotions', order: ['created_at', false] },
  faqs: { table: 'faqs', order: ['sort_order', true] },
  pages: { table: 'pages', order: ['slug', true] },
  navigation: { table: 'navigation_items', order: ['sort_order', true] },
  'contact-messages': { table: 'contact_messages', order: ['created_at', false] },
  newsletter: { table: 'newsletter_subscribers', order: ['created_at', false] },
  'audit-logs': { table: 'audit_logs', order: ['created_at', false] },
  profiles: { table: 'profiles', order: ['created_at', false] },
  testimonials: { table: 'testimonials', order: ['created_at', false] },
};

const SELECTS: Record<string, string> = {
  quotes:
    'id, reference, first_name, last_name, company, email, phone, postal_code, city, project_type, status, notification_status, ack_status, notification_error, created_at, updated_at, assigned_to, internal_notes, source',
  products:
    'id, sku, slug, name, model, brand_id, category_id, subcategory_id, condition, availability, price_public, price_on_quote, short_description, description, specs, warranty_text, delivery_text, is_featured, is_active, is_archived, is_demo, view_count, popularity, seo_title, seo_description, published_at, created_at, updated_at, brand:brands(id, name), category:categories(id, name), product_images(id, url, alt, sort_order, is_primary)',
  categories: '*',
  brands: '*',
  promotions: '*, promotion_products(product_id, promo_price)',
  faqs: '*',
  pages: '*',
  navigation: '*',
  'contact-messages': 'id, name, email, phone, subject, message, status, created_at',
  newsletter: 'id, email, is_confirmed, source, created_at',
  'audit-logs': 'id, actor_id, action, entity, entity_id, payload, created_at',
  profiles: 'id, email, full_name, phone, role, is_active, last_sign_in, created_at',
  testimonials: '*',
};

adminRouter.get('/:resource', async (req: AdminRequest, res: Response) => {
  const resource = String(req.params.resource);
  const config = LISTABLE[resource];
  if (!config) return res.status(404).json({ error: 'unknown_resource' });

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const perPage = Math.min(200, Math.max(1, Number.parseInt(String(req.query.per_page ?? '25'), 10) || 25));
  const search = String(req.query.q ?? '').trim().slice(0, 120);

  let query = req.admin!.db.from(config.table)
    .select(SELECTS[resource] ?? '*', { count: 'exact' });

  if (search) {
    const safe = search.replace(/[%_,()]/g, ' ');
    if (resource === 'products') {
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
    } else if (resource === 'quotes') {
      query = query.or(`reference.ilike.%${safe}%,email.ilike.%${safe}%,last_name.ilike.%${safe}%`);
    } else if (resource === 'contact-messages') {
      query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,subject.ilike.%${safe}%`);
    } else {
      query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    }
  }

  if (req.query.status && resource === 'quotes') {
    query = query.eq('status', String(req.query.status));
  }
  if (req.query.archived !== undefined && resource === 'products') {
    query = query.eq('is_archived', String(req.query.archived) === 'true');
  }

  const from = (page - 1) * perPage;
  const { data, error, count } = await query
    .order(config.order[0], { ascending: config.order[1] })
    .range(from, from + perPage - 1);

  if (error) return res.status(400).json({ error: 'query_failed', message: 'Requête impossible avec ces paramètres.' });
  return res.json({ items: data ?? [], total: count ?? 0, page, per_page: perPage });
});

/* ------------------------------------------------------------------------- */
/* Devis                                                                      */
/* ------------------------------------------------------------------------- */
adminRouter.get('/quotes/:id', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const { data, error } = await req.admin!.db.from('quote_requests')
    .select('*, quote_items(*), quote_events(*), assigned_profile:profiles!quote_requests_assigned_to_fkey(id, full_name, email)')
    .eq('id', id)
    .maybeSingle();

  if (error) return res.status(400).json({ error: 'query_failed' });
  if (!data) return res.status(404).json({ error: 'quote_not_found' });
  return res.json({ quote: data });
});

adminRouter.patch('/quotes/:id', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const ALLOWED = ['status', 'internal_notes', 'assigned_to'] as const;
  const patch: Record<string, unknown> = {};
  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key] === '' ? null : body[key];
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'nothing_to_update' });

  const VALID_STATUS = ['nouveau', 'en_cours', 'devis_prepare', 'envoye', 'accepte', 'refuse', 'cloture'];
  if (patch.status && !VALID_STATUS.includes(String(patch.status))) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  if (typeof patch.internal_notes === 'string' && patch.internal_notes.length > 20000) {
    return res.status(400).json({ error: 'notes_too_long' });
  }

  const { data, error } = await req.admin!.db.from('quote_requests').update(patch).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: 'update_failed', message: 'Mise à jour impossible.' });

  // Aucune acceptation de devis ne déclenche de paiement : le statut est purement commercial.
  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: 'quote_update',
    entity: 'quote_requests',
    entity_id: id,
    payload: { fields: Object.keys(patch) },
  });

  return res.json({ quote: data });
});

/** Relance / renvoi de la notification commerciale. */
adminRouter.post('/quotes/:id/notify', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const client = req.admin!.client;
  const { data: quote, error } = await client
    .from('quote_requests')
    .select('id, reference, email')
    .eq('id', id)
    .maybeSingle();

  if (error || !quote) return res.status(404).json({ error: 'quote_not_found' });

  const { count } = await client.from('email_outbox').select('id', { count: 'exact', head: true }).eq('quote_request_id', id);

  await client.from('quote_requests').update({ notification_status: 'en_attente', notification_error: null }).eq('id', id);
  await client.from('email_outbox').update(
    { status: 'en_attente', next_attempt_at: new Date().toISOString(), attempts: 0, last_error: null },
  ).eq('quote_request_id', id);

  const result = await processOutbox(serviceClient());

  await client.from('quote_events').insert({
    quote_request_id: id,
    actor_id: req.admin!.userId,
    action: 'relance',
    detail: `Renvoi de la notification demandé (${count ?? 0} message(s) en file)`,
  });

  return res.json({ ok: true, queued: count ?? 0, processed: result.processed, failed: result.failed });
});

adminRouter.get('/quotes/export/csv', async (req: AdminRequest, res: Response) => {
  const { data, error } = await req.admin!.db.from('quote_requests')
    .select('reference, created_at, first_name, last_name, company, email, phone, postal_code, city, project_type, status, contact_preference, message, quote_items(sku, name, quantity, unit_price_indicative, price_on_quote)')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) return res.status(400).json({ error: 'export_failed' });

  const rows = (data ?? []) as Array<Record<string, unknown> & { quote_items?: Array<Record<string, unknown>> }>;
  const header = [
    'Référence', 'Date', 'Nom', 'Prénom', 'Société', 'E-mail', 'Téléphone', 'Code postal', 'Ville',
    'Type de projet', 'Statut', 'Contact souhaité', 'Équipements', 'Message',
  ];

  const lines = rows.map((row) => {
    const items = (row.quote_items ?? [])
      .map((item) => `${item.quantity} x ${item.name}${item.sku ? ` (${item.sku})` : ''}`)
      .join(' | ');
    return [
      row.reference, row.created_at, row.last_name, row.first_name, row.company, row.email,
      row.phone, row.postal_code, row.city, row.project_type, row.status, row.contact_preference,
      items, row.message,
    ];
  });

  return sendCsv(res, `devis-gmx-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
});

/**
 * Remplace la liste des produits rattachés à une promotion.
 * Route dédiée : une association se manipule par ensemble, pas ligne à ligne.
 */
adminRouter.put('/promotions/:id/products', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const body = (req.body ?? {}) as { product_ids?: unknown };
  if (!Array.isArray(body.product_ids)) return res.status(400).json({ error: 'invalid_payload' });

  const productIds = [...new Set(body.product_ids)]
    .filter((value): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value))
    .slice(0, 500);

  const client = req.admin!.client;

  const { error: deleteError } = await client.from('promotion_products').delete().eq('promotion_id', id);
  if (deleteError) return res.status(400).json({ error: 'update_failed', message: humanize(deleteError.message) });

  if (productIds.length > 0) {
    const { error: insertError } = await client.from('promotion_products').insert(
      productIds.map((productId) => ({ promotion_id: id, product_id: productId })),
    );
    if (insertError) return res.status(400).json({ error: 'update_failed', message: humanize(insertError.message) });
  }

  await client.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: 'promotion_products_update',
    entity: 'promotions',
    entity_id: id,
    payload: { count: productIds.length },
  });

  return res.json({ ok: true, count: productIds.length });
});

/* ------------------------------------------------------------------------- */
/* Paramètres du site (table clé/valeur)                                      */
/* ------------------------------------------------------------------------- */

const SETTING_KEYS = [
  'brand_name', 'tagline',
  'announcement_enabled', 'announcement_text', 'announcement_url', 'announcement_tone',
  'hero_title', 'hero_subtitle', 'hero_image',
  'hero_primary_cta_label', 'hero_primary_cta_url', 'hero_secondary_cta_label', 'hero_secondary_cta_url',
  'about_title', 'about_text', 'about_image', 'pros_title', 'pros_text',
  'trust_points', 'how_it_works',
  'contact_email', 'contact_phone', 'contact_address', 'contact_hours',
  'delivery_text', 'warranty_text',
  'newsletter_enabled', 'newsletter_label', 'quote_notification_email',
  'legal_company_name', 'legal_company_details', 'legal_missing_notice',
  'social_links', 'footer_text',
] as const;

/** Lit l'ensemble des paramètres. */
adminRouter.get('/settings/all', async (req: AdminRequest, res: Response) => {
  const { data, error } = await req.admin!.db.from('site_settings').select('key, value');
  if (error) return res.status(400).json({ error: 'read_failed' });

  const settings: Record<string, unknown> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) settings[row.key] = row.value;
  return res.json({ settings });
});

/** Enregistre un ensemble de paramètres (upsert par clé). */
adminRouter.put('/settings', async (req: AdminRequest, res: Response) => {
  if (req.admin!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Réservé aux administrateurs.' });
  }

  const body = req.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  if (JSON.stringify(body).length > 256_000) {
    return res.status(413).json({ error: 'payload_too_large' });
  }

  const entries = Object.entries(body as Record<string, unknown>).filter(([key]) =>
    (SETTING_KEYS as readonly string[]).includes(key),
  );
  if (entries.length === 0) return res.status(400).json({ error: 'nothing_to_update' });

  const rows = entries.map(([key, value]) => ({ key, value: value ?? null, updated_by: req.admin!.userId }));

  const { error } = await req.admin!.db.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) return res.status(400).json({ error: 'save_failed', message: humanize(error.message) });

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: 'site_settings_update',
    entity: 'site_settings',
    payload: { keys: entries.map(([key]) => key) },
  });

  return res.json({ ok: true, saved: entries.map(([key]) => key) });
});

/* ------------------------------------------------------------------------- */
/* Comptes et rôles                                                           */
/* ------------------------------------------------------------------------- */

const VALID_ROLES = ['admin', 'commercial', 'client'] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * Modifie le rôle d'un compte.
 *
 * Le rôle est écrit à DEUX endroits volontairement :
 *   1. app_metadata côté Supabase Auth (source du JWT vérifié par is_admin())
 *   2. profiles.role (lecture applicative)
 * Un seul des deux ne suffit pas : la base exige la concordance des deux.
 *
 * Cette opération nécessite la clé secrète Supabase (SUPABASE_SECRET_KEY) :
 * sans elle, l'API d'administration Auth refuse la modification.
 */
adminRouter.put('/users/:id/role', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });
  if (req.admin!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Réservé aux administrateurs.' });
  }

  const role = (req.body as { role?: string })?.role;
  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    return res.status(400).json({ error: 'invalid_role' });
  }
  if (id === req.admin!.userId) {
    return res.status(400).json({ error: 'self_demotion', message: 'Vous ne pouvez pas modifier votre propre rôle.' });
  }

  const admin = serviceClient().auth.admin;
  const { error: authError } = await admin.updateUserById(id, { app_metadata: { role } });
  if (authError) {
    return res.status(502).json({
      error: 'auth_admin_unavailable',
      message:
        "Modification impossible : SUPABASE_SECRET_KEY est absente du serveur. Renseignez-la dans .env, ou utilisez le script `npm run admin:create`.",
    });
  }

  const { error: profileError } = await req.admin!.db.from('profiles').update({ role }).eq('id', id);
  if (profileError) {
    return res.status(502).json({ error: 'profile_update_failed', message: humanize(profileError.message) });
  }

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: 'role_change',
    entity: 'profiles',
    entity_id: id,
    payload: { role },
  });

  return res.json({ ok: true, role });
});

/** Active ou désactive un compte. */
adminRouter.put('/users/:id/active', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });
  if (req.admin!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Réservé aux administrateurs.' });
  }
  if (id === req.admin!.userId) {
    return res.status(400).json({ error: 'self_deactivation', message: 'Vous ne pouvez pas désactiver votre propre compte.' });
  }

  const isActive = Boolean((req.body as { is_active?: boolean })?.is_active);
  const { error } = await req.admin!.db.from('profiles').update({ is_active: isActive }).eq('id', id);
  if (error) return res.status(400).json({ error: 'update_failed', message: humanize(error.message) });

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: isActive ? 'account_enabled' : 'account_disabled',
    entity: 'profiles',
    entity_id: id,
  });

  return res.json({ ok: true, is_active: isActive });
});

/**
 * Crée un compte (administrateur ou commercial) avec un mot de passe temporaire.
 * Le mot de passe n'est jamais journalisé ni stocké ailleurs que dans Auth.
 */
adminRouter.post('/users/invite', async (req: AdminRequest, res: Response) => {
  if (req.admin!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Réservé aux administrateurs.' });
  }

  const body = (req.body ?? {}) as { email?: string; role?: string; full_name?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = body.role as Role | undefined;
  const password = String(body.password ?? '');

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) return res.status(400).json({ error: 'invalid_role' });
  if (password.length < 12) {
    return res.status(400).json({ error: 'weak_password', message: 'Le mot de passe doit contenir au moins 12 caractères.' });
  }

  const { data, error } = await serviceClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: String(body.full_name ?? '').slice(0, 120) },
    app_metadata: { role },
  });

  if (error) {
    const alreadyExists = /already been registered|already exists/i.test(error.message);
    return res.status(alreadyExists ? 409 : 502).json({
      error: alreadyExists ? 'email_taken' : 'create_failed',
      message: alreadyExists
        ? 'Un compte existe déjà pour cette adresse.'
        : "Création impossible : SUPABASE_SECRET_KEY est absente du serveur, ou l'API Auth a refusé la demande.",
    });
  }

  await req.admin!.db.from('profiles').update({ role, full_name: String(body.full_name ?? '').slice(0, 120) || null }).eq('id', data.user.id);

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: 'account_created',
    entity: 'profiles',
    entity_id: data.user.id,
    payload: { email, role },
  });

  // Le mot de passe n'est jamais renvoyé ni journalisé.
  return res.status(201).json({ ok: true, id: data.user.id, email });
});

/* ------------------------------------------------------------------------- */
/* Catalogue : écritures                                                      */
/* ------------------------------------------------------------------------- */
const WRITABLE: Record<string, string> = {
  products: 'products',
  categories: 'categories',
  brands: 'brands',
  promotions: 'promotions',
  faqs: 'faqs',
  pages: 'pages',
  navigation: 'navigation_items',
  settings: 'site_settings',
  testimonials: 'testimonials',
};

adminRouter.post('/:resource', async (req: AdminRequest, res: Response) => {
  const table = WRITABLE[String(req.params.resource)];
  if (!table) return res.status(404).json({ error: 'unknown_resource' });

  const body = sanitizePayload(req.body);
  if (!body) return res.status(400).json({ error: 'invalid_payload' });

  const { data, error } = await req.admin!.db.from(table).insert(body).select();
  if (error) return res.status(400).json({ error: 'insert_failed', message: humanize(error.message) });

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: `${table}_insert`,
    entity: table,
    entity_id: String((Array.isArray(data) ? data[0] : data)?.id ?? ''),
  });

  return res.status(201).json({ item: Array.isArray(data) ? data[0] : data });
});

adminRouter.patch('/:resource/:id', async (req: AdminRequest, res: Response) => {
  const table = WRITABLE[String(req.params.resource)];
  if (!table) return res.status(404).json({ error: 'unknown_resource' });

  const id = String(req.params.id);
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  if (!isUuid && id.length > 80) return res.status(400).json({ error: 'invalid_id' });

  const body = sanitizePayload(req.body);
  if (!body) return res.status(400).json({ error: 'invalid_payload' });

  const { data, error } = await req.admin!.db.from(table).update(body).eq('id', id).select();
  if (error) return res.status(400).json({ error: 'update_failed', message: humanize(error.message) });

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: `${table}_update`,
    entity: table,
    entity_id: id,
    payload: { fields: Object.keys(body) },
  });

  return res.json({ item: Array.isArray(data) ? data[0] : data });
});

adminRouter.delete('/:resource/:id', async (req: AdminRequest, res: Response) => {
  const table = WRITABLE[String(req.params.resource)];
  // La suppression de devis est volontairement absente : l'archivage passe
  // par le statut, afin de conserver l'historique commercial.
  if (!table || table === 'quote_requests') return res.status(404).json({ error: 'unknown_resource' });

  const id = String(req.params.id);
  const { error } = await req.admin!.db.from(table).delete().eq('id', id);
  if (error) return res.status(400).json({ error: 'delete_failed', message: humanize(error.message) });

  await req.admin!.db.from('audit_logs').insert({
    actor_id: req.admin!.userId,
    action: `${table}_delete`,
    entity: table,
    entity_id: id,
  });

  return res.json({ ok: true });
});

/** Duplique un produit (images comprises). */
adminRouter.post('/products/:id/duplicate', async (req: AdminRequest, res: Response) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const client = req.admin!.client;
  const { data: source, error } = await client
    .from('products')
    .select('*, product_images(url, alt, sort_order, is_primary), product_attributes(group_name, label, value, sort_order)')
    .eq('id', id)
    .maybeSingle();

  if (error || !source) return res.status(404).json({ error: 'product_not_found' });

  const suffix = Date.now().toString(36).slice(-5);
  const copy = {
    ...source,
    id: undefined,
    sku: `${source.sku}-${suffix}`.slice(0, 80),
    slug: `${source.slug}-${suffix}`.slice(0, 160),
    name: `${source.name} (copie)`.slice(0, 200),
    is_active: false,
    is_archived: false,
    is_featured: false,
    published_at: null,
    created_at: undefined,
    updated_at: undefined,
    search_vector: undefined,
    view_count: 0,
  };

  const { data: created, error: insertError } = await client.from('products').insert(copy).select().single();
  if (insertError || !created) return res.status(400).json({ error: 'duplicate_failed', message: humanize(insertError?.message ?? '') });

  const images = ((source.product_images ?? []) as Array<Record<string, unknown>>).map((image) => ({
    product_id: created.id,
    url: image.url,
    alt: image.alt,
    sort_order: image.sort_order,
    is_primary: image.is_primary,
  }));
  const attributes = ((source.product_attributes ?? []) as Array<Record<string, unknown>>).map((attribute) => ({
    product_id: created.id,
    group_name: attribute.group_name,
    label: attribute.label,
    value: attribute.value,
    sort_order: attribute.sort_order,
  }));

  if (images.length > 0) await client.from('product_images').insert(images);
  if (attributes.length > 0) await client.from('product_attributes').insert(attributes);

  return res.status(201).json({ item: created });
});

adminRouter.get('/products/export/csv', async (req: AdminRequest, res: Response) => {
  const { data, error } = await req.admin!.db.from('products')
    .select('sku, name, slug, model, condition, availability, price_public, price_on_quote, short_description, description, is_featured, is_active, is_archived, is_demo, brand:brands(name), category:categories(name)')
    .order('sku', { ascending: true })
    .limit(10000);

  if (error) return res.status(400).json({ error: 'export_failed' });

  const header = [
    'sku', 'name', 'slug', 'model', 'brand', 'category', 'condition', 'availability',
    'price_public', 'price_on_quote', 'short_description', 'description',
    'is_featured', 'is_active', 'is_archived', 'is_demo',
  ];

  const lines = ((data ?? []) as Array<Record<string, unknown> & { brand?: { name: string }; category?: { name: string } }>).map((row) => [
    row.sku, row.name, row.slug, row.model, row.brand?.name ?? '', row.category?.name ?? '',
    row.condition, row.availability, row.price_public ?? '', row.price_on_quote ? 'true' : 'false',
    row.short_description, row.description,
    row.is_featured ? 'true' : 'false', row.is_active ? 'true' : 'false',
    row.is_archived ? 'true' : 'false', row.is_demo ? 'true' : 'false',
  ]);

  return sendCsv(res, `catalogue-gmx-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
});

/* ------------------------------------------------------------------------- */
/* Utilitaires                                                                */
/* ------------------------------------------------------------------------- */

/** Refuse tout corps anormalement volumineux ou non objet. */
function sanitizePayload(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const raw = JSON.stringify(body);
  if (raw.length > 512_000) return null;
  const cleaned = JSON.parse(raw) as Record<string, unknown>;
  // Jamais de champs d'identité ou de privilège injectés par le client.
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.updated_at;
  delete cleaned.search_vector;
  return cleaned;
}

function humanize(message: string): string {
  if (/duplicate key/i.test(message)) return 'Cette référence est déjà utilisée.';
  if (/violates check constraint/i.test(message)) return 'Valeur hors des limites autorisées.';
  if (/violates foreign key/i.test(message)) return 'Référence liée inexistante.';
  if (/row-level security/i.test(message)) return 'Opération refusée : privilèges insuffisants.';
  return 'Opération refusée.';
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function sendCsv(res: Response, filename: string, rows: unknown[][]): void {
  // Préfixe BOM : ouverture correcte des accents dans Excel.
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(csv);
}
