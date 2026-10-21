import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { contactMessageSchema, newsletterSchema, quoteRequestSchema, flattenZodError } from '../../../shared/validation.js';
import { publicClient, serviceClient } from '../supabase.js';
import { clientIp, hashIp, idempotencyKey, issueFormToken, verifyFormToken } from '../security.js';
import { createQuoteRequest } from '../quotes.js';

export const quotesRouter = Router();

/**
 * Limites de débit par adresse IP.
 * Les messages restent explicites et sans détail technique exploitable.
 */
const quoteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Trop de demandes envoyées. Merci de réessayer dans quelques minutes.' },
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Trop de messages envoyés. Merci de réessayer plus tard.' },
});

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Trop de demandes. Merci de réessayer plus tard.' },
});

/**
 * Prépare une soumission : fournit le jeton de formulaire signé.
 * Un robot qui ne charge pas la page ne possède pas ce jeton.
 */
quotesRouter.get('/quotes/prepare', (_req: Request, res: Response) => {
  const token = issueFormToken();
  res.set('Cache-Control', 'no-store');
  return res.json(token);
});

quotesRouter.post('/quotes', quoteLimiter, async (req: Request, res: Response) => {
  const body: unknown = req.body;

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({ error: 'invalid_payload', message: 'Requête invalide.' });
  }

  // Garde-fou de taille : évite les corps volumineux avant même la validation.
  if (JSON.stringify(body).length > 64_000) {
    return res.status(413).json({ error: 'payload_too_large', message: 'Demande trop volumineuse.' });
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'validation_failed',
      message: 'Certains champs nécessitent une correction.',
      fields: flattenZodError(parsed.error),
    });
  }

  const data = parsed.data;

  // Champ invisible : un robot le remplit presque toujours.
  if (data.website && data.website.length > 0) {
    // Réponse volontairement identique à un succès : ne pas révéler le piège.
    return res.json({ ok: true, reference: 'GMX-000000', duplicate: true });
  }

  if (!verifyFormToken(data.form_token)) {
    return res.status(400).json({
      error: 'invalid_form_token',
      message: 'Votre session de demande a expiré. Merci de recharger la page et de recommencer.',
    });
  }

  const ipHash = hashIp(clientIp(req));
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 300) : null;

  const result = await createQuoteRequest(serviceClient(), {
    ...data,
    ip_hash: ipHash,
    user_agent: userAgent,
    idempotency_key: idempotencyKey(ipHash, {
      email: data.email.toLowerCase(),
      items: data.items.map((item) => [item.product_id, item.quantity]).sort(),
    }),
    source: data.source || 'site',
  });

  if (!result.ok) {
    return res.status(result.status).json({
      error: result.code,
      message: result.message,
      ...(result.fields ? { fields: result.fields } : {}),
    });
  }

  // 201 Created : la demande est réellement enregistrée.
  return res.status(201).json({
    ok: true,
    id: result.id,
    reference: result.reference,
    notification_status: result.notification_status,
    ack_status: result.ack_status,
    mail_configured: result.mail_configured,
    warning: result.warning ?? null,
  });
});

/* ------------------------------------------------------------------------- */
/* Formulaire de contact                                                      */
/* ------------------------------------------------------------------------- */
quotesRouter.post('/contact', contactLimiter, async (req: Request, res: Response) => {
  const parsed = contactMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'validation_failed',
      message: 'Certains champs nécessitent une correction.',
      fields: flattenZodError(parsed.error),
    });
  }
  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    return res.json({ ok: true });
  }

  const { error } = await publicClient().from('contact_messages').insert({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || null,
    subject: data.subject?.trim() || null,
    message: data.message.trim(),
    ip_hash: hashIp(clientIp(req)),
  });

  if (error) return res.status(500).json({ error: 'contact_failed', message: "L'envoi a échoué. Merci de réessayer." });
  return res.status(201).json({ ok: true });
});

/* ------------------------------------------------------------------------- */
/* Newsletter (désactivée par défaut ; activable depuis l'administration)     */
/* ------------------------------------------------------------------------- */
quotesRouter.post('/newsletter', newsletterLimiter, async (req: Request, res: Response) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'validation_failed',
      message: 'Adresse e-mail invalide.',
      fields: flattenZodError(parsed.error),
    });
  }
  const data = parsed.data;
  if (data.website && data.website.length > 0) return res.json({ ok: true });

  // Upsert : une adresse déjà enregistrée ne provoque pas d'erreur visible.
  const { error } = await publicClient().from('newsletter_subscribers').upsert(
    {
      email: data.email.trim().toLowerCase(),
      source: data.source ?? 'site',
      ip_hash: hashIp(clientIp(req)),
    },
    { onConflict: 'email', ignoreDuplicates: true },
  );

  if (error) return res.status(500).json({ error: 'newsletter_failed', message: "L'inscription a échoué. Merci de réessayer." });
  return res.status(201).json({ ok: true });
});
