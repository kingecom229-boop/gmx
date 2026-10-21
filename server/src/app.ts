import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { publicClient } from './supabase.js';
import { catalogueRouter } from './routes/catalogue.js';
import { quotesRouter } from './routes/quotes.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const supabaseHost = config.supabaseUrl.replace(/^https?:\/\//, '').split('/')[0] || '*.supabase.co';

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:', `https://${supabaseHost}`],
          'connect-src': ["'self'", `https://${supabaseHost}`, 'https://api.resend.com'],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'object-src': ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: config.corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '128kb' }));

  // Aucune information technique dans les erreurs publiques.
  app.use((req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        // Journal volontairement minimal : pas de corps, pas de jeton.
        console.error(`[gmx] ${res.statusCode} ${req.method} ${req.path}`);
      }
    });
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'gmx-motors-api',
      env: config.env,
      mail_configured: config.mail.provider === 'resend' && config.mail.resendApiKey.length > 0,
      secret_key_configured: config.supabaseSecretKey.length > 0,
      time: new Date().toISOString(),
    });
  });

  app.use('/api', catalogueRouter);
  app.use('/api', quotesRouter);
  app.use('/api/admin', adminRouter);

  // 404 API en JSON (jamais de HTML sur /api/*).
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  /**
   * sitemap.xml généré à partir des contenus réellement publiés.
   * Aucune URL privée (administration, confirmation de devis) n'y figure.
   */
  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get('host') ?? 'localhost'}`;
    const today = new Date().toISOString().slice(0, 10);

    const [products, categories, pages] = await Promise.all([
      publicClient().from('products').select('slug, updated_at').eq('is_active', true).eq('is_archived', false),
      publicClient().from('categories').select('slug, updated_at').eq('is_active', true),
      publicClient().from('pages').select('slug, updated_at').eq('is_published', true).eq('indexable', true),
    ]);

    const escapeXml = (value: string): string =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const url = (path: string, lastmod: string, changefreq: string, priority: string): string =>
      `  <url>
    <loc>${escapeXml(origin + path)}</loc>
    <lastmod>${lastmod || today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

    const entries: string[] = [
      url('/', today, 'weekly', '1.0'),
      url('/catalogue', today, 'daily', '0.9'),
      url('/offres', today, 'daily', '0.7'),
      url('/devis', today, 'monthly', '0.8'),
      url('/contact', today, 'monthly', '0.6'),
      url('/a-propos', today, 'monthly', '0.6'),
      url('/mentions-legales', today, 'yearly', '0.3'),
      url('/confidentialite', today, 'yearly', '0.3'),
      url('/cgv', today, 'yearly', '0.3'),
      url('/livraison-garantie', today, 'monthly', '0.4'),
      ...(((categories.data ?? []) as { slug: string; updated_at: string | null }[]).map((row) =>
        url(`/categorie/${row.slug}`, (row.updated_at ?? '').slice(0, 10), 'weekly', '0.8'),
      )),
      ...(((products.data ?? []) as { slug: string; updated_at: string | null }[]).map((row) =>
        url(`/produit/${row.slug}`, (row.updated_at ?? '').slice(0, 10), 'monthly', '0.7'),
      )),
      ...(((pages.data ?? []) as { slug: string; updated_at: string | null }[]).map((row) =>
        url(`/${row.slug}`, (row.updated_at ?? '').slice(0, 10), 'monthly', '0.4'),
      )),
    ];

    res
      .set('Cache-Control', 'public, max-age=3600')
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`);
  });

  // Mode production : le serveur sert aussi le build frontend.
  const candidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, '..', '..', '..', 'dist'),
    path.resolve(__dirname, '..', 'dist'),
  ];
  const distDir = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? candidates[0];
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(
      express.static(distDir, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (/\.(js|css|woff2?|jpg|jpeg|png|webp|avif|svg)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );

    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get('*', (_req: Request, res: Response) => {
      res
        .status(503)
        .type('text/plain; charset=utf-8')
        .send('Build frontend absent. Exécutez `npm run build` puis relancez `npm start`.');
    });
  }

  // Gestionnaire d'erreurs terminal : message générique, jamais de stack.
  app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('[gmx] erreur non gérée', error instanceof Error ? error.message : error);
    if (res.headersSent) return;
    res.status(500).json({ error: 'internal_error', message: 'Une erreur est survenue. Merci de réessayer.' });
  });

  return app;
}
