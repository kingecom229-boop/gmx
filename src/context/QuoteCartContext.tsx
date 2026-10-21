import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product, ProductAvailability } from '@shared/types';

/**
 * Panier de devis.
 *
 * Aucun paiement : ce panier ne sert qu'à composer une demande commerciale.
 * Il survit à la session via localStorage et ne nécessite aucun compte.
 */

export interface QuoteCartItem {
  product_id: string;
  sku: string;
  name: string;
  slug: string;
  image: string | null;
  price_public: number | null;
  price_on_quote: boolean;
  availability: ProductAvailability;
  quantity: number;
  note: string;
}

interface QuoteCartContextValue {
  items: QuoteCartItem[];
  count: number;
  isOpen: boolean;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNote: (productId: string, note: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  open: () => void;
  close: () => void;
  hydrated: boolean;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);
const STORAGE_KEY = 'gmx-quote-cart';
const MAX_ITEMS = 30;
const MAX_QUANTITY = 9999;

function readStorage(): QuoteCartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is QuoteCartItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as QuoteCartItem).product_id === 'string' &&
          typeof (item as QuoteCartItem).name === 'string',
      )
      .map((item) => ({
        ...item,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(Number(item.quantity) || 1))),
        note: typeof item.note === 'string' ? item.note.slice(0, 1000) : '',
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function QuoteCartProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* stockage indisponible (mode privé) : le panier reste en mémoire */
    }
  }, [items, hydrated]);

  const add = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) }
            : item,
        );
      }
      if (current.length >= MAX_ITEMS) return current;

      const primary =
        [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;

      return [
        ...current,
        {
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          image: primary,
          price_public: product.price_public,
          price_on_quote: product.price_on_quote || product.price_public === null,
          availability: product.availability,
          quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity))),
          note: '',
        },
      ];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product_id !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const safe = Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(Number(quantity) || 1)));
    setItems((current) =>
      current.map((item) => (item.product_id === productId ? { ...item, quantity: safe } : item)),
    );
  }, []);

  const setNote = useCallback((productId: string, note: string) => {
    setItems((current) =>
      current.map((item) =>
        item.product_id === productId ? { ...item, note: note.slice(0, 1000) } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const has = useCallback(
    (productId: string) => items.some((item) => item.product_id === productId),
    [items],
  );

  const value = useMemo<QuoteCartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      isOpen,
      add,
      remove,
      setQuantity,
      setNote,
      clear,
      has,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      hydrated,
    }),
    [items, isOpen, add, remove, setQuantity, setNote, clear, has, hydrated],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartContextValue {
  const context = useContext(QuoteCartContext);
  if (!context) throw new Error('useQuoteCart doit être utilisé dans un QuoteCartProvider');
  return context;
}
