import { LinkButton } from '@/components/ui';
import { useSeo } from '@/lib/seo';

export function NotFoundPage(): JSX.Element {
  useSeo({
    title: 'Page introuvable',
    description: 'La page demandée est introuvable.',
    noindex: true,
  });

  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl">Cette page est introuvable</h1>
      <p className="mt-4 max-w-lg text-lg text-ink-600">
        L'adresse saisie n'existe pas ou l'équipement n'est plus publié. Le catalogue a peut-être évolué depuis votre
        visite.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <LinkButton to="/" size="lg">
          Retour à l'accueil
        </LinkButton>
        <LinkButton to="/catalogue" size="lg" variant="outline" icon="search">
          Parcourir le catalogue
        </LinkButton>
      </div>
      <p className="mt-8 text-sm text-ink-500">
        Vous cherchez un équipement précis ?{' '}
        <LinkButton to="/contact" variant="ghost" size="sm">
          Contactez-nous
        </LinkButton>
      </p>
    </div>
  );
}
