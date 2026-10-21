import { describe, expect, it } from 'vitest';
import {
  MAX_ITEMS,
  MAX_NOTE,
  contactMessageSchema,
  newsletterSchema,
  productFiltersSchema,
  quoteItemSchema,
  quoteRequestSchema,
  flattenZodError,
} from '@shared/validation';

const validItem = { product_id: '11111111-1111-4111-8111-111111111111', quantity: 2, note: 'Livraison en septembre' };

const validPayload = {
  first_name: 'Camille',
  last_name: 'Durand',
  company: 'EARL des Chênes',
  email: 'camille.durand@example.com',
  phone: '0612345678',
  postal_code: '49000',
  city: 'Angers',
  project_type: 'exploitation_laitiere',
  message: 'Je souhaite équiper mon exploitation.',
  contact_preference: 'email',
  consent: true,
  items: [validItem],
  website: '',
};

describe('quoteRequestSchema', () => {
  it('accepte une demande complète et conforme', () => {
    const result = quoteRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('refuse une demande sans consentement', () => {
    const result = quoteRequestSchema.safeParse({ ...validPayload, consent: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenZodError(result.error).consent).toBeTruthy();
    }
  });

  it('refuse une demande sans équipement sélectionné', () => {
    const result = quoteRequestSchema.safeParse({ ...validPayload, items: [] });
    expect(result.success).toBe(false);
  });

  it(`refuse plus de ${MAX_ITEMS} équipements`, () => {
    const items = Array.from({ length: MAX_ITEMS + 1 }, () => validItem);
    expect(quoteRequestSchema.safeParse({ ...validPayload, items }).success).toBe(false);
  });

  it("détecte le champ piège antispam lorsqu'il est rempli", () => {
    const result = quoteRequestSchema.safeParse({ ...validPayload, website: 'http://spam.example' });
    expect(result.success).toBe(false);
  });

  it('refuse une adresse e-mail invalide', () => {
    expect(quoteRequestSchema.safeParse({ ...validPayload, email: 'pas-un-email' }).success).toBe(false);
  });

  it('refuse un numéro de téléphone manifestement invalide', () => {
    expect(quoteRequestSchema.safeParse({ ...validPayload, phone: '123' }).success).toBe(false);
  });

  it('refuse un code postal trop court', () => {
    expect(quoteRequestSchema.safeParse({ ...validPayload, postal_code: 'A' }).success).toBe(false);
  });

  it('rejette tout champ inattendu (schema strict)', () => {
    expect(quoteRequestSchema.safeParse({ ...validPayload, is_admin: true }).success).toBe(false);
  });

  it('normalise les espaces du nom et du prénom', () => {
    const result = quoteRequestSchema.parse({ ...validPayload, first_name: '  Camille  ', last_name: ' Durand ' });
    expect(result.first_name).toBe('Camille');
    expect(result.last_name).toBe('Durand');
  });
});

describe('quoteItemSchema', () => {
  it('accepte une quantité valide', () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 1 }).success).toBe(true);
  });

  it('refuse une quantité nulle', () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false);
  });

  it('refuse une quantité excessive', () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 100000 }).success).toBe(false);
  });

  it(`refuse une note de plus de ${MAX_NOTE} caractères`, () => {
    expect(quoteItemSchema.safeParse({ ...validItem, note: 'a'.repeat(MAX_NOTE + 1) }).success).toBe(false);
  });

  it("refuse un identifiant de produit qui n'est pas un UUID", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, product_id: 'pas-un-uuid' }).success).toBe(false);
  });
});

describe('contactMessageSchema', () => {
  it('accepte un message valide', () => {
    const result = contactMessageSchema.safeParse({
      name: 'Camille Durand',
      email: 'camille@example.com',
      phone: '',
      subject: 'Question',
      message: 'Bonjour, une question sur un équipement.',
      website: '',
    });
    expect(result.success).toBe(true);
  });

  it('refuse un message vide', () => {
    expect(
      contactMessageSchema.safeParse({
        name: 'Camille',
        email: 'camille@example.com',
        phone: '',
        subject: '',
        message: '   ',
        website: '',
      }).success,
    ).toBe(false);
  });
});

describe('newsletterSchema', () => {
  it('accepte une adresse valide avec consentement', () => {
    expect(newsletterSchema.safeParse({ email: 'abonne@example.com', consent: true, website: '' }).success).toBe(true);
  });

  it('refuse sans consentement', () => {
    expect(newsletterSchema.safeParse({ email: 'abonne@example.com', consent: false, website: '' }).success).toBe(false);
  });

  it('refuse une inscription dont le champ consentement est absent', () => {
    expect(newsletterSchema.safeParse({ email: 'abonne@example.com', website: '' }).success).toBe(false);
  });
});

describe('productFiltersSchema', () => {
  it('fournit des valeurs par défaut sûres', () => {
    const result = productFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBeGreaterThan(0);
  });

  it('refuse une page négative ou un per_page hors bornes', () => {
    expect(productFiltersSchema.safeParse({ page: -5 }).success).toBe(false);
    expect(productFiltersSchema.safeParse({ per_page: 9999 }).success).toBe(false);
  });

  it('refuse un tri non prévu', () => {
    expect(productFiltersSchema.safeParse({ sort: 'DROP TABLE products' }).success).toBe(false);
  });
});
