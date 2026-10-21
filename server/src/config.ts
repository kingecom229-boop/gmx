import 'dotenv/config';

/**
 * Configuration du serveur.
 *
 * Toute valeur lue ici reste côté serveur : rien n'est jamais exposé au
 * navigateur. Les variables préfixées VITE_ sont volontairement publiques et
 * ne doivent contenir que la clé Supabase publishable.
 */

function read(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== '') return value.trim();
  }
  return '';
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'oui', 'on'].includes(value.trim().toLowerCase());
}

export const config = {
  env: (read('NODE_ENV') || 'development') as 'development' | 'production' | 'test',
  port: Number.parseInt(read('PORT') || '8787', 10),
  corsOrigin: read('CORS_ORIGIN') || 'http://localhost:5173',

  supabaseUrl: read('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  /** Clé publique (publishable) : utilisable côté navigateur. */
  supabaseAnonKey: read('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
  /**
   * Clé secrète Supabase (service). Utilisée UNIQUEMENT par ce serveur.
   * Sans elle, le serveur retombe sur la clé publique et la RLS s'applique.
   */
  supabaseSecretKey: read('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),

  mail: {
    provider: read('MAIL_PROVIDER'),
    resendApiKey: read('RESEND_API_KEY'),
    from: read('MAIL_FROM') || 'GMX Motors <onboarding@resend.dev>',
    quoteNotificationEmail: read('QUOTE_NOTIFICATION_EMAIL') || 'gmx@gmx.com',
    sendCustomerAck: bool(process.env.MAIL_SEND_CUSTOMER_ACK, true),
  },

  security: {
    ipHashSecret: read('IP_HASH_SECRET') || 'gmx-motors-dev-ip-hash-secret',
    adminBootstrapToken: read('ADMIN_BOOTSTRAP_TOKEN'),
  },

  publicSiteUrl: read('PUBLIC_SITE_URL') || 'http://localhost:5173',
  adminPath: '/admin/devis',
} as const;

export const hasSecretKey = config.supabaseSecretKey.length > 0;
export const hasMailer =
  config.mail.provider.toLowerCase() === 'resend' && config.mail.resendApiKey.length > 0;

export function assertConfigured(): void {
  if (!config.supabaseUrl) {
    throw new Error(
      'SUPABASE_URL (ou VITE_SUPABASE_URL) est absente. Copiez .env.example vers .env et renseignez-la.',
    );
  }
  if (!config.supabaseAnonKey && !config.supabaseSecretKey) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY est absente. Copiez .env.example vers .env et renseignez la clé publishable.',
    );
  }
}
