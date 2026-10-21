import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  type ProductAvailability,
  type ProductCondition,
} from '@shared/types';

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return currency.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '—';
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  return formatDate(value);
}

export function availabilityLabel(value: ProductAvailability | string): string {
  return AVAILABILITY_LABELS[value as ProductAvailability] ?? 'Disponibilité à confirmer';
}

export function conditionLabel(value: ProductCondition | string): string {
  return CONDITION_LABELS[value as ProductCondition] ?? 'Neuf';
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

export function truncate(input: string | null | undefined, length = 160): string {
  if (!input) return '';
  const clean = input.replace(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 1).trimEnd()}…`;
}

/** Retire tout caractère de contrôle : protège les rendus et les exports. */
export function sanitizeText(input: string | null | undefined, max = 5000): string {
  if (!input) return '';
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count > 1 ? plural ?? `${singular}s` : singular;
}
