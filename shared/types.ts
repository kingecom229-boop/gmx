/**
 * Types partagés entre le frontend React et le serveur Express.
 * Aucune logique sensible ici : uniquement des formes de données.
 */

export type ProductCondition = 'neuf' | 'occasion';

export type ProductAvailability =
  | 'en_stock'
  | 'sur_commande'
  | 'a_confirmer'
  | 'indisponible';

export type PromotionKind =
  | 'promotion'
  | 'remise'
  | 'lot'
  | 'pack_entretien'
  | 'offre_pro'
  | 'destockage'
  | 'saisonniere';

export type DiscountType = 'pourcentage' | 'montant' | 'aucune';

export type QuoteStatus =
  | 'nouveau'
  | 'en_cours'
  | 'devis_prepare'
  | 'envoye'
  | 'accepte'
  | 'refuse'
  | 'cloture';

export type NotificationStatus = 'en_attente' | 'envoye' | 'echec' | 'ignore';

export type UserRole = 'admin' | 'commercial' | 'client';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at?: string;
  updated_at?: string;
  /** Champ calculé côté client */
  product_count?: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  model: string | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  condition: ProductCondition;
  availability: ProductAvailability;
  price_public: number | null;
  price_on_quote: boolean;
  short_description: string | null;
  description: string | null;
  specs: Record<string, string>;
  warranty_text: string | null;
  delivery_text: string | null;
  is_featured: boolean;
  is_active: boolean;
  is_archived: boolean;
  is_demo: boolean;
  view_count: number;
  popularity: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** Jointures résolues */
  brand?: Brand | null;
  category?: Category | null;
  subcategory?: Category | null;
  product_images?: ProductImage[];
  product_attributes?: ProductAttribute[];
  active_promotion?: PromotionForProduct | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  group_name: string;
  label: string;
  value: string;
  sort_order: number;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string | null;
  kind: PromotionKind;
  discount_type: DiscountType;
  discount_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  banner_image_url: string | null;
  conditions_text: string | null;
  show_on_home: boolean;
  created_at?: string;
  updated_at?: string;
  products?: Product[];
}

export interface PromotionForProduct {
  promotion_id: string;
  promo_price: number | null;
  code: string;
  title: string;
  kind: PromotionKind;
  discount_type: DiscountType;
  discount_value: number | null;
  ends_at: string | null;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  indexable: boolean;
  seo_title: string | null;
  seo_description: string | null;
  updated_at?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  placement: 'header' | 'footer';
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface QuoteItemInput {
  product_id: string;
  quantity: number;
  note?: string;
}

export interface QuoteRequestInput {
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  phone: string;
  postal_code: string;
  city: string;
  project_type?: string;
  message?: string;
  contact_preference?: string;
  consent: boolean;
  items: QuoteItemInput[];
  /** Piège à robots : doit rester vide */
  website?: string;
  /** Jeton anti-rejeu fourni par GET /api/quotes/prepare */
  form_token?: string;
  source?: string;
}

export interface QuoteItem {
  id: string;
  quote_request_id: string;
  product_id: string | null;
  sku: string | null;
  name: string;
  quantity: number;
  note: string | null;
  unit_price_indicative: number | null;
  price_on_quote: boolean;
  product_snapshot: Record<string, unknown>;
  sort_order: number;
}

export interface QuoteEvent {
  id: string;
  quote_request_id: string;
  actor_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface QuoteRequest {
  id: string;
  reference: string | null;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string;
  phone: string;
  postal_code: string;
  city: string;
  project_type: string | null;
  message: string | null;
  contact_preference: string | null;
  consent: boolean;
  status: QuoteStatus;
  assigned_to: string | null;
  internal_notes: string | null;
  notification_status: NotificationStatus;
  notification_sent_at: string | null;
  notification_error: string | null;
  ack_status: NotificationStatus;
  ack_error: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  quote_items?: QuoteItem[];
  quote_events?: QuoteEvent[];
  assigned_profile?: { id: string; full_name: string | null; email: string } | null;
}

export interface DashboardStats {
  quotes_total: number;
  quotes_new: number;
  quotes_in_progress: number;
  quotes_closed: number;
  products_active: number;
  products_unavailable: number;
  products_promoted: number;
  products_archived: number;
  notifications_pending: number;
  notifications_failed: number;
  recent_quotes: QuoteRequest[];
}

export interface SiteSettings {
  brand_name: string;
  tagline: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_url: string;
  announcement_tone: 'neutral' | 'offer' | 'info';
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  hero_primary_cta_label: string;
  hero_primary_cta_url: string;
  hero_secondary_cta_label: string;
  hero_secondary_cta_url: string;
  about_title: string;
  about_text: string;
  about_image: string;
  pros_title: string;
  pros_text: string;
  trust_points: { title: string; text: string }[];
  how_it_works: { title: string; text: string }[];
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_hours: string;
  delivery_text: string;
  warranty_text: string;
  newsletter_enabled: boolean;
  newsletter_label: string;
  quote_notification_email: string;
  legal_company_name: string;
  legal_company_details: string;
  legal_missing_notice: string;
  social_links: { label: string; url: string }[];
  footer_text: string;
}

/** Valeurs par défaut — aucun chiffre, partenaire ni certification inventés. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brand_name: 'GMX Motors',
  tagline: 'Matériel agricole professionnel — tracteurs, machines, pièces et lubrifiants',
  announcement_enabled: false,
  announcement_text: '',
  announcement_url: '/offres',
  announcement_tone: 'info',
  hero_title: 'Le matériel agricole qui tient la cadence',
  hero_subtitle:
    "Tracteurs, machines, pièces détachées, huiles et lubrifiants pour les exploitations et les professionnels du monde rural. Consultez le catalogue, composez votre demande de devis, un commercial vous répond.",
  hero_image: '/images/hero-tracteur.jpg',
  hero_primary_cta_label: 'Découvrir nos équipements',
  hero_primary_cta_url: '/catalogue',
  hero_secondary_cta_label: 'Demander un devis',
  hero_secondary_cta_url: '/devis',
  about_title: 'Un distributeur de matériel agricole au service des exploitations',
  about_text:
    "GMX Motors distribue du matériel agricole destiné aux exploitants, aux entreprises de travaux agricoles, aux coopératives et aux particuliers exigeants. Notre organisation repose sur une sélection rigoureuse des équipements, un conseil technique fondé sur l'usage réel en exploitation et un suivi commercial attentif de chaque demande, de la première consultation jusqu'à la mise en service.",
  about_image: '/images/entreprise.jpg',
  pros_title: 'Vous êtes un professionnel ? Parlons de votre besoin réel.',
  pros_text:
    "Flotte à renouveler, équipement spécifique, volume de pièces récurrent ou besoin sur mesure : décrivez votre activité et vos contraintes. Nous construisons une proposition adaptée à votre exploitation plutôt qu'une réponse standardisée.",
  trust_points: [
    {
      title: 'Demande de devis sans engagement',
      text: "Vous composez votre sélection, vous validez, vous recevez une réponse commerciale. Aucun paiement en ligne n'est demandé.",
    },
    {
      title: 'Prix transparents',
      text: "Lorsqu'un prix est affiché, il est clairement indiqué comme indicatif. Sinon la mention « prix sur devis » s'applique, sans ambiguïté.",
    },
    {
      title: 'Disponibilités honnêtes',
      text: 'En stock, sur commande, à confirmer ou indisponible : la disponibilité affichée correspond à ce que nous savons réellement.',
    },
    {
      title: 'Conseil technique',
      text: "Un interlocuteur identifié suit votre dossier et vous aide à arbitrer selon votre exploitation, vos surfaces et votre usage.",
    },
  ],
  how_it_works: [
    {
      title: '1. Parcourez le catalogue',
      text: 'Filtrez par catégorie, marque, état, disponibilité ou budget. Chaque fiche détaille les caractéristiques techniques.',
    },
    {
      title: '2. Composez votre demande',
      text: "Ajoutez un ou plusieurs équipements à votre demande de devis, ajustez les quantités, précisez vos contraintes.",
    },
    {
      title: '3. Validez vos coordonnées',
      text: "Quelques informations suffisent : identité, contact, localisation et nature de votre projet.",
    },
    {
      title: '4. Un commercial vous répond',
      text: "Disponibilités, prix définitif, livraison et conditions de vente vous sont confirmés par votre interlocuteur.",
    },
  ],
  contact_email: 'gmx@gmx.com',
  contact_phone: '',
  contact_address: '',
  contact_hours: 'Du lundi au vendredi, 9h — 18h',
  delivery_text:
    'Les modalités et délais de livraison sont confirmés lors de la demande de devis, selon la nature du matériel et la destination.',
  warranty_text:
    "Les conditions de garantie sont précisées équipement par équipement. Elles vous sont communiquées avec le devis lorsque l'information est confirmée.",
  newsletter_enabled: false,
  newsletter_label:
    'Recevez nos opérations commerciales et nos nouveautés matériel. Désinscription en un clic.',
  quote_notification_email: 'gmx@gmx.com',
  legal_company_name: 'GMX Motors',
  legal_company_details: '',
  legal_missing_notice:
    "Raison sociale, adresse du siège, identifiants d'immatriculation (SIREN/RCS), numéro de TVA intracommunautaire, téléphone et médiateur de la consommation restent à renseigner dans l'administration avant toute mise en ligne publique.",
  social_links: [],
  footer_text:
    'GMX Motors — distribution de matériel agricole. Les prix indiqués sont indicatifs et ne constituent pas une offre contractuelle. Toute commande est conclue après acceptation du devis.',
};

export const AVAILABILITY_LABELS: Record<ProductAvailability, string> = {
  en_stock: 'En stock',
  sur_commande: 'Sur commande',
  a_confirmer: 'Disponibilité à confirmer',
  indisponible: 'Indisponible',
};

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  neuf: 'Neuf',
  occasion: 'Occasion',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  devis_prepare: 'Devis préparé',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  cloture: 'Clôturé',
};

export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  promotion: 'Promotion',
  remise: 'Remise',
  lot: "Lot d'équipements",
  pack_entretien: "Pack d'entretien",
  offre_pro: 'Offre professionnels',
  destockage: 'Déstockage',
  saisonniere: 'Opération saisonnière',
};

export const PROJECT_TYPES = [
  'Achat de matériel neuf',
  "Achat d'occasion",
  'Renouvellement de flotte',
  'Pièces détachées et entretien',
  'Huiles et lubrifiants',
  'Projet sur mesure / besoin spécifique',
  'Autre',
] as const;

export const CONTACT_PREFERENCES = [
  'Appel téléphonique',
  'E-mail',
  'Peu importe',
] as const;
