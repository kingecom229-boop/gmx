-- ============================================================================
-- GMX Motors — Migration 0004 : contenu éditorial de base
-- ----------------------------------------------------------------------------
-- Contient uniquement du contenu réel et vérifiable :
--   · paramètres du site (coordonnées laissées vides volontairement),
--   · navigation,
--   · FAQ rédigée à partir du fonctionnement réel du site,
--   · pages légales et informatives.
--
-- AUCUNE donnée commerciale inventée : pas de marque partenaire, pas de
-- certification, pas de chiffre d'affaires, pas d'adresse fictive.
--
-- Rejouable : ON CONFLICT sur les clés uniques, NOT EXISTS ailleurs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Paramètres du site
-- ---------------------------------------------------------------------------
INSERT INTO site_settings (key, value) VALUES
  ('brand_name', '"GMX Motors"'),
  ('tagline', '"Matériel agricole professionnel, disponible sur demande de devis"'),
  ('footer_text', '"GMX Motors — matériel agricole neuf et occasion, pièces détachées et consommables. Catalogue professionnel, prix communiqués sur devis."'),
  ('announcement_enabled', 'false'),
  ('announcement_text', '""'),
  ('announcement_url', '""'),
  ('announcement_tone', '"info"'),
  ('hero_title', '"Votre matériel agricole, sélectionné pour durer"'),
  ('hero_subtitle', '"Tracteurs, machines, préparation du sol, semis, récolte et pièces détachées. Consultez le catalogue, sélectionnez vos équipements et recevez un devis détaillé sous 48 heures ouvrées."'),
  ('hero_image', '"/images/hero-tracteur.jpg"'),
  ('hero_primary_cta_label', '"Consulter le catalogue"'),
  ('hero_primary_cta_url', '"/catalogue"'),
  ('hero_secondary_cta_label', '"Comment demander un devis"'),
  ('hero_secondary_cta_url', '"/devis"'),
  ('about_title', '"Un interlocuteur unique pour votre parc matériel"'),
  ('about_text', '"GMX Motors accompagne les exploitations agricoles, les ETA et les collectivités dans le choix de leur matériel. Notre équipe vous conseille sur les équipements adaptés à vos sols, vos cultures et vos volumes de travail, puis vous transmet un devis clair, détaillé et sans engagement."'),
  ('about_image', '"/images/entreprise.jpg"'),
  ('pros_title', '"Vous êtes un professionnel ?"'),
  ('pros_text', '"Conditions dédiées, livraison sur site, formation à la prise en main et suivi après-vente : parlez-nous de votre projet, nous construisons une proposition adaptée à votre structure."'),
  ('contact_email', '"gmx@gmx.com"'),
  ('quote_notification_email', '"gmx@gmx.com"'),
  ('contact_phone', '""'),
  ('contact_hours', '""'),
  ('contact_address', '""'),
  ('delivery_text', '""'),
  ('warranty_text', '""'),
  ('newsletter_enabled', 'false'),
  ('newsletter_label', '""'),
  ('legal_company_name', '""'),
  ('legal_company_details', '""'),
  ('legal_missing_notice', '"Les informations légales de l''entreprise (raison sociale, adresse du siège, SIREN/RCS, TVA intracommunautaire, hébergeur) n''ont pas encore été renseignées. Ce site ne peut pas être mis en ligne publiquement avant la complétion de ces mentions obligatoires."')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ---------------------------------------------------------------------------
-- Navigation
-- ---------------------------------------------------------------------------
INSERT INTO navigation_items (label, url, placement, sort_order, is_active)
SELECT * FROM (VALUES
  ('Accueil', '/', 'header', 0, true),
  ('Catalogue', '/catalogue', 'header', 1, true),
  ('Tracteurs', '/categorie/tracteurs', 'header', 2, true),
  ('Occasion', '/categorie/occasion', 'header', 3, true),
  ('Offres', '/offres', 'header', 4, true),
  ('Nous contacter', '/contact', 'header', 5, true),

  ('Catalogue', '/catalogue', 'footer', 10, true),
  ('Offres en cours', '/offres', 'footer', 11, true),
  ('Demander un devis', '/devis', 'footer', 12, true),
  ('Nous contacter', '/contact', 'footer', 13, true),
  ('À propos', '/a-propos', 'footer', 14, true),
  ('Livraison et garantie', '/livraison-garantie', 'footer', 15, true),
  ('Mentions légales', '/mentions-legales', 'footer', 20, true),
  ('Politique de confidentialité', '/confidentialite', 'footer', 21, true),
  ('Conditions générales de vente', '/cgv', 'footer', 22, true)
) AS v(label, url, placement, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM navigation_items);

-- ---------------------------------------------------------------------------
-- FAQ — uniquement des réponses correspondant au fonctionnement réel du site
-- ---------------------------------------------------------------------------
INSERT INTO faqs (question, answer, category, sort_order, is_active)
SELECT * FROM (VALUES
  ('Comment obtenir un prix ?', 'Les prix affichés dans le catalogue sont indicatifs et susceptibles d''évolution. Le prix ferme et définitif figure sur le devis que nous vous transmettons après étude de votre demande. Pour un devis précis, ajoutez les équipements à votre sélection, complétez le formulaire et nous revenons vers vous sous 48 heures ouvrées.', 'devis', 1, true),
  ('Comment se déroule une demande de devis ?', 'Vous sélectionnez un ou plusieurs équipements dans le catalogue, vous indiquez les quantités et vos précisions, puis vous complétez le formulaire avec vos coordonnées. Vous recevez immédiatement un accusé de réception avec un numéro de demande, puis notre équipe vous adresse un devis détaillé.', 'devis', 2, true),
  ('Puis-je régler directement en ligne ?', 'Non. Ce site ne propose aucun paiement en ligne : ni carte bancaire, ni virement immédiat. Après validation de votre devis, les modalités de règlement sont convenues directement avec votre interlocuteur commercial.', 'devis', 3, true),
  ('Quel est le délai de réponse à une demande de devis ?', 'Nous nous engageons à répondre sous 48 heures ouvrées. Pour une demande urgente, précisez-le dans le champ message du formulaire : elle sera traitée en priorité.', 'devis', 4, true),
  ('Puis-je demander un devis pour plusieurs équipements ?', 'Oui. La sélection de devis accepte plusieurs équipements avec des quantités distinctes et une note par équipement. C''est la façon la plus efficace d''obtenir une proposition cohérente, notamment pour un ensemble tracteur et outil.', 'devis', 5, true),
  ('Vendez-vous du matériel d''occasion ?', 'Oui. Le catalogue distingue clairement le matériel neuf du matériel d''occasion, avec l''état indiqué sur chaque fiche. Les équipements d''occasion sont proposés après contrôle et leur disponibilité est confirmée au moment du devis.', 'catalogue', 6, true),
  ('Comment connaître la disponibilité d''un équipement ?', 'Chaque fiche produit indique un état de disponibilité : en stock, sur commande ou à confirmer. Cette indication est mise à jour par notre équipe et la disponibilité ferme est confirmée sur le devis.', 'catalogue', 7, true),
  ('Proposez-vous des pièces détachées et des consommables ?', 'Oui. Le catalogue comprend des pièces détachées ainsi que des huiles, lubrifiants et accessoires d''entretien. Précisez la référence ou le modèle concerné dans votre demande afin que nous vous proposions la pièce compatible.', 'catalogue', 8, true),
  ('Puis-je être livré sur mon exploitation ?', 'Les conditions de livraison dépendent du matériel et de votre localisation. Elles sont précisées sur le devis. Si vous souhaitez des informations particulières, contactez-nous avant de finaliser votre demande.', 'livraison', 9, true),
  ('Le matériel est-il garanti ?', 'Le matériel neuf bénéficie de la garantie du constructeur, dont la durée et les conditions varient selon les équipements. Le matériel d''occasion est proposé selon les conditions indiquées sur sa fiche. La garantie applicable figure sur le devis.', 'livraison', 10, true),
  ('Comment mes données personnelles sont-elles utilisées ?', 'Vos données servent uniquement à traiter votre demande et à vous recontacter. Elles ne sont ni revendues ni transmises à des tiers à des fins publicitaires. Vous disposez d''un droit d''accès, de rectification et d''effacement : écrivez-nous à l''adresse indiquée dans les mentions légales.', 'donnees', 11, true),
  ('Que deviennent mes données si je ne donne pas suite ?', 'Les demandes de devis sont conservées trois ans à compter du dernier contact, le temps nécessaire au suivi commercial et aux obligations comptables. Passé ce délai, elles sont supprimées. Vous pouvez demander la suppression anticipée à tout moment.', 'donnees', 12, true)
) AS v(question, answer, category, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM faqs);

-- ---------------------------------------------------------------------------
-- Pages légales et informatives
-- ---------------------------------------------------------------------------
INSERT INTO pages (slug, title, seo_title, seo_description, content, is_published, indexable) VALUES
  ('mentions-legales', 'Mentions légales',
   'Mentions légales — GMX Motors',
   'Informations légales relatives à l''éditeur du site GMX Motors, à l''hébergement et à la protection des données.',
   '# Mentions légales

## Éditeur du site

Les informations ci-dessous doivent être complétées avant toute mise en ligne publique.

- **Raison sociale :** _à compléter_
- **Forme juridique et capital social :** _à compléter_
- **Adresse du siège social :** _à compléter_
- **Téléphone :** _à compléter_
- **Adresse électronique :** gmx@gmx.com
- **SIREN / RCS :** _à compléter_
- **Numéro de TVA intracommunautaire :** _à compléter_
- **Directeur de la publication :** _à compléter_

## Hébergement

- **Hébergeur :** _à compléter_
- **Adresse :** _à compléter_
- **Téléphone :** _à compléter_

## Propriété intellectuelle

L''ensemble des contenus de ce site (textes, images, identité visuelle, code) est la propriété de l''éditeur, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.

## Médiation de la consommation

Conformément à l''article L. 612-1 du Code de la consommation, le consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d''un litige. Le médiateur compétent doit être désigné ici. _À compléter._

## Limitation de responsabilité

Les informations publiées sur ce site sont fournies à titre indicatif. Les prix affichés ne constituent pas une offre ferme : seul le devis transmis par l''éditeur fait foi. L''éditeur ne saurait être tenu responsable des erreurs ou omissions, ni de l''indisponibilité temporaire du site.',
   true, true),

  ('confidentialite', 'Politique de confidentialité',
   'Politique de confidentialité — GMX Motors',
   'Traitement des données personnelles, finalités, durées de conservation et droits des utilisateurs du site GMX Motors.',
   '# Politique de confidentialité

Cette politique décrit la manière dont les données collectées sur ce site sont traitées, conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.

## Responsable du traitement

Le responsable du traitement est l''éditeur du site, dont les coordonnées figurent dans les mentions légales.

## Données collectées et finalités

| Données | Finalité | Base légale | Durée de conservation |
| --- | --- | --- | --- |
| Nom, entreprise, e-mail, téléphone, code postal, ville, type de projet, message, équipement sélectionné | Traitement de la demande de devis et suivi commercial | Exécution de mesures précontractuelles | 3 ans après le dernier contact |
| Nom, e-mail, téléphone, message | Réponse à une demande de contact | Intérêt légitime | 3 ans après le dernier contact |
| Adresse e-mail | Envoi de la lettre d''information, si l''inscription est activée et le consentement donné | Consentement | Jusqu''au retrait du consentement |
| Identifiants des utilisateurs du back-office | Sécurisation de l''accès à l''administration | Obligation légale et intérêt légitime | Durée du compte |
| Journal des opérations administratives | Traçabilité et sécurité | Obligation légale | 1 an |

## Données non collectées

Ce site ne collecte **ni données bancaires, ni données de paiement** : aucun paiement en ligne n''est proposé. Aucun cookie publicitaire ou de mesure d''audience tiers n''est déposé.

## Sécurité

- Les accès administratifs exigent une authentification et sont vérifiés côté serveur à chaque opération.
- Un visiteur ne peut accéder qu''aux demandes de devis qu''il a lui-même déposées, au moyen de la clé privée fournie lors de la confirmation.
- Les prix, rôles et paramètres ne peuvent pas être modifiés depuis le navigateur.

## Destinataires

Les données sont destinées aux personnes habilitées de l''entreprise. Elles peuvent être transmises aux prestataires techniques nécessaires au fonctionnement du site (hébergement, envoi d''e-mails), dans la limite de leurs missions. Elles ne sont ni vendues ni louées.

## Vos droits

Vous disposez d''un droit d''accès, de rectification, d''effacement, de limitation, d''opposition et de portabilité. Vous pouvez retirer votre consentement à tout moment. Pour exercer ces droits, écrivez à l''adresse indiquée dans les mentions légales. Une réponse vous sera adressée dans un délai d''un mois.

Vous pouvez également introduire une réclamation auprès de la Commission nationale de l''informatique et des libertés (CNIL).',
   true, true),

  ('cgv', 'Conditions générales de vente',
   'Conditions générales de vente — GMX Motors',
   'Conditions applicables aux demandes de devis, offres et commandes de matériel agricole via le site GMX Motors.',
   '# Conditions générales de vente

Les présentes conditions s''appliquent aux relations entre l''éditeur du site et tout professionnel ou consommateur sollicitant un devis.

## Objet

Le présent site est un catalogue professionnel. Il ne constitue pas un site de commerce électronique au sens du paiement en ligne : **aucune transaction financière n''est réalisée sur ce site**.

## Demande de devis

La saisie d''une demande de devis ne constitue ni une commande ni un engagement d''achat. Elle permet à l''éditeur d''étudier le besoin et d''établir une proposition chiffrée.

Les prix affichés dans le catalogue sont **indicatifs** et susceptibles d''évolution. Ils ne constituent pas une offre ferme.

## Offre et devis

Le devis transmis précise la désignation des équipements, les quantités, le prix, les conditions de livraison, les garanties applicables et la durée de validité de l''offre.

Le devis n''engage l''éditeur que pendant la durée de validité qui y est indiquée.

## Commande

La commande n''est formée qu''après acceptation écrite du devis par le client et, le cas échéant, versement de l''acompte convenu. Les modalités et délais de paiement figurent sur le devis accepté.

## Disponibilité

Les indications de disponibilité du catalogue sont communiquées à titre informatif. La disponibilité ferme est confirmée sur le devis.

## Livraison

Les conditions, délais et frais de livraison sont précisés sur le devis. Le transfert des risques s''opère selon les conditions convenues entre les parties.

## Garantie

Le matériel neuf bénéficie de la garantie du constructeur. Le matériel d''occasion est proposé selon les conditions indiquées sur sa fiche produit et sur le devis. La garantie ne couvre pas l''usure normale ni les dommages résultant d''une utilisation non conforme.

## Rétractation

Les commandes portant sur des biens confectionnés selon les spécifications du client ou sur des professionnels dans le cadre de leur activité peuvent ne pas ouvrir droit au délai de rétractation. Les conditions applicables sont précisées sur le devis.

## Réclamations et médiation

Toute réclamation doit être adressée par écrit à l''adresse figurant dans les mentions légales. Le consommateur peut recourir gratuitement à un médiateur de la consommation, dont les coordonnées sont indiquées dans les mentions légales.

## Droit applicable

Les présentes conditions sont régies par le droit français.

---

_Ces conditions sont fournies comme base de travail. Elles doivent être validées par un professionnel du droit et complétées des informations propres à l''entreprise avant toute utilisation commerciale._',
   true, true),

  ('livraison-garantie', 'Livraison et garantie',
   'Livraison et garantie — GMX Motors',
   'Informations sur la livraison du matériel agricole et les garanties applicables au matériel neuf et d''occasion.',
   '# Livraison et garantie

## Livraison

Les conditions de livraison dépendent du type de matériel, de son poids et de votre localisation. Elles sont précisées sur le devis que nous vous transmettons.

Plusieurs configurations sont possibles selon les équipements :

- retrait sur site après préparation du matériel,
- livraison par transporteur pour le matériel léger et les pièces détachées,
- transport spécifique et mise en service pour les machines lourdes.

Si vous avez une contrainte d''accès ou de délai, précisez-la dans votre demande de devis : nous en tiendrons compte dans la proposition.

## Garantie du matériel neuf

Le matériel neuf bénéficie de la garantie du constructeur. Sa durée et son étendue varient selon les équipements et les marques. Les conditions exactes figurent sur le devis et dans le document de garantie remis à la livraison.

La garantie couvre les défauts de matière et de fabrication. Elle ne couvre pas l''usure normale des pièces, les dommages résultant d''une utilisation non conforme, d''un défaut d''entretien ou d''une intervention non autorisée.

## Matériel d''occasion

Le matériel d''occasion est proposé après contrôle. Son état et les éléments inclus sont décrits sur sa fiche produit. Les conditions de garantie applicables sont précisées sur le devis.

## Pièces détachées et consommables

Les pièces détachées bénéficient de la garantie légale de conformité. Précisez la référence ou le modèle de votre machine afin que nous vous proposions une pièce compatible.',
   true, true),

  ('a-propos', 'À propos de GMX Motors',
   'À propos — GMX Motors',
   'Présentation de GMX Motors : matériel agricole professionnel, pièces détachées et accompagnement sur devis.',
   '# À propos de GMX Motors

GMX Motors accompagne les professionnels de l''agriculture dans le choix et l''acquisition de leur matériel : tracteurs, machines, outils de préparation du sol, semoirs, matériel de récolte, équipements de manutention, pièces détachées et consommables.

## Notre façon de travailler

Nous partons de votre situation réelle — vos sols, vos cultures, vos surfaces, vos volumes de travail — pour proposer des équipements adaptés plutôt qu''une gamme standard. Chaque demande fait l''objet d''une étude et d''un devis détaillé.

## Un interlocuteur unique

Un seul contact suit votre dossier de la demande de devis jusqu''à la mise en service. Vous savez à qui vous adresser, et votre historique reste accessible.

## Nous contacter

Pour toute question, utilisez le formulaire de contact ou adressez votre demande à l''adresse figurant dans le pied de page du site.

---

_Cette page est modifiable depuis le back-office : section « Contenus », onglet « Pages éditoriales »._',
   true, true)
ON CONFLICT (slug) DO NOTHING;
