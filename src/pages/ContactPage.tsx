import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { Alert, Breadcrumbs, Button, Field, Input, LinkButton, Textarea } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { api, ApiError } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import { contactMessageSchema, flattenZodError } from '@shared/validation';

export function ContactPage(): JSX.Element {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useSeo({
    title: 'Nous contacter',
    description:
      "Contactez l'équipe commerciale GMX Motors pour toute question sur le matériel agricole, les disponibilités ou une demande de tarif.",
    path: '/contact',
  });

  const set = (key: keyof typeof form, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    const parsed = contactMessageSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodError(parsed.error));
      setStatus('idle');
      return;
    }

    try {
      await api.submitContact(parsed.data);
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', subject: '', message: '', website: '' });
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof ApiError ? error.message : "L'envoi a échoué. Merci de réessayer dans quelques instants.",
      );
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
    }
  };

  return (
    <div className="bg-cream">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-site py-9 sm:py-12">
          <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Contact' }]} />
          <h1 className="text-3xl sm:text-4xl">Nous contacter</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Une question sur un équipement, une disponibilité, un tarif ou un besoin spécifique ? Écrivez-nous : un
            interlocuteur identifié vous répond.
          </p>
        </div>
      </div>

      <div className="container-site grid gap-10 py-12 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="card p-6 sm:p-8">
          {status === 'sent' ? (
            <div className="py-10 text-center">
              <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <Icon name="check" size={28} />
              </span>
              <h2 className="text-2xl">Message envoyé</h2>
              <p className="mx-auto mt-3 max-w-md text-ink-600">
                Merci pour votre message. Nous vous répondons dans les meilleurs délais à l'adresse indiquée.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton to="/catalogue" variant="outline">
                  Retour au catalogue
                </LinkButton>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatus('idle');
                  }}
                >
                  Écrire un autre message
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="text-2xl">Écrivez-nous</h2>
              <p className="mt-2 text-sm text-ink-600">
                Les champs marqués d'un astérisque sont nécessaires pour vous répondre.
              </p>

              {status === 'error' ? (
                <Alert tone="danger" className="mt-5" title="Envoi impossible">
                  {errorMessage}
                </Alert>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Nom et prénom" htmlFor="c-name" required error={errors.name}>
                  <Input
                    id="c-name"
                    name="name"
                    autoComplete="name"
                    maxLength={120}
                    required
                    invalid={Boolean(errors.name)}
                    value={form.name}
                    onChange={(event) => set('name', event.target.value)}
                  />
                </Field>
                <Field label="Adresse e-mail" htmlFor="c-email" required error={errors.email}>
                  <Input
                    id="c-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    invalid={Boolean(errors.email)}
                    value={form.email}
                    onChange={(event) => set('email', event.target.value)}
                  />
                </Field>
                <Field label="Téléphone" htmlFor="c-phone">
                  <Input
                    id="c-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={32}
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                  />
                </Field>
                <Field label="Objet" htmlFor="c-subject">
                  <Input
                    id="c-subject"
                    name="subject"
                    maxLength={160}
                    value={form.subject}
                    onChange={(event) => set('subject', event.target.value)}
                  />
                </Field>
                <Field label="Message" htmlFor="c-message" className="sm:col-span-2" required error={errors.message}>
                  <Textarea
                    id="c-message"
                    name="message"
                    rows={7}
                    maxLength={5000}
                    required
                    invalid={Boolean(errors.message)}
                    value={form.message}
                    onChange={(event) => set('message', event.target.value)}
                    placeholder="Décrivez votre besoin, votre exploitation, l'équipement recherché…"
                  />
                </Field>
              </div>

              <div className="hidden" aria-hidden="true">
                <label htmlFor="c-website">Ne pas remplir ce champ</label>
                <input
                  id="c-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => set('website', event.target.value)}
                />
              </div>

              <Button size="lg" type="submit" className="mt-6" loading={status === 'sending'} iconRight="arrow-right">
                Envoyer le message
              </Button>

              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                Les informations transmises servent uniquement à traiter votre demande. Elles ne sont ni revendues ni
                transmises à des tiers. Vous disposez d'un droit d'accès, de rectification et de suppression : voir la{' '}
                <a href="/confidentialite" className="font-semibold">
                  politique de confidentialité
                </a>
                .
              </p>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <h2 className="text-lg">Coordonnées</h2>
            <address className="mt-4 space-y-4 text-sm not-italic">
              <a href={`mailto:${settings.contact_email}`} className="flex items-start gap-3 text-ink-700 no-underline hover:text-brand-700">
                <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                <span>
                  <span className="block font-semibold text-ink-900">E-mail</span>
                  {settings.contact_email}
                </span>
              </a>

              {settings.contact_phone ? (
                <a
                  href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}
                  className="flex items-start gap-3 text-ink-700 no-underline hover:text-brand-700"
                >
                  <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>
                    <span className="block font-semibold text-ink-900">Téléphone</span>
                    {settings.contact_phone}
                  </span>
                </a>
              ) : (
                <p className="flex items-start gap-3 text-ink-500">
                  <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-ink-300" />
                  <span>Numéro de téléphone à renseigner dans l'administration.</span>
                </p>
              )}

              {settings.contact_address ? (
                <span className="flex items-start gap-3 text-ink-700">
                  <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>
                    <span className="block font-semibold text-ink-900">Adresse</span>
                    {settings.contact_address}
                  </span>
                </span>
              ) : null}

              {settings.contact_hours ? (
                <span className="flex items-start gap-3 text-ink-700">
                  <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>
                    <span className="block font-semibold text-ink-900">Horaires</span>
                    {settings.contact_hours}
                  </span>
                </span>
              ) : null}
            </address>
          </div>

          <div className="card border-brand-200 bg-brand-50 p-6">
            <h2 className="text-lg text-brand-900">Vous savez déjà ce qu'il vous faut ?</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-800">
              Passez directement par la demande de devis : vous indiquez les équipements, les quantités et vos
              contraintes, et nous répondons avec un prix définitif.
            </p>
            <LinkButton to="/devis" className="mt-4" size="sm" iconRight="arrow-right">
              Demander un devis
            </LinkButton>
          </div>

          {settings.legal_missing_notice ? (
            <div className="card p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-ink-600">Informations légales</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">{settings.legal_missing_notice}</p>
              <LinkButton to="/mentions-legales" variant="ghost" size="sm" className="mt-2 -ml-2">
                Mentions légales
              </LinkButton>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
