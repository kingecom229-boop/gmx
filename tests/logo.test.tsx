import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from '@/components/Icon';

/**
 * Le logo est un élément de marque : son fichier source ne doit jamais être
 * remplacé par un texte de substitution, et la variante claire doit rester
 * lisible sur les fonds anthracite (en-tête d'administration, pied de page).
 */
describe('Logo GMX Motors', () => {
  it('utilise le fichier officiel sur fond clair', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'GMX Motors' })).toHaveAttribute('src', '/brand/logo.png');
  });

  it('utilise la variante claire sur fond sombre', () => {
    render(<Logo variant="light" />);
    expect(screen.getByRole('img', { name: 'GMX Motors' })).toHaveAttribute('src', '/brand/logo-light.png');
  });

  it('utilise l’emblème seul en mode compact', () => {
    render(<Logo compact />);
    expect(screen.getByRole('img', { name: 'GMX Motors' })).toHaveAttribute('src', '/brand/mark.png');
  });

  it('annonce toujours une alternative textuelle', () => {
    render(<Logo />);
    expect(screen.getByAltText('GMX Motors')).toBeInTheDocument();
  });
});
