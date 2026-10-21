import type { SupabaseClient } from '@supabase/supabase-js';
import { config, hasMailer } from './config.js';
import { renderQuoteAckEmail, renderQuoteNotificationEmail, sendMail, type QuoteMailData } from './mailer.js';
import { usesSecretKey } from './supabase.js';

interface DbProduct {
  id: string;
  sku: string;
  name: string;
  model: string | null;
  price_public: number | null;
  price_on_quote: boolean;
  availability: string;
  is_active: boolean;
  is_archived: boolean;
  brand?: { name: string } | null;
  category?: { name: string } | null;
}

export interface CreateQuoteResult {
  ok: true;
  id: string;
  reference: string;
  notification_status: string;
  ack_status: string;
  mail_configured: boolean;
  warning?: string;
}

export interface CreateQuoteError {
  ok: false;
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

interface ItemInput {
  product_id: string;
  quantity: number;
  note?: string;
}

interface QuoteInput {
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  phone: string;
  postal_code: string;
  city: string;
  project_type?: string;
  message?: string;
  contact_preference?: string;
  items: ItemInput[];
  ip_hash: string | null;
  user_agent: string | null;
  idempotency_key: string;
  source?: string;
}

/**
 * Enregistre une demande de devis.
 *
 * Règles de sécurité :
 *  - les produits sont RELUS en base : le prix affiché au client n'est jamais
 *    celui utilisé dans l'enregistrement ;
 *  - les lignes référencent un produit réel, actif et non archivé ;
 *  - la clé d'idempotence empêche les doublons (double-clic, renvoi réseau) ;
 *  - l'échec d'envoi d'e-mail ne fait jamais perdre la demande.
 */
export async function createQuoteRequest(
  client: SupabaseClient,
  input: QuoteInput,
): Promise<CreateQuoteResult | CreateQuoteError> {
  const productIds = [...new Set(input.items.map((item) => item.product_id))];

  const { data: products, error: productsError } = await client
    .from('products')
    .select('id, sku, name, model, price_public, price_on_quote, availability, is_active, is_archived, brand:brands(name), category:categories(name)')
    .in('id', productIds);

  if (productsError) {
    return {
      ok: false,
      status: 502,
      code: 'catalogue_unavailable',
      message: 'Le catalogue est momentanément indisponible. Merci de réessayer.',
    };
  }

  const productMap = new Map<string, DbProduct>(
    ((products ?? []) as unknown as DbProduct[]).map((product) => [product.id, product]),
  );

  interface BuiltItem {
    product_id: string;
    sku: string;
    name: string;
    quantity: number;
    note: string | null;
    unit_price_indicative: number | null;
    price_on_quote: boolean;
    product_snapshot: Record<string, unknown>;
  }

  // Une seule passe : chaque ligne doit référencer un produit réel, actif et
  // non archivé. Aucune ligne n'est acceptée sur la seule foi du navigateur.
  const validItems: BuiltItem[] = [];
  for (const item of input.items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_product',
        message: 'Un équipement de votre sélection est introuvable.',
      };
    }
    if (!product.is_active || product.is_archived) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_product',
        message: `Équipement indisponible à la demande : ${product.sku}`,
      };
    }

    validItems.push({
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: item.quantity,
      note: item.note?.trim() ? item.note.trim().slice(0, 1000) : null,
      unit_price_indicative: product.price_public,
      price_on_quote: product.price_on_quote || product.price_public === null,
      product_snapshot: {
        sku: product.sku,
        name: product.name,
        model: product.model,
        brand: product.brand?.name ?? null,
        category: product.category?.name ?? null,
        availability: product.availability,
      },
    });
  }

  // Déduplication : une demande identique existe déjà dans la fenêtre courante.
  const { data: existing } = await client
    .from('quote_requests')
    .select('id, reference, notification_status, ack_status')
    .eq('idempotency_key', input.idempotency_key)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      id: existing.id,
      reference: existing.reference ?? 'GMX-000000',
      notification_status: existing.notification_status,
      ack_status: existing.ack_status,
      mail_configured: hasMailer,
      warning: 'duplicate_detected',
    };
  }

  const { data: quote, error: quoteError } = await client
    .from('quote_requests')
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      company: input.company?.trim() ? input.company.trim() : null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      postal_code: input.postal_code.trim(),
      city: input.city.trim(),
      project_type: input.project_type?.trim() || null,
      message: input.message?.trim() || null,
      contact_preference: input.contact_preference?.trim() || null,
      consent: true,
      status: 'nouveau',
      ip_hash: input.ip_hash,
      user_agent: input.user_agent,
      idempotency_key: input.idempotency_key,
      source: input.source ?? 'site',
    })
    .select('id, reference')
    .single();

  if (quoteError || !quote) {
    return {
      ok: false,
      status: 500,
      code: 'quote_save_failed',
      message: "L'enregistrement de votre demande a échoué. Merci de réessayer.",
    };
  }

  const { error: itemsError } = await client.from('quote_items').insert(
    validItems.map((item, index) => ({
      quote_request_id: quote.id,
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      unit_price_indicative: item.unit_price_indicative,
      price_on_quote: item.price_on_quote,
      product_snapshot: item.product_snapshot,
      sort_order: index,
    })),
  );

  if (itemsError) {
    // La demande existe mais ses lignes ont échoué : on la marque en échec
    // technique plutôt que de renvoyer un succès mensonger.
    await client
      .from('quote_requests')
      .update({
        notification_status: 'echec',
        notification_error: `items_insert_failed: ${itemsError.message.slice(0, 200)}`,
      })
      .eq('id', quote.id);

    return {
      ok: false,
      status: 500,
      code: 'quote_items_failed',
      message: "L'enregistrement des équipements a échoué. Merci de réessayer.",
    };
  }

  await client.from('quote_events').insert({
    quote_request_id: quote.id,
    action: 'creation',
    detail: 'Demande reçue depuis le site',
  });

  const mailData: QuoteMailData = {
    reference: quote.reference,
    created_at: new Date().toISOString(),
    first_name: input.first_name,
    last_name: input.last_name,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone,
    postal_code: input.postal_code,
    city: input.city,
    project_type: input.project_type ?? null,
    message: input.message ?? null,
    contact_preference: input.contact_preference ?? null,
    items: validItems.map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      note: item.note,
      unit_price_indicative: item.unit_price_indicative,
      price_on_quote: item.price_on_quote,
    })),
    adminUrl: `${config.publicSiteUrl}${config.adminPath}/${quote.id}`,
  };

  const notification = {
    to: config.mail.quoteNotificationEmail,
    subject: `[GMX Motors] Demande de devis ${quote.reference ?? ''}`.trim(),
    html: renderQuoteNotificationEmail(mailData),
    replyTo: input.email,
  };
  const ack = {
    to: input.email,
    subject: `GMX Motors — accusé de réception ${quote.reference ?? ''}`.trim(),
    html: renderQuoteAckEmail(mailData),
  };

  const result = await dispatchEmails(client, quote.id, notification, ack);

  return {
    ok: true,
    id: quote.id,
    reference: quote.reference ?? 'GMX-000000',
    notification_status: result.notification,
    ack_status: result.ack,
    mail_configured: hasMailer,
    warning: result.warning,
  };
}

/**
 * Envoie (ou met en file) la notification commerciale et l'accusé de réception.
 * La demande est déjà enregistrée : un échec d'envoi ne la perd jamais.
 */
async function dispatchEmails(
  client: SupabaseClient,
  quoteId: string,
  notification: { to: string; subject: string; html: string; replyTo?: string },
  ack: { to: string; subject: string; html: string },
): Promise<{ notification: string; ack: string; warning?: string }> {
  const queueRows = [
    {
      quote_request_id: quoteId,
      kind: 'quote_notification',
      to_email: notification.to,
      subject: notification.subject,
      body_html: notification.html,
    },
    ...(config.mail.sendCustomerAck
      ? [
          {
            quote_request_id: quoteId,
            kind: 'quote_ack',
            to_email: ack.to,
            subject: ack.subject,
            body_html: ack.html,
          },
        ]
      : []),
  ];

  // Sans clé secrète, l'écriture dans email_outbox est refusée par la RLS :
  // on tente l'envoi direct, sinon on trace l'état sur la demande.
  if (usesSecretKey()) {
    const { error } = await client.from('email_outbox').insert(queueRows);
    if (!error) {
      await client
        .from('quote_requests')
        .update({ notification_status: 'en_attente', ack_status: config.mail.sendCustomerAck ? 'en_attente' : 'ignore' })
        .eq('id', quoteId);
      // Traitement immédiat (best effort) — la file assure la reprise ensuite.
      void processOutbox(client).catch(() => undefined);
      return { notification: 'en_attente', ack: config.mail.sendCustomerAck ? 'en_attente' : 'ignore' };
    }
  }

  if (!hasMailer) {
    await client
      .from('quote_requests')
      .update({
        notification_status: 'echec',
        notification_error: 'mailer_not_configured',
        ack_status: config.mail.sendCustomerAck ? 'echec' : 'ignore',
        ack_error: config.mail.sendCustomerAck ? 'mailer_not_configured' : null,
      })
      .eq('id', quoteId);
    return {
      notification: 'echec',
      ack: config.mail.sendCustomerAck ? 'echec' : 'ignore',
      warning: 'mailer_not_configured',
    };
  }

  const notifResult = await sendMail(notification);
  const ackResult = config.mail.sendCustomerAck ? await sendMail(ack) : null;

  await client
    .from('quote_requests')
    .update({
      notification_status: notifResult.ok ? 'envoye' : 'echec',
      notification_sent_at: notifResult.ok ? new Date().toISOString() : null,
      notification_error: notifResult.ok ? null : notifResult.error ?? null,
      ack_status: ackResult ? (ackResult.ok ? 'envoye' : 'echec') : 'ignore',
      ack_error: ackResult && !ackResult.ok ? ackResult.error ?? null : null,
    })
    .eq('id', quoteId);

  return {
    notification: notifResult.ok ? 'envoye' : 'echec',
    ack: ackResult ? (ackResult.ok ? 'envoye' : 'ignore') : 'ignore',
    warning: notifResult.ok ? undefined : 'notification_failed',
  };
}

/**
 * Traite la file d'envoi avec reprise exponentielle.
 * Appelé après chaque devis, au démarrage du serveur, puis toutes les minutes.
 */
export async function processOutbox(client: SupabaseClient): Promise<{ processed: number; failed: number }> {
  if (!usesSecretKey()) return { processed: 0, failed: 0 };

  const { data: rows, error } = await client
    .from('email_outbox')
    .select('id, quote_request_id, kind, to_email, subject, body_html, attempts')
    .in('status', ['en_attente', 'echec'])
    .lte('next_attempt_at', new Date().toISOString())
    .lt('attempts', 6)
    .order('next_attempt_at', { ascending: true })
    .limit(5);

  if (error || !rows || rows.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const row of rows as {
    id: string;
    quote_request_id: string | null;
    kind: string;
    to_email: string;
    subject: string;
    body_html: string;
    attempts: number;
  }[]) {
    if (!hasMailer) {
      await client
        .from('email_outbox')
        .update({
          status: 'echec',
          attempts: row.attempts + 1,
          last_error: 'mailer_not_configured',
          next_attempt_at: new Date(Date.now() + backoff(row.attempts + 1)),
        })
        .eq('id', row.id);
      failed += 1;
      continue;
    }

    const result = await sendMail({ to: row.to_email, subject: row.subject, html: row.body_html });

    if (result.ok) {
      await client
        .from('email_outbox')
        .update({ status: 'envoye', attempts: row.attempts + 1, sent_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id);
      processed += 1;
    } else {
      await client
        .from('email_outbox')
        .update({
          status: 'echec',
          attempts: row.attempts + 1,
          last_error: result.error ?? 'unknown_error',
          next_attempt_at: new Date(Date.now() + backoff(row.attempts + 1)),
        })
        .eq('id', row.id);
      failed += 1;
    }

    if (row.quote_request_id) {
      await client
        .from('quote_requests')
        .update(
          row.kind === 'quote_notification'
            ? {
                notification_status: result.ok ? 'envoye' : 'echec',
                notification_sent_at: result.ok ? new Date().toISOString() : null,
                notification_error: result.ok ? null : result.error ?? null,
              }
            : {
                ack_status: result.ok ? 'envoye' : 'echec',
                ack_error: result.ok ? null : result.error ?? null,
              },
        )
        .eq('id', row.quote_request_id);
    }
  }

  return { processed, failed };
}

function backoff(attempt: number): number {
  return Math.min(60_000 * 2 ** attempt, 30 * 60_000);
}
