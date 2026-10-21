import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Icon, Logo, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useQuoteCart } from '@/context/QuoteCartContext';

const NAV: { to: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { to: '/admin', label: 'Tableau de bord', icon: 'chart' },
  { to: '/admin/devis', label: 'Demandes de devis', icon: 'inbox' },
  { to: '/admin/produits', label: 'Produits', icon: 'package' },
  { to: '/admin/catalogue', label: 'Catégories & marques', icon: 'grid' },
  { to: '/admin/promotions', label: 'Promotions', icon: 'tag' },
  { to: '/admin/contenu', label: 'Contenu & SEO', icon: 'file' },
  { to: '/admin/parametres', label: 'Paramètres du site', icon: 'settings' },
  { to: '/admin/messages', label: 'Messages reçus', icon: 'mail' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'user', adminOnly: true },
  { to: '/admin/journal', label: "Journal d'audit", icon: 'shield', adminOnly: true },
];

export function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const { user, role, signOut } = useAuth();
  const { close } = useQuoteCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.adminOnly || role === 'admin');

  const nav = (
    <nav aria-label="Navigation administration" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/admin'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold no-underline transition-colors ${
              isActive ? 'bg-brand-800 text-white' : 'text-ink-300 hover:bg-ink-800 hover:text-white'
            }`
          }
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-ink-800 p-3">
      <NavLink
        to="/admin/compte"
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
            isActive ? 'bg-ink-800' : 'hover:bg-ink-800'
          }`
        }
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
          {(user?.email ?? '?').slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{user?.email}</span>
          <span className="block text-xs capitalize text-ink-400">{role}</span>
        </span>
      </NavLink>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate('/admin/login', { replace: true });
        }}
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-300 transition-colors hover:bg-ink-800 hover:text-white"
      >
        <Icon name="logout" size={18} />
        Se déconnecter
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-100">
      {/* Barre latérale — bureau */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-950 lg:flex">
        <div className="border-b border-ink-800 px-4 py-4">
          <Link to="/admin" className="no-underline">
            <Logo variant="light" compact />
          </Link>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Administration</p>
        </div>
        {nav}
        {userBlock}
      </aside>

      {/* Barre latérale — mobile */}
      {open ? (
        <div className="fixed inset-0 z-[70] flex lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="relative flex w-72 flex-col bg-ink-950">
            <div className="flex items-center justify-between border-b border-ink-800 px-4 py-4">
              <Logo variant="light" compact />
              <IconButton icon="close" label="Fermer le menu" onClick={() => setOpen(false)} className="text-ink-300" />
            </div>
            {nav}
            {userBlock}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:px-6">
          <IconButton icon="menu" label="Ouvrir le menu" className="lg:hidden" onClick={() => setOpen(true)} />
          <p className="text-sm font-semibold text-ink-700 lg:hidden">Administration GMX Motors</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink-300 px-3 text-sm font-semibold text-ink-700 no-underline transition-colors hover:border-brand-500 hover:text-brand-800"
            >
              <Icon name="external" size={15} />
              <span className="hidden sm:inline">Voir le site</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                close();
                navigate('/devis');
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-800 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Icon name="cart" size={15} />
              <span className="hidden sm:inline">Panier de devis</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
