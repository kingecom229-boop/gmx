import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Alert, Button, LinkButton } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { useSeo } from '@/lib/seo';

interface ConfirmationState {
  reference?: string;
  notification_status?: string;
  ack_status?: string;
  mail_configured?: boolean;
  email?: string;
  warning?: string | null;
}

export function QuoteConfirmationPage(): JSX.Element {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const state = (location.state ?? {}) as ConfirmationState;
  const reference = state.reference ?? searchParams.get('ref') ?? '';

  useSeo({
    title: 'Demande enregistrée',
    description: 'Votre demande de devis a bien été enregistrée.',
    path: '/devis/confirmation',
    noindex: true,
  });

  // Accès direct sans soumission préalable : on renvoie vers la composition.
  if (!reference) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-3xl">Aucune demande en cours</h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-600">
          Cette page s'affiche après l'envoi d'une demande de devis. Composez votre sélection pour en déposer une.
        </p>
        <LinkButton to="/catalogue" className="mt-8">
          Parcourir le catalogue
        </LinkButton>
      </div>
    );
  }

  const mailSent = state.notification_status === 'envoye';
  const ackSent = state.ack_status === 'envoye';
  const mailConfigured = state.mail_configured ?? false;

  return (
    <div className="bg-cream">
      <div className="container-site max-w-3xl py-14 sm:py-20">
        <div className="text-center">
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Icon name="check" size={32} />
          </span>
          <h1 className="text-3xl sm:text-4xl">Votre demande a bien été enregistrée</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-600">
            Merci {''}
            {state.email ? <span className="font-semibold text-ink-800">{state.email.split('@')[0]}</span> : null}
            . Notre équipe commerciale traite votre dossier et revient vers vous avec les disponibilités, le prix
            définitif et les conditions de livraison.
          </p>
        </div>

        <div className="card mt-10 overflow-hidden">
          <div className="border-b border-ink-200 bg-brand-800 px-6 py-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Numéro de demande</p>
            <p className="mt-1.5 font-display text-3xl font-bold tracking-wide">{reference}</p>
            <p className="mt-2 text-sm text-brand-100">
              Conservez ce numéro : il identifie votre dossier lors de nos échanges.
            </p>
          </div>

          <div className="divide-y divide-ink-100">
            <div className="flex items-start gap-3 px-6 py-4">
              <Icon
                name={mailConfigured ? (mailSent ? 'check' : 'info') : 'info'}
                size={18}
                className={`mt-0.5 shrink-0 ${mailSent ? 'text-brand-700' : 'text-ink-400'}`}
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">Équipe commerciale</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  {mailConfigured && mailSent
                    ? `Notification transmise à ${settings.quote_notification_email || settings.contact_email}.`
                    : `Votre demande est enregistrée et visible dans l'espace commercial. Vous pouvez également nous joindre directement à ${settings.contact_email}.`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-6 py-4">
              <Icon
                name={ackSent ? 'check' : 'info'}
                size={18}
                className={`mt-0.5 shrink-0 ${ackSent ? 'text-brand-700' : 'text-ink-400'}`}
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">Accusé de réception</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  {ackSent
                    ? `Un accusé de réception a été envoyé à ${state.email ?? 'votre adresse e-mail'}.`
                    : "L'accusé de réception par e-mail n'a pas pu être envoyé automatiquement. Votre demande est bien enregistrée : conservez votre numéro."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-6 py-4">
              <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Aucun paiement demandé</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  Ce site ne procède à aucun encaissement en ligne. Les conditions de vente vous sont confirmées par
                  écrit avant toute commande.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!mailConfigured || !mailSent ? (
          <div className="mt-6">
            <Alert tone="warning" title="Service d'e-mails non disponible">
              La demande est correctement enregistrée côté serveur, mais l'envoi automatique de la notification n'a pas
              abouti. Contactez-nous directement à{' '}
              <a href={`mailto:${settings.contact_email}`} className="font-semibold underline">
                {settings.contact_email}
              </a>{' '}
              en rappelant votre numéro {reference}, ou configurez le fournisseur d'e-mails (voir la documentation).
            </Alert>
          </div>
        ) : null}

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to="/catalogue" icon="search">
            Continuer à parcourir le catalogue
          </LinkButton>
          <LinkButton to="/offres" variant="outline">
            Voir les offres en cours
          </LinkButton>
          <Button
            variant="ghost"
            icon="arrow-up"
            onClick={() => {
              window.print();
            }}
          >
            Imprimer ce récapitulatif
          </Button>
        </div>

        <p className="mt-10 text-center text-sm text-ink-500">
          Besoin de compléter votre demande ?{' '}
          <button
            type="button"
            className="font-semibold text-brand-700 underline underline-offset-4"
            onClick={() => navigate('/devis')}
          >
            Déposer une nouvelle demande
          </button>
        </p>
      </div>
    </div>
  );
}
