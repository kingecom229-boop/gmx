import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OffersPage } from '@/pages/OffersPage';
import { QuoteCartProvider } from '@/context/QuoteCartContext';

/**
 * La page Offres doit afficher les opérations réellement enregistrées en base
 * et ne jamais inventer de remise : une opération sans prix de référence est
 * présentée comme telle (« aucune remise chiffrée » n'est pas affichée comme
 * un pourcentage).
 */

const promotion = {
  id: 'p1',
  code: 'OFFRE-PRO-2026',
  title: 'Conditions professionnelles sur les équipements neufs',
  description: 'Conditions établies au cas par cas.',
  kind: 'offre_pro',
  discount_type: 'aucune',
  discount_value: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
  banner_image_url: null,
  conditions_text: 'Sur présentation du numéro SIRET.',
  show_on_home: true,
  products: [
    {
      id: 'prod-1',
      slug: 'tracteur-agricole-130-ch',
      sku: 'GMX-TRC-130',
      name: 'Tracteur agricole 130 ch',
      model: 'GMX 130',
      condition: 'neuf',
      availability: 'a_confirmer',
      price_public: 112000,
      price_on_quote: false,
      short_description: 'Tracteur 130 chevaux.',
      is_demo: false,
      product_images: [],
      promo_price: null,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ promotions: [promotion] }),
    })) as unknown as typeof fetch,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OffersPage', () => {
  it('affiche les opérations enregistrées et leurs produits', async () => {
    render(
      <MemoryRouter>
        <QuoteCartProvider>
          <OffersPage />
        </QuoteCartProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Conditions professionnelles/ })).toBeInTheDocument(),
    );
    expect(screen.getByText('Sur présentation du numéro SIRET.')).toBeInTheDocument();
    expect(screen.getAllByText('Tracteur agricole 130 ch').length).toBeGreaterThan(0);
  });

  it("n'affiche pas de remise chiffrée quand l'opération n'en a pas", async () => {
    render(
      <MemoryRouter>
        <QuoteCartProvider>
          <OffersPage />
        </QuoteCartProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/Conditions professionnelles/)).toBeInTheDocument());
    expect(screen.queryByText(/^−\d+%$/)).not.toBeInTheDocument();
  });
});
