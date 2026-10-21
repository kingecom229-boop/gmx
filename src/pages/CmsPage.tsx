import { Breadcrumbs, ErrorState, Skeleton } from '@/components/ui';
import { usePage } from '@/hooks/useCatalogue';
import { useSettings } from '@/context/SettingsContext';
import { useSeo } from '@/lib/seo';

/**
 * Pages éditoriales administrables.
 *
 * Le contenu par défaut ci-dessous ne contient aucune donnée légale inventée :
 * les mentions obligatoires restent explicitement marquées « à compléter »
 * tant qu'elles n'ont pas été renseignées dans l'administration.
 */
export const DEFAULT_PAGE_CONTENT: Record<string, { title: string; content: string }> = {
  'mentions-legales': {
    title: 'Mentions légales',
    content: `## Éditeur du site

**[Raison sociale à compléter]**, exploitant le nom commercial **GMX Motors**.

- Forme juridique : [à compléter]
- Capital social : [à compléter]
- Siège social : [adresse à compléter]
- SIREN / RCS : [à compléter]
- Numéro de TVA intracommunautaire : [à compléter]
- Téléphone : [à compléter]
- Directeur de la publication : [à compléter]

Ces informations sont obligatoires pour toute mise en ligne publique d'un site commercial en France. Elles doivent être complétées depuis l'administration avant publication.

## Hébergement

Ce site est hébergé par **[hébergeur à compléter]** — [adresse à compléter].

## Propriété intellectuelle

L'ensemble des éléments de ce site (textes, logos, photographies, structure) est la propriété de l'éditeur, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.

Les photographies d'équipements sont fournies à titre d'illustration. Les caractéristiques techniques peuvent évoluer ; seules les informations confirmées au devis font foi.

## Absence de paiement en ligne

Ce site ne propose aucun paiement en ligne et ne collecte aucune donnée bancaire. Le parcours commercial repose exclusivement sur la demande de devis et sur l'échange avec un commercial.

## Médiation de la consommation

Conformément aux dispositions applicables, le consommateur dispose du droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige.

- Nom du médiateur : [à compléter]
- Coordonnées / site internet : [à compléter]

## Droit applicable

Les présentes mentions sont régies par le droit français.`,
  },

  confidentialite: {
    title: 'Politique de confidentialité',
    content: `## Responsable du traitement

**[Raison sociale à compléter]** — GMX Motors, [adresse à compléter], [e-mail de contact à compléter].

## Données collectées

Nous collectons uniquement les données nécessaires au traitement de votre demande :

- identité : nom, prénom
- coordonnées : adresse e-mail, téléphone, code postal, ville
- entreprise ou exploitation, si vous la renseignez
- contenu de votre demande : équipements sélectionnés, quantités, message libre
- données techniques limitées : adresse IP sous forme hachée, agent navigateur, horodatage

**Nous ne collectons ni donnée bancaire, ni pièce d'identité, ni donnée sensible.**

## Finalités

- traiter votre demande de devis et vous recontacter
- assurer le suivi commercial de votre dossier
- répondre à vos messages via le formulaire de contact
- mesurer l'usage du site de façon agrégée, le cas échéant
- vous adresser nos communications si vous y avez consenti (newsletter)

## Base légale

L'exécution de mesures précontractuelles prises à votre demande pour les demandes de devis, et votre consentement pour la newsletter.

## Destinataires

Vos données sont destinées au personnel commercial habilité de GMX Motors. Elles ne sont ni vendues, ni louées, ni transmises à des tiers à des fins publicitaires.

Les prestataires techniques intervenant sont :

- l'hébergeur du site : [à compléter]
- l'éditeur du service d'hébergement de base de données utilisé (Supabase)
- le prestataire d'envoi d'e-mails transactionnels, le cas échéant : [à compléter]

## Durées de conservation

- demandes de devis : 3 ans à compter du dernier contact, puis archivage ou suppression
- messages de contact : 3 ans
- adresses e-mail de la newsletter : jusqu'à votre désinscription
- journaux techniques : 12 mois

## Sécurité

L'accès aux données est protégé par une authentification forte, par des politiques d'accès par ligne en base de données (Row Level Security) et par le chiffrement des échanges en HTTPS. Les adresses IP ne sont pas conservées en clair : elles sont hachées avec un sel propre à l'application.

## Vos droits

Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données.

Pour les exercer, écrivez à **[e-mail à compléter]** en précisant votre demande. Nous répondons dans un délai maximal d'un mois.

Vous pouvez également introduire une réclamation auprès de la CNIL : [www.cnil.fr](https://www.cnil.fr).

## Cookies

Ce site n'utilise que des cookies strictement nécessaires au fonctionnement de la demande de devis (conservation locale de votre sélection). Aucun cookie publicitaire ou de mesure tiers n'est déposé.`,
  },

  cgv: {
    title: 'Conditions générales de vente',
    content: `## Objet

Les présentes conditions générales décrivent le fonctionnement du parcours commercial proposé sur ce site. **Elles doivent être complétées et validées par un professionnel du droit avant toute mise en exploitation commerciale.**

## Nature du service proposé en ligne

Ce site ne constitue pas un site de vente en ligne avec paiement immédiat. Il permet de :

1. consulter un catalogue d'équipements agricoles
2. composer une demande de devis
3. transmettre ses coordonnées à l'équipe commerciale

**Aucune transaction financière n'est réalisée sur le site.**

## Prix

Les prix affichés sont **indicatifs** et non contractuels. Ils sont exprimés en euros. Le prix définitif, les taxes applicables, les frais de transport et les conditions de règlement sont précisés sur le devis transmis par le commercial.

Les remises annoncées dans la rubrique « Offres » sont calculées à partir d'un prix de référence enregistré et sont limitées dans le temps lorsque la période est indiquée.

## Disponibilité

Les mentions « en stock », « sur commande », « disponibilité à confirmer » et « indisponible » reflètent l'information connue au moment de la consultation. La disponibilité réelle est confirmée lors du devis.

## Formation du contrat

Aucun contrat n'est formé par la simple soumission d'une demande de devis. Le contrat est formé par l'acceptation écrite du devis par le client, selon les conditions qui y figurent.

## Livraison

Les modalités, délais et coûts de livraison sont précisés sur le devis. Les équipements volumineux font l'objet de conditions de transport spécifiques.

## Garantie

Les conditions de garantie varient selon les équipements et les fabricants. Elles sont précisées sur le devis lorsqu'elles sont confirmées. Aucun engagement de garantie n'est pris sur ce site en dehors de ces documents.

## Droit de rétractation

Les règles applicables au droit de rétractation dépendent de la qualité du client (consommateur ou professionnel) et de la nature de l'équipement. Elles sont rappelées dans le devis et doivent être précisées par le vendeur.

## Données personnelles

Le traitement des données est décrit dans la [politique de confidentialité](/confidentialite).

## Litiges

Les présentes conditions sont régies par le droit français. À défaut de résolution amiable, le consommateur peut recourir au médiateur de la consommation dont les coordonnées figurent dans les [mentions légales](/mentions-legales).`,
  },

  'livraison-garantie': {
    title: 'Livraison & garantie',
    content: `## Livraison

Les modalités de livraison sont établies au cas par cas, en fonction de la nature de l'équipement, de son gabarit et de la destination. Elles sont précisées sur le devis.

Les éléments suivants influent sur les conditions :

- gabarit et poids de l'équipement
- nécessité d'un moyen de déchargement sur site
- accessibilité du lieu de livraison
- préparation ou mise en service éventuelle

**Aucun délai de livraison n'est annoncé sur ce site avant confirmation commerciale.** Nous préférons vous communiquer un engagement fiable plutôt qu'une estimation non vérifiée.

## Garantie

Les conditions de garantie dépendent de l'équipement, de son fabricant et de son état (neuf ou occasion).

- pour un équipement **neuf** : la garantie du fabricant s'applique selon ses propres conditions
- pour un équipement **d'occasion** : les conditions applicables sont précisées sur le devis

Les conditions précises (durée, périmètre, pièces couvertes, exclusions, modalités de mise en œuvre) vous sont communiquées avec le devis lorsqu'elles sont confirmées.

## Pièces détachées et entretien

Les pièces détachées et les consommables sont proposés sur référence. En cas de doute sur la compatibilité, indiquez la référence de votre machine dans votre demande : nous vérifions avant de vous proposer une pièce.

## Une question ?

Écrivez-nous en précisant l'équipement concerné et votre localisation : nous vous répondons avec des conditions réelles, adaptées à votre situation.`,
  },

  'a-propos': {
    title: 'À propos de GMX Motors',
    content: `## Notre métier

GMX Motors distribue du matériel agricole destiné aux exploitants, aux entreprises de travaux agricoles, aux coopératives, aux revendeurs et aux particuliers exigeants.

Notre catalogue couvre l'ensemble de la chaîne de travail d'une exploitation :

- **traction** : tracteurs agricoles neufs et d'occasion
- **préparation des sols** : décompactage, labour, travail superficiel
- **semis et plantation** : semoirs, distributeurs, équipements de plantation
- **récolte** : moisson, ensilage, fenaison
- **manutention** : chargeurs, télescopiques, équipements de levage
- **pièces détachées** : pièces d'usure, organes mécaniques et hydrauliques
- **huiles et lubrifiants** : moteur, hydraulique, transmission
- **accessoires et consommables** : outillage, liaison, sécurité

## Notre méthode

Nous partons de l'usage réel. Avant de proposer un équipement, nous cherchons à comprendre votre exploitation : surfaces, type de cultures ou d'élevage, parcellaire, rythme de travail, matériel déjà en place. C'est la seule façon d'éviter le sur-équipement comme le sous-dimensionnement.

Chaque demande de devis est traitée par un interlocuteur identifié, qui suit le dossier de la première consultation jusqu'à la confirmation des conditions.

## Notre engagement commercial

Nous n'affichons que ce que nous savons. Concrètement :

- un prix affiché est un prix indicatif, clairement identifié comme tel
- une disponibilité affichée correspond à l'information réellement connue
- une promotion annoncée repose sur un prix de référence enregistré et une période définie
- aucune réduction, aucun stock limité ni aucun compte à rebours artificiel n'est mis en scène

## Travailler avec nous

Décrivez votre besoin dans une demande de devis. Plus les informations sont précises (usage, surface, contraintes, délai), plus la réponse est utile dès le premier échange.`,
  },
};

export function CmsPage({ slug }: { slug: string }): JSX.Element {
  const { page, loading, error, reload } = usePage(slug);
  const { settings } = useSettings();

  const title = page?.title ?? DEFAULT_PAGE_CONTENT[slug]?.title ?? 'Page';
  const content = page?.content ?? DEFAULT_PAGE_CONTENT[slug]?.content ?? '';

  useSeo({
    title: page?.seo_title ?? title,
    description:
      page?.seo_description ?? `${title} — ${settings.brand_name}, distribution de matériel agricole.`,
    path: `/${slug}`,
    noindex: page ? !page.indexable : false,
  });

  if (loading) {
    return (
      <div className="container-site max-w-3xl py-14">
        <Skeleton className="mb-8 h-10 w-2/3" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !DEFAULT_PAGE_CONTENT[slug]) {
    return (
      <div className="container-site py-16">
        <ErrorState title="Page indisponible" description={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="bg-cream">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-site py-9 sm:py-12">
          <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: title }]} />
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
        </div>
      </div>

      <article className="container-site max-w-3xl py-12">
        {slug === 'mentions-legales' && settings.legal_missing_notice ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="block font-semibold">Informations légales à compléter.</strong>
            <span className="mt-1 block">{settings.legal_missing_notice}</span>
          </div>
        ) : null}

        <div className="prose-cms max-w-none text-ink-700">
          {content.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('## ')) return <h2 key={index}>{trimmed.slice(3)}</h2>;
            if (trimmed.startsWith('### ')) return <h3 key={index}>{trimmed.slice(4)}</h3>;
            if (trimmed.startsWith('- ')) return <li key={index}>{renderInline(trimmed.slice(2))}</li>;
            if (/^\d+\.\s/.test(trimmed)) return <li key={index}>{renderInline(trimmed.replace(/^\d+\.\s/, ''))}</li>;
            return <p key={index}>{renderInline(trimmed)}</p>;
          })}
        </div>
      </article>
    </div>
  );
}

/** Rendu markdown minimal : gras et liens internes uniquement. */
function renderInline(text: string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const external = href.startsWith('http');
          return (
            <a
              key={index}
              href={href}
              {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              className="font-medium underline underline-offset-4"
            >
              {label}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
