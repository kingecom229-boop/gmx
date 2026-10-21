import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../Icon';
import { Button, IconButton } from '../ui';
import { useSettings } from '@/context/SettingsContext';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { useCategories } from '@/hooks/useCatalogue';
import type { Category } from '@shared/types';

const MAIN_LINKS = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/offres', label: 'Offres' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
];

export function AnnouncementBar(): JSX.Element | null {
  const { settings } = useSettings();
  if (!settings.announcement_enabled || !settings.announcement_text.trim()) return null;

  const tones = {
    neutral: 'bg-ink-900 text-ink-100',
    offer: 'bg-accent-600 text-white',
    info: 'bg-brand-800 text-white',
  };

  return (
    <div className={`${tones[settings.announcement_tone] ?? tones.info}`}>
      <div className="container-site flex min-h-[42px] items-center justify-center gap-3 py-2 text-center">
        <p className="text-[13px] font-medium leading-snug sm:text-sm">{settings.announcement_text}</p>
        {settings.announcement_url ? (
          <Link
            to={settings.announcement_url}
            className="hidden shrink-0 items-center gap-1 text-[13px] font-semibold underline underline-offset-4 hover:opacity-90 sm:inline-flex"
          >
            En savoir plus
            <Icon name="arrow-right" size={14} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Header(): JSX.Element {
  const { settings } = useSettings();
  const { count, open } = useQuoteCart();
  const { categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const topLevel = useMemo(
    () => categories.filter((category: Category) => !category.parent_id).slice(0, 10),
    [categories],
  );

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    navigate(`/catalogue?q=${encodeURIComponent(value)}`);
    setTerm('');
    setSearchOpen(false);
  };

  return (
    <>
      <AnnouncementBar />

      {/* Bandeau supérieur */}
      <div className="hidden border-b border-ink-200 bg-white lg:block">
        <div className="container-site flex h-10 items-center justify-between text-[13px] text-ink-600">
          <p className="font-medium">{settings.tagline}</p>
          <div className="flex items-center gap-6">
            {settings.contact_phone ? (
              <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-ink-700 hover:text-brand-700">
                <Icon name="phone" size={14} />
                {settings.contact_phone}
              </a>
            ) : null}
            <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-1.5 text-ink-700 hover:text-brand-700">
              <Icon name="mail" size={14} />
              {settings.contact_email}
            </a>
            <Link to="/admin" className="inline-flex items-center gap-1.5 font-medium text-ink-600 hover:text-brand-700">
              <Icon name="lock" size={14} />
              Espace professionnel
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-site">
          <div className="flex h-[68px] items-center gap-3 lg:h-[78px]">
            <Link to="/" aria-label={`${settings.brand_name} — accueil`} className="shrink-0">
              <Logo compact={false} />
            </Link>

            {/* Recherche — bureau */}
            <form onSubmit={submitSearch} role="search" className="relative ml-4 hidden flex-1 lg:block">
              <label htmlFor="header-search" className="sr-only">
                Rechercher un équipement, une référence ou une marque
              </label>
              <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="header-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Rechercher un équipement, une référence…"
                maxLength={120}
                className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-11 pr-4 text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15"
              />
            </form>

            <nav aria-label="Navigation principale" className="ml-auto hidden items-center gap-1 lg:flex">
              {MAIN_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={location.pathname.startsWith(link.to) ? 'page' : undefined}
                  className={`rounded-lg px-3.5 py-2 text-[15px] font-semibold no-underline transition-colors ${
                    location.pathname.startsWith(link.to)
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
              <IconButton
                icon="search"
                label="Rechercher"
                className="lg:hidden"
                onClick={() => setSearchOpen((value) => !value)}
              />
              <button
                type="button"
                onClick={open}
                className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-brand-800 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:px-4"
              >
                <Icon name="cart" size={18} />
                <span className="hidden sm:inline">Ma demande</span>
                {count > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </button>
              <IconButton
                icon={mobileOpen ? 'close' : 'menu'}
                label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                className="lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
              />
            </div>
          </div>

          {/* Recherche mobile dépliante */}
          {searchOpen ? (
            <form onSubmit={submitSearch} role="search" className="border-t border-ink-200 py-3 lg:hidden">
              <label htmlFor="header-search-mobile" className="sr-only">
                Rechercher un équipement
              </label>
              <div className="relative">
                <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="header-search-mobile"
                  type="search"
                  autoFocus
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Rechercher…"
                  maxLength={120}
                  className="h-11 w-full rounded-xl border border-ink-300 pl-11 pr-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
            </form>
          ) : null}
        </div>
      </header>

      {/* Menu mobile plein écran */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-ink-200 px-4">
            <Logo compact />
            <IconButton icon="close" label="Fermer le menu" onClick={() => setMobileOpen(false)} />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <nav aria-label="Navigation mobile">
              <ul className="space-y-1">
                {MAIN_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center justify-between rounded-xl px-3 py-3.5 text-lg font-semibold text-ink-900 no-underline transition-colors hover:bg-ink-50"
                    >
                      {link.label}
                      <Icon name="chevron-right" size={18} className="text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {topLevel.length > 0 ? (
              <div className="mt-7">
                <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Nos univers</p>
                <ul className="grid gap-1">
                  {topLevel.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/categorie/${category.slug}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-700 no-underline transition-colors hover:bg-ink-50"
                      >
                        <Icon name="chevron-right" size={15} className="text-brand-600" />
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-ink-200 p-4">
            <Button block size="lg" icon="cart" onClick={() => { setMobileOpen(false); open(); }}>
              Ma demande de devis{count > 0 ? ` (${count})` : ''}
            </Button>
            <Link
              to="/admin"
              className="mt-2 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-ink-600 no-underline hover:text-brand-700"
            >
              <Icon name="lock" size={15} />
              Espace professionnel
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
