import { z } from 'zod';

/**
 * Règles de validation partagées : le serveur ET le client utilisent
 * exactement les mêmes bornes, ce qui empêche toute divergence entre
 * l'affichage d'erreur et le rejet réel.
 */

export const MAX_TEXT = 5000;
export const MAX_MESSAGE = 5000;
export const MAX_ITEMS = 30;
export const MAX_NOTE = 1000;

const trimmed = (max: number) =>
  z.string().trim().min(1).max(max);

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Adresse e-mail trop courte')
  .max(254, 'Adresse e-mail trop longue')
  .email('Adresse e-mail invalide')
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v), 'Adresse e-mail invalide');

export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone trop court')
  .max(32, 'Numéro de téléphone trop long')
  .refine((v) => /^[+0-9 ()./-]{6,32}$/.test(v), 'Numéro de téléphone invalide');

export const quoteItemSchema = z
  .object({
    product_id: z.string().uuid('Identifiant de produit invalide'),
    quantity: z
      .number({ invalid_type_error: 'Quantité invalide' })
      .int('La quantité doit être un nombre entier')
      .min(1, 'La quantité minimale est de 1')
      .max(9999, 'La quantité maximale est de 9999'),
    note: z.string().trim().max(MAX_NOTE, 'Précision trop longue').optional().or(z.literal('')),
  })
  .strict();

export const quoteRequestSchema = z
  .object({
    first_name: trimmed(80).refine((v) => v.length >= 2, 'Prénom trop court'),
    last_name: trimmed(80).refine((v) => v.length >= 2, 'Nom trop court'),
    company: z.string().trim().max(120).optional().or(z.literal('')),
    email: emailSchema,
    phone: phoneSchema,
    postal_code: trimmed(12).refine((v) => v.length >= 2, 'Code postal invalide'),
    city: trimmed(80),
    project_type: z.string().trim().max(120).optional().or(z.literal('')),
    message: z.string().trim().max(MAX_MESSAGE, 'Message trop long').optional().or(z.literal('')),
    contact_preference: z.string().trim().max(60).optional().or(z.literal('')),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Vous devez accepter le traitement de vos données." }),
    }),
    items: z
      .array(quoteItemSchema)
      .min(1, 'Ajoutez au moins un équipement à votre demande')
      .max(MAX_ITEMS, `Une demande ne peut pas dépasser ${MAX_ITEMS} lignes`),
    // Piège à robots : champ invisible, doit rester vide.
    website: z.string().max(0).optional().or(z.literal('')),
    form_token: z.string().trim().max(200).optional().or(z.literal('')),
    source: z.string().trim().max(120).optional().or(z.literal('')),
  })
  .strict();

export type QuoteRequestPayload = z.infer<typeof quoteRequestSchema>;
export type QuoteItemPayload = z.infer<typeof quoteItemSchema>;

export const contactMessageSchema = z
  .object({
    name: trimmed(120),
    email: emailSchema,
    phone: z.string().trim().max(32).optional().or(z.literal('')),
    subject: z.string().trim().max(160).optional().or(z.literal('')),
    message: z.string().trim().min(10, 'Votre message est trop court').max(MAX_MESSAGE, 'Message trop long'),
    website: z.string().max(0).optional().or(z.literal('')),
  })
  .strict();

export const newsletterSchema = z
  .object({
    email: emailSchema,
    // RGPD : l'inscription à une lettre d'information repose sur le consentement.
    // Il est exigé côté serveur, pas seulement par la case à cocher du navigateur.
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Vous devez accepter de recevoir nos informations.' }),
    }),
    source: z.string().trim().max(80).optional().or(z.literal('')),
    website: z.string().max(0).optional().or(z.literal('')),
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Mot de passe requis').max(200),
  })
  .strict();

/**
 * Drapeau d'URL (`?featured=true`). `z.coerce.boolean()` transformerait la
 * chaîne « false » en `true` : on analyse explicitement les valeurs admises.
 */
const queryFlag = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'oui', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'non', 'off'].includes(text)) return false;
  return undefined;
}, z.boolean().optional());

export const productFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(160).optional(),
  brand: z.string().trim().max(160).optional(),
  availability: z.string().trim().max(60).optional(),
  condition: z.enum(['neuf', 'occasion']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).max(100000000).optional(),
  featured: queryFlag,
  on_promotion: queryFlag,
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'newest', 'popularity', 'name'])
    .default('relevance'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  per_page: z.coerce.number().int().min(1).max(48).default(12),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

/** Convertit une erreur Zod en objet de messages exploitable par le formulaire. */
export function flattenZodError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
