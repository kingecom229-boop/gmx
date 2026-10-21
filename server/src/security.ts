import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Utilitaires de sécurité côté serveur.
 *  - hachage des adresses IP (RGPD : minimisation, aucune IP en clair)
 *  - jetons de formulaire signés (HMAC) limitant les soumissions automatisées
 *  - clé d'idempotence stable pour éviter les devis doublons
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function sign(payload: string): string {
  return crypto.createHmac('sha256', config.security.ipHashSecret).update(payload).digest('base64url');
}

/** Hash irréversible de l'adresse IP, salé. Aucune IP en clair en base. */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const cleaned = ip.split(',')[0]?.trim();
  if (!cleaned) return null;
  return crypto
    .createHmac('sha256', config.security.ipHashSecret)
    .update(`ip:${cleaned}`)
    .digest('hex')
    .slice(0, 32);
}

/** Adresse IP du client en tenant compte des proxies de confiance. */
export function clientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.ip;
}

/**
 * Jeton de formulaire signé. Le navigateur doit d'abord appeler
 * GET /api/quotes/prepare : un robot qui ne charge pas la page ne l'obtient pas.
 */
export function issueFormToken(): { token: string; expires_at: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  return { token: `${payload}.${sign(payload)}`, expires_at: expiresAt };
}

export function verifyFormToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Date.now();
}

/**
 * Clé d'idempotence : même visiteur + mêmes lignes dans la même fenêtre
 * = même devis. Empêche les doublons causés par un double-clic ou un renvoi.
 */
export function idempotencyKey(ipHash: string | null, payload: unknown): string {
  const window = Math.floor(Date.now() / (10 * 60 * 1000)); // fenêtre de 10 minutes
  const raw = JSON.stringify(payload) + `|${ipHash ?? 'anon'}|${window}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Échappement HTML strict : empêche toute injection dans les e-mails rendus. */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Neutralise toute tentative d'injection d'en-têtes d'e-mail :
 * aucun retour chariot issu d'une saisie utilisateur ne peut devenir un en-tête.
 */
export function sanitizeHeader(input: unknown): string {
  return String(input ?? '')
    .replace(/[\r\n\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
