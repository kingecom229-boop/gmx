import type { SVGProps } from 'react';

/**
 * Jeu d'icônes cohérent (trait 1.6px, angle arrondi), dessiné en interne
 * pour éviter toute dépendance et garantir une taille de bundle minimale.
 */

export type IconName =
  | 'search'
  | 'menu'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'cart'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'check'
  | 'alert'
  | 'info'
  | 'truck'
  | 'shield'
  | 'phone'
  | 'mail'
  | 'pin'
  | 'clock'
  | 'user'
  | 'lock'
  | 'logout'
  | 'grid'
  | 'list'
  | 'tag'
  | 'gauge'
  | 'file'
  | 'download'
  | 'upload'
  | 'copy'
  | 'edit'
  | 'settings'
  | 'chart'
  | 'inbox'
  | 'refresh'
  | 'star'
  | 'arrow-right'
  | 'arrow-up'
  | 'external'
  | 'eye'
  | 'wrench'
  | 'leaf'
  | 'package';

const PATHS: Record<IconName, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  cart: (
    <>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  alert: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.1" />
    </>
  ),
  truck: (
    <>
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3Z" />,
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h11" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  tag: (
    <>
      <path d="M3 12.5V4h8.5L21 13.5 12.5 22 3 12.5Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="M12 14.5 16 10" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  download: <path d="M12 4v10m0 0 4-4m-4 4-4-4M4 18h16" />,
  upload: <path d="M12 16V6m0 0 4 4M12 6 8 10M4 20h16" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" />
    </>
  ),
  edit: <path d="M4 20h4L20 8l-4-4L4 16v4ZM14.5 5.5l4 4" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l3 8v6H2v-6l3-8Z" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-1.6 5.6M20 5v6h-6" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />,
  'arrow-right': <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  'arrow-up': <path d="M12 20V5m0 0-6 6m6-6 6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  wrench: (
    <path d="M20 6.5a5 5 0 0 1-6.6 6.6L7 19.5a2.1 2.1 0 0 1-3-3l6.4-6.4A5 5 0 0 1 17 3.5l-3 3 1.5 3 3-1.5 1.5-1.5Z" />
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 6-14 16-15 1 10-4 16-11 16H4Z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className = '', ...rest }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Logo GMX Motors : monogramme industriel + typographie condensée. */
export function Logo({
  variant = 'dark',
  compact = false,
}: {
  variant?: 'dark' | 'light';
  compact?: boolean;
}): JSX.Element {
  const primary = variant === 'light' ? '#ffffff' : '#16351f';
  const accent = '#3d8651';

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="9" fill={primary} />
        <path d="M8 27V13h6.5v4.2h-2.6v5.6h2.6V27H8Z" fill={accent} />
        <path d="M16.5 27 20.5 13h3.2l4 14h-3.6l-.6-2.5h-2.8l-.6 2.5h-3.6Zm4.2-5.4h1.9l-.95-4.3-.95 4.3Z" fill="#ffffff" />
        <path d="M26.5 27V13H32v3.2h-2v2.3h1.9v3.1H30V27h-3.5Z" fill={accent} />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className="font-display text-[1.35rem] font-bold uppercase tracking-[0.12em]"
            style={{ color: primary }}
          >
            GMX Motors
          </span>
          <span
            className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em]"
            style={{ color: variant === 'light' ? '#bedcc4' : '#5b6462' }}
          >
            Matériel agricole
          </span>
        </span>
      )}
    </span>
  );
}
