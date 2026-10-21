import { useEffect, useState } from 'react';
import { Alert, Button, Field, Input, Spinner, Switch, Textarea } from '@/components/ui';
import { PageHeader } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@shared/types';

type Draft = Record<string, unknown>;

export function SettingsPage(): JSX.Element {
  const toast = useToast();
  const { refresh } = useSettings();
  const [draft, setDraft] = useState<Draft>({ ...DEFAULT_SITE_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.admin
      .allSettings()
      .then((response) => setDraft({ ...DEFAULT_SITE_SETTINGS, ...response.settings }))
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: unknown): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.admin.saveSettings(draft);
      toast.success('Paramètres enregistrés', 'Le site public les applique immédiatement.');
      refresh();
      setDirty(false);
    } catch (caught) {
      toast.error('Enregistrement impossible', caught instanceof ApiError ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const reset = (): void => {
    setDraft({ ...DEFAULT_SITE_SETTINGS });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} className="text-brand-600" />
      </div>
    );
  }

  const text = (key: keyof SiteSettings) => String(draft[key] ?? '');
  const flag = (key: keyof SiteSettings) => Boolean(draft[key]);

  return (
    <>
      <PageHeader
        title="Paramètres du site"
        description="Textes, coordonnées, bandeau d'annonce et informations légales : tout se modifie ici, sans toucher au code."
        actions={
          <>
            <Button variant="outline" icon="refresh" onClick={reset} disabled={!dirty && !saving}>
              Valeurs par défaut
            </Button>
            <Button icon="check" loading={saving} onClick={() => void save()} disabled={!dirty}>
              Enregistrer
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-6">
          <Alert tone="danger" title="Chargement impossible">
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="space-y-6">
        <Section title="Marque" description="Nom commercial et promesse affichés dans l'en-tête et le pied de page.">
          <Field label="Nom commercial" htmlFor="s-brand">
            <Input id="s-brand" value={text('brand_name')} maxLength={80} onChange={(event) => set('brand_name', event.target.value)} />
          </Field>
          <Field label="Accroche" htmlFor="s-tagline">
            <Input id="s-tagline" value={text('tagline')} maxLength={200} onChange={(event) => set('tagline', event.target.value)} />
          </Field>
          <Field label="Texte du pied de page" htmlFor="s-footer" className="sm:col-span-2">
            <Textarea id="s-footer" rows={3} maxLength={1000} value={text('footer_text')} onChange={(event) => set('footer_text', event.target.value)} />
          </Field>
        </Section>

        <Section title="Bandeau d'annonce" description="Bandeau affiché tout en haut du site. Désactivé par défaut.">
          <div className="sm:col-span-2">
            <Switch
              id="s-announcement"
              checked={flag('announcement_enabled')}
              onChange={(value) => set('announcement_enabled', value)}
              label="Afficher le bandeau d'annonce"
            />
          </div>
          <Field label="Texte" htmlFor="s-announcement-text" className="sm:col-span-2">
            <Input id="s-announcement-text" value={text('announcement_text')} maxLength={200} onChange={(event) => set('announcement_text', event.target.value)} />
          </Field>
          <Field label="Lien" htmlFor="s-announcement-url">
            <Input id="s-announcement-url" value={text('announcement_url')} maxLength={200} onChange={(event) => set('announcement_url', event.target.value)} />
          </Field>
          <Field label="Couleur" htmlFor="s-announcement-tone">
            <select
              id="s-announcement-tone"
              value={text('announcement_tone')}
              onChange={(event) => set('announcement_tone', event.target.value)}
              className="h-11 w-full rounded-xl border border-ink-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none"
            >
              <option value="info">Vert</option>
              <option value="offer">Accent (offre)</option>
              <option value="neutral">Anthracite</option>
            </select>
          </Field>
        </Section>

        <Section title="Section héro" description="Titre, texte et appels à l'action du haut de la page d'accueil.">
          <Field label="Titre principal" htmlFor="s-hero-title" className="sm:col-span-2">
            <Input id="s-hero-title" value={text('hero_title')} maxLength={160} onChange={(event) => set('hero_title', event.target.value)} />
          </Field>
          <Field label="Texte d'introduction" htmlFor="s-hero-subtitle" className="sm:col-span-2">
            <Textarea id="s-hero-subtitle" rows={4} maxLength={600} value={text('hero_subtitle')} onChange={(event) => set('hero_subtitle', event.target.value)} />
          </Field>
          <Field label="Image de fond" htmlFor="s-hero-image" hint="Chemin local (/images/…) ou URL complète.">
            <Input id="s-hero-image" value={text('hero_image')} maxLength={500} onChange={(event) => set('hero_image', event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bouton 1 — texte" htmlFor="s-cta1">
              <Input id="s-cta1" value={text('hero_primary_cta_label')} maxLength={60} onChange={(event) => set('hero_primary_cta_label', event.target.value)} />
            </Field>
            <Field label="Bouton 1 — lien" htmlFor="s-cta1u">
              <Input id="s-cta1u" value={text('hero_primary_cta_url')} maxLength={200} onChange={(event) => set('hero_primary_cta_url', event.target.value)} />
            </Field>
            <Field label="Bouton 2 — texte" htmlFor="s-cta2">
              <Input id="s-cta2" value={text('hero_secondary_cta_label')} maxLength={60} onChange={(event) => set('hero_secondary_cta_label', event.target.value)} />
            </Field>
            <Field label="Bouton 2 — lien" htmlFor="s-cta2u">
              <Input id="s-cta2u" value={text('hero_secondary_cta_url')} maxLength={200} onChange={(event) => set('hero_secondary_cta_url', event.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Présentation" description="Bloc « À propos » et bloc dédié aux professionnels.">
          <Field label="Titre « À propos »" htmlFor="s-about-title" className="sm:col-span-2">
            <Input id="s-about-title" value={text('about_title')} maxLength={200} onChange={(event) => set('about_title', event.target.value)} />
          </Field>
          <Field label="Texte « À propos »" htmlFor="s-about-text" className="sm:col-span-2">
            <Textarea id="s-about-text" rows={6} maxLength={4000} value={text('about_text')} onChange={(event) => set('about_text', event.target.value)} />
          </Field>
          <Field label="Image « À propos »" htmlFor="s-about-image" className="sm:col-span-2">
            <Input id="s-about-image" value={text('about_image')} maxLength={500} onChange={(event) => set('about_image', event.target.value)} />
          </Field>
          <Field label="Titre bloc professionnels" htmlFor="s-pros-title" className="sm:col-span-2">
            <Input id="s-pros-title" value={text('pros_title')} maxLength={200} onChange={(event) => set('pros_title', event.target.value)} />
          </Field>
          <Field label="Texte bloc professionnels" htmlFor="s-pros-text" className="sm:col-span-2">
            <Textarea id="s-pros-text" rows={4} maxLength={2000} value={text('pros_text')} onChange={(event) => set('pros_text', event.target.value)} />
          </Field>
        </Section>

        <Section title="Coordonnées" description="Affichées dans le pied de page et sur la page Contact.">
          <Field label="E-mail commercial" htmlFor="s-email" required hint="Adresse destinataire des demandes de devis.">
            <Input id="s-email" type="email" value={text('contact_email')} maxLength={254} onChange={(event) => set('contact_email', event.target.value)} />
          </Field>
          <Field label="E-mail de notification des devis" htmlFor="s-quote-email" hint="Utilisé par le serveur pour l'envoi.">
            <Input id="s-quote-email" type="email" value={text('quote_notification_email')} maxLength={254} onChange={(event) => set('quote_notification_email', event.target.value)} />
          </Field>
          <Field label="Téléphone" htmlFor="s-phone" hint="Laisser vide si non communiqué.">
            <Input id="s-phone" value={text('contact_phone')} maxLength={32} onChange={(event) => set('contact_phone', event.target.value)} />
          </Field>
          <Field label="Horaires" htmlFor="s-hours">
            <Input id="s-hours" value={text('contact_hours')} maxLength={200} onChange={(event) => set('contact_hours', event.target.value)} />
          </Field>
          <Field label="Adresse" htmlFor="s-address" className="sm:col-span-2">
            <Textarea id="s-address" rows={2} maxLength={400} value={text('contact_address')} onChange={(event) => set('contact_address', event.target.value)} />
          </Field>
          <Field label="Informations de livraison" htmlFor="s-delivery" className="sm:col-span-2">
            <Textarea id="s-delivery" rows={3} maxLength={1000} value={text('delivery_text')} onChange={(event) => set('delivery_text', event.target.value)} />
          </Field>
          <Field label="Informations de garantie" htmlFor="s-warranty" className="sm:col-span-2">
            <Textarea id="s-warranty" rows={3} maxLength={1000} value={text('warranty_text')} onChange={(event) => set('warranty_text', event.target.value)} />
          </Field>
        </Section>

        <Section title="Newsletter" description="Désactivée par défaut : ne l'activez que si vous êtes en mesure d'envoyer des messages et de gérer les désinscriptions.">
          <div className="sm:col-span-2">
            <Switch
              id="s-newsletter"
              checked={flag('newsletter_enabled')}
              onChange={(value) => set('newsletter_enabled', value)}
              label="Activer l'inscription à la newsletter"
              description="Affiche le formulaire dans le pied de page."
            />
          </div>
          <Field label="Texte d'accompagnement" htmlFor="s-newsletter-label" className="sm:col-span-2">
            <Textarea id="s-newsletter-label" rows={2} maxLength={400} value={text('newsletter_label')} onChange={(event) => set('newsletter_label', event.target.value)} />
          </Field>
        </Section>

        <Section title="Informations légales" description="Ces mentions sont obligatoires avant toute mise en ligne publique. Ne les laissez pas vides.">
          <Alert tone="warning" className="sm:col-span-2">
            Aucune donnée légale n'est inventée : renseignez la raison sociale réelle, l'adresse du siège, les
            identifiants d'immatriculation et le numéro de TVA intracommunautaire.
          </Alert>
          <Field label="Raison sociale" htmlFor="s-legal-name" className="sm:col-span-2">
            <Input id="s-legal-name" value={text('legal_company_name')} maxLength={200} onChange={(event) => set('legal_company_name', event.target.value)} />
          </Field>
          <Field label="Détails légaux affichés" htmlFor="s-legal-details" className="sm:col-span-2" hint="SIREN/RCS, TVA, capital… tels qu'ils apparaîtront dans le pied de page.">
            <Textarea id="s-legal-details" rows={3} maxLength={1000} value={text('legal_company_details')} onChange={(event) => set('legal_company_details', event.target.value)} />
          </Field>
          <Field label="Avertissement « à compléter »" htmlFor="s-legal-notice" className="sm:col-span-2" hint="Affiché en tête des mentions légales tant que des informations manquent. Laissez vide une fois tout renseigné.">
            <Textarea id="s-legal-notice" rows={3} maxLength={1000} value={text('legal_missing_notice')} onChange={(event) => set('legal_missing_notice', event.target.value)} />
          </Field>
        </Section>

        <div className="sticky bottom-4 flex justify-end gap-2">
          {dirty ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 sm:w-auto">
              <p className="text-sm font-semibold text-brand-900">Modifications non enregistrées</p>
              <Button icon="check" loading={saving} onClick={() => void save()}>
                Enregistrer
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="card p-6">
      <h2 className="text-lg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
