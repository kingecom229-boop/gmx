/**
 * Couche d'accès aux données du frontend.
 *
 * Toutes les requêtes passent par `/api` (même origine en production, proxy
 * Vite en développement). Aucune clé secrète n'est manipulée ici : la seule
 * clé embarquée dans le bundle est la clé Supabase publishable, utilisée
 * uniquement pour l'authentification.
 */

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let accessToken: string | null = null;

/** Le jeton de session est posé par AuthContext après connexion. */
export function setApiToken(token: string | null): void {
  accessToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal, raw = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (raw) return response as unknown as T;

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as Record<string, unknown>)
    : {};

  if (!response.ok) {
    throw new ApiError(
      response.status,
      String(payload.error ?? 'request_failed'),
      String(payload.message ?? "La requête n'a pas abouti."),
      payload.fields as Record<string, string> | undefined,
    );
  }

  return payload as T;
}

/* ------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* ------------------------------------------------------------------------- */

export interface ProductsResponse<T> {
  products: T[];
  total: number;
  page: number;
  per_page: number;
}

export const api = {
  health: () => request<{ ok: boolean; mail_configured: boolean }>('/health'),
  settings: () => request<{ settings: Record<string, unknown> }>('/settings'),
  categories: () => request<{ categories: unknown[] }>('/categories'),
  brands: () => request<{ brands: unknown[] }>('/brands'),
  products: (query: URLSearchParams) => request<ProductsResponse<unknown>>(`/products?${query.toString()}`),
  product: (slug: string) => request<{ product: unknown; related: unknown[] }>(`/products/${encodeURIComponent(slug)}`),
  promotions: () => request<{ promotions: unknown[] }>('/promotions'),
  faqs: () => request<{ faqs: unknown[] }>('/faqs'),
  page: (slug: string) => request<{ page: unknown }>(`/pages/${encodeURIComponent(slug)}`),
  navigation: () => request<{ navigation: unknown[] }>('/navigation'),
  sitemap: () => request<Record<string, unknown>>('/sitemap'),

  quotePrepare: () => request<{ token: string; expires_at: number }>('/quotes/prepare'),
  submitQuote: (body: unknown) =>
    request<{
      ok: boolean;
      reference: string;
      notification_status: string;
      ack_status: string;
      mail_configured: boolean;
      warning: string | null;
    }>('/quotes', { method: 'POST', body }),
  submitContact: (body: unknown) => request<{ ok: boolean }>('/contact', { method: 'POST', body }),
  submitNewsletter: (body: unknown) => request<{ ok: boolean }>('/newsletter', { method: 'POST', body }),

  /* Administration — le jeton de session est transmis, la RLS décide. */
  admin: {
    stats: () => request<Record<string, unknown>>('/admin/stats', { auth: true }),
    list: (resource: string, params: URLSearchParams = new URLSearchParams()) =>
      request<{ items: unknown[]; total: number; page: number; per_page: number }>(
        `/admin/${resource}?${params.toString()}`,
        { auth: true },
      ),
    get: (resource: string, id: string) => request<Record<string, unknown>>(`/admin/${resource}/${encodeURIComponent(id)}`, { auth: true }),
    create: (resource: string, body: unknown) =>
      request<{ item: unknown }>(`/admin/${resource}`, { method: 'POST', body, auth: true }),
    update: (resource: string, id: string, body: unknown) =>
      request<{ item: unknown }>(`/admin/${resource}/${encodeURIComponent(id)}`, { method: 'PATCH', body, auth: true }),
    remove: (resource: string, id: string) =>
      request<{ ok: boolean }>(`/admin/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
    duplicateProduct: (id: string) =>
      request<{ item: unknown }>(`/admin/products/${encodeURIComponent(id)}/duplicate`, { method: 'POST', auth: true }),
    quoteDetail: (id: string) => request<{ quote: unknown }>(`/admin/quotes/${encodeURIComponent(id)}`, { auth: true }),
    quoteUpdate: (id: string, body: unknown) =>
      request<{ quote: unknown }>(`/admin/quotes/${encodeURIComponent(id)}`, { method: 'PATCH', body, auth: true }),
    quoteNotify: (id: string) =>
      request<{ ok: boolean; queued: number }>(`/admin/quotes/${encodeURIComponent(id)}/notify`, { method: 'POST', auth: true }),
    setPromotionProducts: (promotionId: string, productIds: string[]) =>
      request<{ ok: boolean; count: number }>(`/admin/promotions/${encodeURIComponent(promotionId)}/products`, {
        method: 'PUT',
        body: { product_ids: productIds },
        auth: true,
      }),
    allSettings: () => request<{ settings: Record<string, unknown> }>('/admin/settings/all', { auth: true }),
    saveSettings: (settings: Record<string, unknown>) =>
      request<{ ok: boolean; saved: string[] }>('/admin/settings', { method: 'PUT', body: settings, auth: true }),
    changeRole: (userId: string, role: string) =>
      request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PUT',
        body: { role },
        auth: true,
      }),
    setActive: (userId: string, isActive: boolean) =>
      request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}/active`, {
        method: 'PUT',
        body: { is_active: isActive },
        auth: true,
      }),
    inviteUser: (payload: { email: string; role: string; full_name?: string; password: string }) =>
      request<{ ok: boolean; id: string; email: string }>('/admin/users/invite', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
  },

  /** Téléchargements authentifiés (exports CSV). */
  adminDownload: async (path: string, filename: string): Promise<void> => {
    const response = await fetch(`${BASE}${path}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, 'download_failed', "L'export a échoué.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
