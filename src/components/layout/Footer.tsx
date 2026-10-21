import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Logo } from '../Icon';
import { api, ApiError } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import { useCategories } from '@/hooks/useCatalogue';
import { useNavigation } from '@/hooks/useCatalogue';
import { APP_VERSION } from '@shared/version';
import type { Category } from '@shared/types';

const LEGAL_LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
  { to: '/cgv', label: 'Conditions générales' },
  { to: '/livraison-garantie', label: 'Livraison & garantie' },
];

export function Footer(): JSX.Element {
  const { settings } = useSettings();
  const { categories } = useCategories();
  const { navigation } = useNavigation();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [newsletterState, setNewsletterState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const topLevel = categories.filter((category: Category) => !category.parent_id).slice(0, 8);
  const footerLinks = navigation.filter((item) => item.placement === 'footer');

  const submitNewsletter = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !consent) return;
    setNewsletterState('loading');
    try {
      await api.submitNewsletter({ email: email.trim(), consent: true, source: 'footer' });
      setNewsletterState('done');
      setEmail('');
      setConsent(false);
    } catch (error) {
      setNewsletterState('error');
      void error;
    }
  };

  return (
    <footer className="mt-auto border-t border-ink-800 bg-ink-950 text-ink-200">
      <div className="container-site py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">
              {settings.footer_text ||
                'Distribution de matériel agricole pour les professionnels et les particuliers.'}
            </p>

            <address className="mt-6 space-y-2 text-sm not-italic text-ink-300">
              <a
                href={`mailto:${settings.contact_email}`}
                className="flex items-center gap-2.5 text-ink-200 no-underline transition-colors hover:text-white"
              >
                <Icon name="mail" size={16} className="shrink-0 text-brand-400" />
                {settings.contact_email}
              </a>
              {settings.contact_phone ? (
                <a
                  href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-ink-200 no-underline transition-colors hover:text-white"
                >
                  <Icon name="phone" size={16} className="shrink-0 text-brand-400" />
                  {settings.contact_phone}
                </a>
              ) : null}
              {settings.contact_address ? (
                <span className="flex items-start gap-2.5">
                  <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-brand-400" />
                  <span>{settings.contact_address}</span>
                </span>
              ) : null}
              {settings.contact_hours ? (
                <span className="flex items-center gap-2.5">
                  <Icon name="clock" size={16} className="shrink-0 text-brand-400" />
                  {settings.contact_hours}
                </span>
              ) : null}
            </address>

            {settings.social_links?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {settings.social_links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-200 no-underline transition-colors hover:border-brand-500 hover:text-white"
                  >
                    {link.label}
                    <Icon name="external" size={12} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Nos univers</h2>
            <ul className="mt-4 space-y-2.5">
              {topLevel.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/categorie/${category.slug}`}
                    className="text-sm text-ink-300 no-underline transition-colors hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {topLevel.length === 0 ? (
                <li className="text-sm text-ink-400">Catalogue en cours de constitution.</li>
              ) : null}
            </ul>

            {footerLinks.length > 0 ? (
              <ul className="mt-6 space-y-2.5">
                {footerLinks.map((item) => (
                  <li key={item.id}>
                    <Link to={item.url} className="text-sm text-ink-300 no-underline transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Le site</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: '/catalogue', label: 'Catalogue' },
                { to: '/offres', label: 'Offres du moment' },
                { to: '/devis', label: 'Demander un devis' },
                { to: '/a-propos', label: 'À propos' },
                { to: '/contact', label: 'Nous contacter' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-300 no-underline transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            {settings.newsletter_enabled ? (
              <>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Restez informé</h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-300">{settings.newsletter_label}</p>
                <form onSubmit={submitNewsletter} className="mt-4" noValidate>
                  <label htmlFor="footer-newsletter" className="sr-only">
                    Votre adresse e-mail
                  </label>
                  <div className="mb-3 flex items-start gap-2">
                    <input
                      id="footer-newsletter-consent"
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-600 bg-ink-900 text-brand-600 focus:ring-brand-600"
                    />
                    <label htmlFor="footer-newsletter-consent" className="text-xs leading-relaxed text-ink-300">
                      J'accepte de recevoir les informations de GMX Motors. Désinscription possible à tout moment.
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="footer-newsletter"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      maxLength={254}
                      placeholder="vous@exemple.fr"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3.5 text-sm text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                    />
                    <button
                      type="submit"
                      disabled={newsletterState === 'loading'}
                      className="h-11 shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                    >
                      {newsletterState === 'loading' ? '…' : "S'inscrire"}
                    </button>
                  </div>
                  {newsletterState === 'done' ? (
                    <p className="mt-2 text-xs font-medium text-brand-300">
                      Inscription enregistrée. Merci de votre confiance.
                    </p>
                  ) : null}
                  {newsletterState === 'error' ? (
                    <p className="mt-2 text-xs font-medium text-red-400">
                      Inscription impossible. Vérifiez l'adresse saisie.
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-ink-400">
                    Aucune donnée n'est transmise à des tiers. Désinscription possible à tout moment.
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Un projet ?</h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-300">
                  Décrivez votre besoin : un commercial vous répond avec les disponibilités, le prix définitif et les
                  conditions de livraison.
                </p>
                <Link
                  to="/devis"
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-600"
                >
                  Demander un devis
                  <Icon name="arrow-right" size={16} />
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-ink-800 pt-6">
          <nav aria-label="Liens légaux">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-xs text-ink-400 no-underline transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            © {new Date().getFullYear()} {settings.legal_company_name || settings.brand_name}. Tous droits réservés.
            {settings.legal_company_details ? ` ${settings.legal_company_details}` : ''}
          </p>
          {/* Marqueur de version : identifie la version réellement affichée. */}
          <p className="mt-1 text-[11px] font-mono text-ink-600">Version {APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}

/** Bandeau discret rappelant le modèle commercial : aucun paiement en ligne. */
export function NoPaymentNotice(): JSX.Element {
  return (
    <div className="border-t border-ink-200 bg-ink-50">
      <div className="container-site flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-ink-600">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-brand-700" />
          Aucun paiement en ligne n'est demandé. La relation commerciale se conclut après échange avec un commercial.
        </p>
        <Link to="/cgv" className="text-sm font-semibold text-brand-700">
          Conditions générales
        </Link>
      </div>
    </div>
  );
}

export function apiErrorText(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Une erreur est survenue.';
}
