import { config, hasMailer } from './config.js';
import { escapeHtml, sanitizeHeader } from './security.js';

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface MailResult {
  ok: boolean;
  provider: string;
  error?: string;
  id?: string;
}

/**
 * Envoi transactionnel.
 *
 * Aucun fournisseur configuré  -> `ok: false` avec `error: 'mailer_not_configured'`.
 * Le devis reste enregistré : la notification est conservée dans `email_outbox`
 * et renvoyée automatiquement dès que le fournisseur est disponible.
 */
export async function sendMail(mail: MailPayload): Promise<MailResult> {
  if (!hasMailer) {
    return { ok: false, provider: 'none', error: 'mailer_not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.mail.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.mail.from,
        to: [sanitizeHeader(mail.to)],
        subject: sanitizeHeader(mail.subject),
        html: mail.html,
        ...(mail.replyTo ? { reply_to: sanitizeHeader(mail.replyTo) } : {}),
      }),
      signal: controller.signal,
    });

    const body = (await response.text()).slice(0, 500);
    if (!response.ok) {
      return {
        ok: false,
        provider: 'resend',
        error: `http_${response.status}: ${body.replace(/\s+/g, ' ')}`,
      };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(body) as { id?: string }).id;
    } catch {
      /* corps non JSON : non bloquant */
    }
    return { ok: true, provider: 'resend', id };
  } catch (error) {
    return {
      ok: false,
      provider: 'resend',
      error: error instanceof Error ? error.message.slice(0, 300) : 'unknown_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------------- */
/* Rendu des e-mails                                                          */
/* ------------------------------------------------------------------------- */

export interface QuoteMailData {
  reference: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string;
  phone: string;
  postal_code: string;
  city: string;
  project_type: string | null;
  message: string | null;
  contact_preference: string | null;
  items: {
    name: string;
    sku: string | null;
    quantity: number;
    note: string | null;
    unit_price_indicative: number | null;
    price_on_quote: boolean;
  }[];
  adminUrl: string;
}

function money(value: number | null, onQuote: boolean): string {
  if (onQuote || value === null) return 'Sur devis';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function layout(title: string, inner: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f2f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171b1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f1;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e1e4e3;border-radius:12px;overflow:hidden;">
<tr><td style="background:#16351f;padding:22px 28px;">
  <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:.04em;color:#ffffff;text-transform:uppercase;">GMX&nbsp;Motors</span>
  <div style="font-size:12px;color:#bedcc4;margin-top:4px;">Matériel agricole professionnel</div>
</td></tr>
<tr><td style="padding:28px;">
  <h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#16351f;">${escapeHtml(title)}</h1>
  ${inner}
</td></tr>
<tr><td style="background:#f6f7f7;padding:16px 28px;font-size:11px;color:#5b6462;line-height:1.6;">
  GMX Motors — distribution de matériel agricole.<br>
  Cet e-mail a été généré automatiquement à la suite d'une demande déposée sur le site.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function rowStyle(last = false): string {
  return `padding:10px 12px;border-bottom:${last ? '0' : '1px solid #e1e4e3'};font-size:13px;vertical-align:top;`;
}

/** E-mail commercial reçu par gmx@gmx.com */
export function renderQuoteNotificationEmail(data: QuoteMailData): string {
  const items = data.items
    .map(
      (item, index) => `<tr>
        <td style="${rowStyle(index === data.items.length - 1)}">${escapeHtml(item.name)}${
          item.sku ? `<div style="color:#5b6462;font-size:11px;margin-top:2px;">Réf. ${escapeHtml(item.sku)}</div>` : ''
        }${item.note ? `<div style="color:#5b6462;font-size:11px;margin-top:4px;font-style:italic;">« ${escapeHtml(item.note)} »</div>` : ''}</td>
        <td style="${rowStyle(index === data.items.length - 1)}text-align:center;">${escapeHtml(item.quantity)}</td>
        <td style="${rowStyle(index === data.items.length - 1)}text-align:right;">${escapeHtml(
          money(item.unit_price_indicative, item.price_on_quote),
        )}</td>
      </tr>`,
    )
    .join('');

  const inner = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;background:#f2f8f3;border:1px solid #bedcc4;border-radius:8px;">
    <tr>
      <td style="padding:14px 16px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#2c6b3f;">Numéro de demande</div>
        <div style="font-size:20px;font-weight:700;color:#16351f;margin-top:2px;">${escapeHtml(data.reference ?? '—')}</div>
        <div style="font-size:12px;color:#5b6462;margin-top:6px;">Reçue le ${new Date(data.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</div>
      </td>
    </tr>
  </table>

  <h2 style="font-size:14px;margin:0 0 10px;color:#16351f;">Coordonnées du prospect</h2>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e1e4e3;border-radius:8px;margin-bottom:20px;">
    <tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>Nom</strong> — ${escapeHtml(data.first_name)} ${escapeHtml(data.last_name)}</td></tr>
    ${data.company ? `<tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>Société</strong> — ${escapeHtml(data.company)}</td></tr>` : ''}
    <tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>E-mail</strong> — ${escapeHtml(data.email)}</td></tr>
    <tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>Téléphone</strong> — ${escapeHtml(data.phone)}</td></tr>
    <tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>Localisation</strong> — ${escapeHtml(data.postal_code)} ${escapeHtml(data.city)}</td></tr>
    ${data.contact_preference ? `<tr><td style="padding:10px 14px;border-bottom:1px solid #e1e4e3;font-size:13px;"><strong>Contact souhaité</strong> — ${escapeHtml(data.contact_preference)}</td></tr>` : ''}
    ${data.project_type ? `<tr><td style="padding:10px 14px;font-size:13px;"><strong>Projet</strong> — ${escapeHtml(data.project_type)}</td></tr>` : ''}
  </table>

  <h2 style="font-size:14px;margin:0 0 10px;color:#16351f;">Équipements demandés</h2>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e1e4e3;border-radius:8px;margin-bottom:20px;">
    <tr style="background:#f6f7f7;">
      <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6462;border-bottom:1px solid #e1e4e3;">Équipement</th>
      <th align="center" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6462;border-bottom:1px solid #e1e4e3;">Qté</th>
      <th align="right" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6462;border-bottom:1px solid #e1e4e3;">Prix indicatif</th>
    </tr>
    ${items}
  </table>

  ${data.message ? `<h2 style="font-size:14px;margin:0 0 10px;color:#16351f;">Message du client</h2>
  <div style="border-left:3px solid #3d8651;background:#f6f7f7;padding:12px 16px;font-size:13px;line-height:1.6;margin-bottom:20px;white-space:pre-wrap;">${escapeHtml(data.message)}</div>` : ''}

  <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#3a413f;">
    Les prix mentionnés sont indicatifs et ne constituent pas une offre contractuelle.
  </p>
  <p style="margin:0;">
    <a href="${escapeHtml(data.adminUrl)}" style="display:inline-block;background:#16351f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:13px;font-weight:600;">Ouvrir la demande dans le back-office</a>
  </p>`;

  return layout(`Nouvelle demande de devis ${data.reference ?? ''}`, inner);
}

/** Accusé de réception envoyé au client */
export function renderQuoteAckEmail(data: QuoteMailData): string {
  const list = data.items
    .map(
      (item) => `<li style="font-size:13px;line-height:1.7;">${escapeHtml(item.name)} — quantité ${escapeHtml(item.quantity)}${
        item.sku ? ` <span style="color:#5b6462;">(réf. ${escapeHtml(item.sku)})</span>` : ''
      }</li>`,
    )
    .join('');

  const inner = `
  <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
    Bonjour ${escapeHtml(data.first_name)},<br><br>
    nous avons bien reçu votre demande de devis. Un commercial GMX Motors revient vers vous
    pour confirmer les disponibilités, le prix définitif, les conditions de livraison et les
    modalités de vente.
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;background:#f2f8f3;border:1px solid #bedcc4;border-radius:8px;">
    <tr><td style="padding:14px 16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#2c6b3f;">Votre numéro de demande</div>
      <div style="font-size:20px;font-weight:700;color:#16351f;margin-top:2px;">${escapeHtml(data.reference ?? '—')}</div>
      <div style="font-size:12px;color:#5b6462;margin-top:6px;">Conservez-le : il identifie votre dossier lors de nos échanges.</div>
    </td></tr>
  </table>
  <h2 style="font-size:14px;margin:0 0 8px;color:#16351f;">Rappel de votre sélection</h2>
  <ul style="margin:0 0 20px;padding-left:18px;">${list}</ul>
  <p style="font-size:13px;line-height:1.7;margin:0 0 16px;color:#3a413f;">
    Ce message est un accusé de réception : il ne vaut ni engagement, ni confirmation de prix.
    Aucun paiement n'a été demandé ni effectué.
  </p>
  <p style="font-size:13px;line-height:1.7;margin:0;color:#3a413f;">
    Une question&nbsp;? Répondez simplement à cet e-mail.
  </p>`;

  return layout('Votre demande de devis a bien été reçue', inner);
}
