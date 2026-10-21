import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Alert, Breadcrumbs, Button, EmptyState, Field, Input, LinkButton, Select, Textarea } from '@/components/ui';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { useSettings } from '@/context/SettingsContext';
import { api, ApiError } from '@/lib/api';
import { availabilityLabel, formatPrice } from '@/lib/format';
import { useSeo } from '@/lib/seo';
import { CONTACT_PREFERENCES, PROJECT_TYPES } from '@shared/types';
import { quoteRequestSchema, flattenZodError } from '@shared/validation';

interface FormState {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  postal_code: string;
  city: string;
  project_type: string;
  message: string;
  contact_preference: string;
  consent: boolean;
  website: string;
}

const INITIAL: FormState = {
  first_name: '',
  last_name: '',
  company: '',
  email: '',
  phone: '',
  postal_code: '',
  city: '',
  project_type: '',
  message: '',
  contact_preference: '',
  consent: false,
  website: '',
};

export function QuotePage(): JSX.Element {
  const { items, setQuantity, setNote, remove, clear } = useQuoteCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formToken, setFormToken] = useState<string | null>(null);
  const firstErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .quotePrepare()
      .then((response) => setFormToken(response.token))
      .catch(() => setFormToken(null));
  }, []);

  useSeo({
    title: 'Demander un devis',
    description:
      "Composez votre demande de devis matériel agricole : équipements, quantités, coordonnées. Aucun paiement en ligne, aucune donnée bancaire demandée.",
    path: '/devis',
    noindex: false,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key as string]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as string];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setGlobalError(null);

    const payload = {
      ...form,
      consent: form.consent,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        note: item.note || '',
      })),
      form_token: formToken ?? '',
      source: 'site',
    };

    const parsed = quoteRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const next = flattenZodError(parsed.error);
      setErrors(next);
      setGlobalError('Certains champs nécessitent une correction.');
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.submitQuote(parsed.data);
      clear();
      navigate(`/devis/confirmation?ref=${encodeURIComponent(response.reference)}`, {
        replace: true,
        state: {
          reference: response.reference,
          notification_status: response.notification_status,
          ack_status: response.ack_status,
          mail_configured: response.mail_configured,
          email: form.email,
          warning: response.warning,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setGlobalError(error.message);
        if (error.fields) setErrors(error.fields);
      } else {
        setGlobalError('Envoi impossible pour le moment. Merci de réessayer dans quelques instants.');
      }
      setSubmitting(false);
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const summary = useMemo(
    () => (
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 bg-ink-50 px-5 py-4">
          <h2 className="text-lg">Votre sélection</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {items.length} référence{items.length > 1 ? 's' : ''} · {totalItems} unité{totalItems > 1 ? 's' : ''}
          </p>
        </div>

        <ul className="divide-y divide-ink-100">
          {items.map((item) => (
            <li key={item.product_id} className="flex gap-3 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-100">
                {item.image ? (
                  <img src={item.image} alt="" width={64} height={64} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-300">
                    <Icon name="package" size={20} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold text-ink-900">{item.name}</p>
                  <button
                    type="button"
                    onClick={() => remove(item.product_id)}
                    className="shrink-0 rounded p-1 text-ink-400 transition-colors hover:text-red-700"
                    aria-label={`Retirer ${item.name} de la demande`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-ink-500">Réf. {item.sku}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{availabilityLabel(item.availability)}</p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-lg border border-ink-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                      aria-label={`Diminuer la quantité de ${item.name}`}
                      className="flex h-7 w-7 items-center justify-center text-ink-600 hover:text-brand-700"
                    >
                      <Icon name="minus" size={13} />
                    </button>
                    <label className="sr-only" htmlFor={`line-qty-${item.product_id}`}>
                      Quantité
                    </label>
                    <input
                      id={`line-qty-${item.product_id}`}
                      type="number"
                      min={1}
                      max={9999}
                      value={item.quantity}
                      onChange={(event) => setQuantity(item.product_id, Number(event.target.value))}
                      className="h-7 w-11 border-x border-ink-200 bg-transparent text-center text-sm font-semibold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                      aria-label={`Augmenter la quantité de ${item.name}`}
                      className="flex h-7 w-7 items-center justify-center text-ink-600 hover:text-brand-700"
                    >
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-ink-700">
                    {item.price_on_quote || item.price_public === null
                      ? 'Sur devis'
                      : `${formatPrice(item.price_public)} / u.`}
                  </span>
                </div>

                <label className="mt-2 block" htmlFor={`line-note-${item.product_id}`}>
                  <span className="sr-only">Précision pour {item.name}</span>
                  <input
                    id={`line-note-${item.product_id}`}
                    type="text"
                    maxLength={200}
                    value={item.note}
                    placeholder="Précision (option, usage, délai…)"
                    onChange={(event) => setNote(item.product_id, event.target.value)}
                    className="h-8 w-full rounded-lg border border-ink-200 bg-ink-50 px-2.5 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-ink-200 bg-ink-50 px-5 py-4">
          <LinkButton to="/catalogue" variant="ghost" size="sm" icon="plus" block>
            Ajouter un équipement
          </LinkButton>
        </div>
      </div>
    ),
    [items, remove, setNote, setQuantity, totalItems],
  );

  if (items.length === 0) {
    return (
      <div className="container-site py-12">
        <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Demande de devis' }]} />
        <EmptyState
          icon="cart"
          title="Votre demande de devis est vide"
          description="Ajoutez au moins un équipement depuis le catalogue, ou décrivez directement votre besoin dans le formulaire de contact : un commercial vous répond."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/catalogue">Parcourir le catalogue</LinkButton>
              <LinkButton to="/contact" variant="outline">
                Décrire mon besoin
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-cream">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-site py-8 sm:py-10">
          <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Demande de devis' }]} />
          <h1 className="text-3xl sm:text-4xl">Votre demande de devis</h1>
          <p className="mt-3 max-w-3xl text-ink-600">
            Vérifiez votre sélection, renseignez vos coordonnées et validez. Aucun paiement en ligne, aucune donnée
            bancaire demandée. Un commercial revient vers vous avec les disponibilités, le prix définitif et les
            conditions de livraison.
          </p>
        </div>
      </div>

      <div className="container-site grid gap-8 py-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div ref={firstErrorRef} tabIndex={-1}>
            {globalError ? (
              <Alert tone="danger" title="Envoi impossible">
                {globalError}
              </Alert>
            ) : null}
          </div>

          <section aria-labelledby="coords-title">
            <h2 id="coords-title" className="mb-4 text-xl">
              Vos coordonnées
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="first_name" required error={errors.first_name}>
                <Input
                  id="first_name"
                  name="first_name"
                  autoComplete="given-name"
                  maxLength={80}
                  required
                  invalid={Boolean(errors.first_name)}
                  value={form.first_name}
                  onChange={(event) => set('first_name', event.target.value)}
                  aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                />
              </Field>
              <Field label="Nom" htmlFor="last_name" required error={errors.last_name}>
                <Input
                  id="last_name"
                  name="last_name"
                  autoComplete="family-name"
                  maxLength={80}
                  required
                  invalid={Boolean(errors.last_name)}
                  value={form.last_name}
                  onChange={(event) => set('last_name', event.target.value)}
                  aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                />
              </Field>
              <Field label="Entreprise / exploitation" htmlFor="company" hint="Laissez vide si vous êtes un particulier.">
                <Input
                  id="company"
                  name="company"
                  autoComplete="organization"
                  maxLength={120}
                  value={form.company}
                  onChange={(event) => set('company', event.target.value)}
                />
              </Field>
              <Field label="Adresse e-mail" htmlFor="email" required error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  invalid={Boolean(errors.email)}
                  value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </Field>
              <Field label="Téléphone" htmlFor="phone" required error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={32}
                  required
                  invalid={Boolean(errors.phone)}
                  value={form.phone}
                  onChange={(event) => set('phone', event.target.value)}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
              </Field>
              <Field label="Code postal" htmlFor="postal_code" required error={errors.postal_code}>
                <Input
                  id="postal_code"
                  name="postal_code"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={12}
                  required
                  invalid={Boolean(errors.postal_code)}
                  value={form.postal_code}
                  onChange={(event) => set('postal_code', event.target.value)}
                  aria-describedby={errors.postal_code ? 'postal_code-error' : undefined}
                />
              </Field>
              <Field label="Ville" htmlFor="city" required error={errors.city} className="sm:col-span-2">
                <Input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  maxLength={80}
                  required
                  invalid={Boolean(errors.city)}
                  value={form.city}
                  onChange={(event) => set('city', event.target.value)}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                />
              </Field>
            </div>
          </section>

          <section aria-labelledby="projet-title">
            <h2 id="projet-title" className="mb-4 text-xl">
              Votre projet
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type de besoin" htmlFor="project_type">
                <Select
                  id="project_type"
                  name="project_type"
                  value={form.project_type}
                  onChange={(event) => set('project_type', event.target.value)}
                  placeholder="Sélectionnez…"
                  options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
                />
              </Field>
              <Field label="Comment préférez-vous être contacté ?" htmlFor="contact_preference">
                <Select
                  id="contact_preference"
                  name="contact_preference"
                  value={form.contact_preference}
                  onChange={(event) => set('contact_preference', event.target.value)}
                  placeholder="Sans préférence"
                  options={CONTACT_PREFERENCES.map((preference) => ({ value: preference, label: preference }))}
                />
              </Field>
              <Field
                label="Message complémentaire"
                htmlFor="message"
                className="sm:col-span-2"
                hint="Surface, usage, contraintes de livraison, délais souhaités…"
              >
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  maxLength={5000}
                  value={form.message}
                  onChange={(event) => set('message', event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section aria-labelledby="consent-title">
            <h2 id="consent-title" className="mb-4 text-xl">
              Données personnelles
            </h2>
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(event) => set('consent', event.target.checked)}
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-400 accent-brand-700"
                />
                <label htmlFor="consent" className="text-sm leading-relaxed text-ink-700">
                  J'accepte que les informations saisies soient utilisées par {settings.brand_name} pour traiter ma
                  demande de devis et me recontacter. Elles ne sont ni revendues ni transmises à des tiers à des fins
                  commerciales.{' '}
                  <Link to="/confidentialite" className="font-semibold">
                    Politique de confidentialité
                  </Link>
                </label>
              </div>
              {errors.consent ? (
                <p id="consent-error" role="alert" className="mt-3 text-sm font-medium text-red-700">
                  Vous devez accepter le traitement de vos données pour envoyer la demande.
                </p>
              ) : null}

              {/* Champ invisible : rempli uniquement par les robots. */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Ne pas remplir ce champ</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => set('website', event.target.value)}
                />
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-ink-200 pt-4 text-xs text-ink-500">
                <li className="flex items-start gap-2">
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-brand-700" />
                  Aucune pièce d'identité, aucune donnée bancaire ne vous est demandée.
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-brand-700" />
                  Vous pouvez demander la suppression de vos données à tout moment.
                </li>
              </ul>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 lg:hidden">
            <Button block size="lg" type="submit" loading={submitting} iconRight="arrow-right">
              Envoyer ma demande
            </Button>
          </div>

          <div className="hidden lg:block">
            <Button size="lg" type="submit" loading={submitting} iconRight="arrow-right">
              Envoyer ma demande de devis
            </Button>
            <p className="mt-3 text-sm text-ink-500">
              En validant, vous recevez un numéro de demande. Aucun paiement n'est demandé.
            </p>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-28">
          {summary}

          <div className="card p-5">
            <h2 className="text-base">Ce qui se passe ensuite</h2>
            <ol className="mt-3 space-y-3 text-sm text-ink-600">
              {[
                'Votre demande est enregistrée et un numéro vous est communiqué.',
                'Notre équipe commerciale est notifiée immédiatement.',
                'Un commercial vous contacte pour confirmer disponibilités, prix définitif et livraison.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="card flex items-start gap-3 border-brand-200 bg-brand-50 p-5">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand-700" />
            <div>
              <p className="text-sm font-semibold text-brand-900">Aucun paiement en ligne</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-800">
                La relation commerciale se conclut après échange avec un commercial. Aucune carte bancaire n'est
                demandée sur ce site.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
