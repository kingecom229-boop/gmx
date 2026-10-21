import { createApp } from './app.js';
import { assertConfigured, config, hasMailer, hasSecretKey } from './config.js';
import { serviceClient } from './supabase.js';
import { processOutbox } from './quotes.js';

assertConfigured();

const app = createApp();

const server = app.listen(config.port, '0.0.0.0', () => {
  const lines = [
    '',
    '  GMX Motors — API',
    `  Environnement      : ${config.env}`,
    `  Écoute             : http://localhost:${config.port}`,
    `  CORS autorisé      : ${config.corsOrigin}`,
    `  Supabase           : ${config.supabaseUrl}`,
    `  Clé secrète        : ${hasSecretKey ? 'configurée' : 'ABSENTE — la RLS s\'applique intégralement'}`,
    `  Envoi d'e-mails    : ${hasMailer ? `Resend → ${config.mail.quoteNotificationEmail}` : 'NON CONFIGURÉ — les devis sont conservés en file'}`,
    '',
  ];
  console.info(lines.join('\n'));

  if (!hasSecretKey) {
    console.warn(
      '[gmx] SUPABASE_SECRET_KEY absente : la file d\'envoi (email_outbox) est inactive.\n' +
        '       Les demandes de devis restent enregistrées et consultables dans le back-office.',
    );
  }
  if (!hasMailer) {
    console.warn(
      '[gmx] Fournisseur d\'e-mails non configuré : aucun e-mail n\'est envoyé.\n' +
        '       Renseignez MAIL_PROVIDER=resend et RESEND_API_KEY dans .env pour activer les notifications.',
    );
  }
});

/** Reprise automatique de la file d'envoi (best effort). */
const outboxTimer = setInterval(() => {
  void processOutbox(serviceClient()).catch((error: unknown) => {
    console.error('[gmx] outbox', error instanceof Error ? error.message : error);
  });
}, 60_000);
outboxTimer.unref();

function shutdown(signal: string): void {
  console.info(`\n[gmx] ${signal} reçu — arrêt du serveur.`);
  clearInterval(outboxTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[gmx] unhandledRejection', reason instanceof Error ? reason.message : reason);
});
