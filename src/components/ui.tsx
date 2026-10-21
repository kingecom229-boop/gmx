import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/* ------------------------------------------------------------------------- */
/* Boutons                                                                    */
/* ------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-800 text-white hover:bg-brand-700 active:bg-brand-900 shadow-sm disabled:bg-ink-300',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-sm disabled:bg-ink-300',
  outline:
    'border border-ink-300 bg-white text-ink-800 hover:border-brand-500 hover:text-brand-800 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-red-700 text-white hover:bg-red-600 active:bg-red-800',
  // L'or de la marque porte toujours un texte anthracite : le blanc sur or
  // n'atteint pas le contraste minimal.
  accent: 'bg-accent-500 text-ink-950 hover:bg-accent-400 active:bg-accent-600 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5 py-3.5',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading, block, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  );
});

interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  className?: string;
  children: ReactNode;
  external?: boolean;
  ariaLabel?: string;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block,
  className = '',
  children,
  external,
  ariaLabel,
}: LinkButtonProps): JSX.Element {
  const classes = `inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`;

  if (external) {
    return (
      <a href={to} className={classes} target="_blank" rel="noreferrer noopener" aria-label={ariaLabel}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
        {children}
        {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
      </a>
    );
  }

  return (
    <Link to={to} className={classes} aria-label={ariaLabel}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 18,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; variant?: ButtonVariant; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ------------------------------------------------------------------------- */
/* Indicateurs                                                                */
/* ------------------------------------------------------------------------- */

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }): JSX.Element {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type BadgeTone = 'brand' | 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-100 text-brand-900 border-brand-200',
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  accent: 'bg-accent-100 text-accent-900 border-accent-200',
  success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-100 text-amber-900 border-amber-200',
  danger: 'bg-red-100 text-red-900 border-red-200',
  info: 'bg-sky-100 text-sky-900 border-sky-200',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className = '',
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }): JSX.Element {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* ------------------------------------------------------------------------- */
/* Formulaires                                                                */
/* ------------------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-ink-100 disabled:text-ink-500';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className = '' }: FieldProps): JSX.Element {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-800">
        {label}
        {required ? (
          <span className="ml-1 text-accent-700" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-ink-500">(facultatif)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${FIELD_BASE} h-11 ${invalid ? 'border-red-400' : 'border-ink-300'} ${className}`}
      {...rest}
    />
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${FIELD_BASE} min-h-[110px] py-2.5 leading-relaxed ${invalid ? 'border-red-400' : 'border-ink-300'} ${className}`}
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, options, placeholder, className = '', ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${FIELD_BASE} h-11 appearance-none pr-10 ${invalid ? 'border-red-400' : 'border-ink-300'} ${className}`}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
      />
    </div>
  );
});

export function Checkbox({
  id,
  label,
  description,
  invalid,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode; description?: ReactNode; invalid?: boolean }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={invalid || undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-400 text-brand-700 accent-brand-700 focus:ring-brand-600"
          {...rest}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink-700">
          {label}
          {description ? <span className="mt-0.5 block text-xs text-ink-500">{description}</span> : null}
        </label>
      </div>
      {invalid ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          Vous devez accepter le traitement de vos données pour envoyer la demande.
        </p>
      ) : null}
    </div>
  );
}

export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${checked ? 'bg-brand-700' : 'bg-ink-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Conteneurs & états                                                         */
/* ------------------------------------------------------------------------- */

export function EmptyState({
  icon = 'package',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-xl">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-ink-600">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Une erreur est survenue',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="card border-red-200 bg-red-50/40 px-6 py-10 text-center" role="alert">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        <Icon name="alert" size={24} />
      </span>
      <h3 className="text-lg text-ink-900">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-lg text-ink-600">{description}</p> : null}
      {onRetry ? (
        <Button className="mt-5" variant="outline" icon="refresh" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-brand-200 bg-brand-50 text-brand-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  };
  const icons = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' } as const;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${tones[tone]} ${className}`}>
      <Icon name={icons[tone]} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5 text-sm' : 'text-sm'}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Navigation & overlays                                                      */
/* ------------------------------------------------------------------------- */

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }): JSX.Element {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.to && index < items.length - 1 ? (
              <Link to={item.to} className="hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-800">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <Icon name="chevron-right" size={14} className="text-ink-300" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}): JSX.Element | null {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const window: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i < Math.min(pages, start + 4); i += 1) window.push(i);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <Button variant="outline" size="sm" icon="chevron-left" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <span className="sr-only sm:not-sr-only">Précédent</span>
      </Button>
      {start > 1 ? <span className="px-2 text-ink-400">…</span> : null}
      {window.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-current={item === page ? 'page' : undefined}
          className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition-colors ${
            item === page ? 'bg-brand-800 text-white' : 'border border-ink-200 bg-white text-ink-700 hover:border-brand-400'
          }`}
        >
          {item}
        </button>
      ))}
      {start + 4 < pages ? <span className="px-2 text-ink-400">…</span> : null}
      <Button variant="outline" size="sm" iconRight="chevron-right" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <span className="sr-only sm:not-sr-only">Suivant</span>
      </Button>
    </nav>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${widths[size]} animate-fade-up overflow-hidden rounded-t-2xl bg-white shadow-lift focus:outline-none sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Accordion({
  items,
}: {
  items: { id: string; question: string; answer: string }[];
}): JSX.Element {
  return (
    <div className="divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 bg-white">
      {items.map((item) => (
        <details key={item.id} className="group px-5 py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold text-ink-900 transition-colors hover:text-brand-700 [&::-webkit-details-marker]:hidden">
            <span className="text-[15px] sm:text-base">{item.question}</span>
            <Icon
              name="chevron-down"
              size={18}
              className="shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="pb-5 pr-8 text-ink-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
