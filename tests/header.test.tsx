import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/layout/Header';
import { QuoteCartProvider } from '@/context/QuoteCartContext';
import { SettingsProvider } from '@/context/SettingsContext';

/**
 * L'en-tête public a été volontairement dégraissé : la recherche ne doit plus
 * y figurer, et les quatre entrées de navigation doivent rester présentes.
 * Ces tests verrouillent ce contrat d'interface.
 */

const categories = [
  { id: 'c1', slug: 'tracteurs', name: 'Tracteurs', description: null, parent_id: null, image_url: null, sort_order: 1, is_active: true, show_on_home: true, product_count: 5 },
];

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => payload,
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/categories')) return jsonResponse({ categories });
      if (url.includes('/api/settings')) return jsonResponse({ settings: {} });
      return jsonResponse({});
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderHeader(): void {
  render(
    <MemoryRouter>
      <SettingsProvider>
        <QuoteCartProvider>
          <Header />
        </QuoteCartProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('n’affiche aucun champ de recherche dans la barre de navigation', async () => {
    renderHeader();
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument());
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('conserve les entrées principales et le bouton de devis', async () => {
    renderHeader();
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Catalogue' }).length).toBeGreaterThan(0));
    for (const label of ['Catalogue', 'Offres', 'À propos', 'Contact']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole('button', { name: /Ma demande/ }).length).toBeGreaterThan(0);
  });

  it('affiche le logo officiel comme image de marque', async () => {
    renderHeader();
    await waitFor(() => expect(screen.getByRole('img', { name: 'GMX Motors' })).toBeInTheDocument());
    expect(screen.getByRole('img', { name: 'GMX Motors' })).toHaveAttribute('src', '/brand/logo.png');
  });
});
