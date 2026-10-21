import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import { IconButton } from '../ui';
import { Button } from '../ui';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { availabilityLabel, formatPrice } from '@/lib/format';

/**
 * Tiroir latéral de la demande de devis.
 * Aucun prix n'y est totalisé : la valeur d'un devis n'est pas une somme
 * affichable, chaque équipement étant confirmé commercialement.
 */
export function QuoteDrawer(): JSX.Element | null {
  const { items, isOpen, close, setQuantity, setNote, remove, clear, hydrated } = useQuoteCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="quote-drawer-title">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in flex-col bg-cream shadow-lift">
        <header className="flex items-center justify-between gap-3 border-b border-ink-200 bg-white px-5 py-4">
          <div>
            <h2 id="quote-drawer-title" className="text-lg">
              Ma demande de devis
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {items.length === 0
                ? 'Aucun équipement sélectionné'
                : `${items.length} ${items.length > 1 ? 'équipements' : 'équipement'} — sans engagement ni paiement`}
            </p>
          </div>
          <IconButton icon="close" label="Fermer" onClick={close} />
        </header>

        {!hydrated ? (
          <div className="flex-1 space-y-3 p-5">
            {[0, 1].map((index) => (
              <div key={index} className="skeleton h-24" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name="cart" size={28} />
            </span>
            <h3 className="text-lg">Votre demande est vide</h3>
            <p className="mt-2 text-sm text-ink-600">
              Parcourez le catalogue et ajoutez les équipements qui vous intéressent. Vous pourrez ajuster les
              quantités et préciser vos contraintes avant l'envoi.
            </p>
            <Link to="/catalogue" className="mt-6" onClick={close}>
              <Button icon="search">Parcourir le catalogue</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {items.map((item) => (
                <article key={item.product_id} className="card flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-300">
                        <Icon name="package" size={24} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/produit/${item.slug}`}
                          onClick={close}
                          className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-500">{item.sku}</p>
                      </div>
                      <IconButton
                        icon="trash"
                        label={`Retirer ${item.name}`}
                        size={15}
                        className="h-7 w-7 text-ink-400 hover:text-red-700"
                        onClick={() => remove(item.product_id)}
                      />
                    </div>

                    <p className="mt-1 text-[11px] font-medium text-ink-500">{availabilityLabel(item.availability)}</p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-lg border border-ink-300 bg-white">
                        <button
                          type="button"
                          aria-label={`Diminuer la quantité de ${item.name}`}
                          className="flex h-8 w-8 items-center justify-center text-ink-600 transition-colors hover:text-brand-700"
                          onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <label className="sr-only" htmlFor={`qty-${item.product_id}`}>
                          Quantité
                        </label>
                        <input
                          id={`qty-${item.product_id}`}
                          type="number"
                          min={1}
                          max={9999}
                          value={item.quantity}
                          onChange={(event) => setQuantity(item.product_id, Number(event.target.value))}
                          className="h-8 w-12 border-x border-ink-200 bg-transparent text-center text-sm font-semibold text-ink-900 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label={`Augmenter la quantité de ${item.name}`}
                          className="flex h-8 w-8 items-center justify-center text-ink-600 transition-colors hover:text-brand-700"
                          onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-ink-800">
                        {item.price_on_quote || item.price_public === null
                          ? 'Sur devis'
                          : `${formatPrice(item.price_public)} / u.`}
                      </span>
                    </div>

                    <label className="mt-2 block" htmlFor={`note-${item.product_id}`}>
                      <span className="sr-only">Précision pour {item.name}</span>
                      <input
                        id={`note-${item.product_id}`}
                        type="text"
                        maxLength={200}
                        value={item.note}
                        placeholder="Précision (option, usage, délai…)"
                        onChange={(event) => setNote(item.product_id, event.target.value)}
                        className="h-8 w-full rounded-lg border border-ink-200 bg-ink-50 px-2.5 text-xs text-ink-700 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none"
                      />
                    </label>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={clear}
                className="w-full py-2 text-sm font-semibold text-ink-500 transition-colors hover:text-red-700"
              >
                Vider la demande
              </button>
            </div>

            <footer className="border-t border-ink-200 bg-white p-5">
              <Link to="/devis" onClick={close} className="block">
                <Button block size="lg" iconRight="arrow-right">
                  Continuer ma demande
                </Button>
              </Link>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                Les prix affichés sont indicatifs. Le prix définitif, la disponibilité et la livraison vous sont
                confirmés par un commercial.
              </p>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
