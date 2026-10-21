-- ============================================================================
-- GMX Motors — Jeu de données de DÉMONSTRATION
-- ============================================================================
-- ⚠ DONNÉES DE TEST. Ce fichier n'est PAS une migration.
--
-- Tout ce qui est inséré ici porte is_demo = true et s'affiche avec un badge
-- « Démo » sur le site. Ces lignes servent uniquement à vérifier le
-- fonctionnement du catalogue, des filtres et du circuit de devis.
--
-- Aucune marque partenaire réelle, aucune promotion commerciale, aucun prix
-- ferme : les prix sont indicatifs et la disponibilité est marquée
-- « à confirmer » afin de ne laisser croire à aucune offre réelle.
--
-- Application :
--   supabase db reset            (local, applique migrations + seeds)
--   ou, sur un projet distant :
--   psql "$DATABASE_URL" -f supabase/seed/demo-catalogue.sql
--
-- Suppression :
--   DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE is_demo);
--   DELETE FROM products WHERE is_demo;
--   DELETE FROM categories WHERE slug IN ('tracteurs','travail-du-sol','semis-plantation',
--       'recolte','manutention','pieces-detachees','huiles-lubrifiants','accessoires',
--       'machines','occasion');
--
-- Rejouable : ON CONFLICT sur les clés uniques (slug, sku), NOT EXISTS pour les images.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Catégories (réelles : structure du catalogue attendue)
-- ---------------------------------------------------------------------------
INSERT INTO categories (slug, name, description, image_url, sort_order, is_active, show_on_home) VALUES
  ('tracteurs',          'Tracteurs',                        'Tracteurs agricoles neufs et d''occasion, du compact utilitaire au tracteur de grande puissance.', '/images/cat-tracteurs.jpg',     1, true, true),
  ('travail-du-sol',     'Travail du sol',                   'Charrues, déchaumeurs, cultivateurs, herses et outils de préparation des parcelles.',              '/images/cat-travail-du-sol.jpg', 2, true, false),
  ('semis-plantation',   'Semis et plantation',              'Semoirs, distributeurs et planteuses pour toutes les cultures.',                                      '/images/cat-semis.jpg',          3, true, true),
  ('recolte',            'Récolte',                          'Moissonneuses, presses, ensileuses et matériel de fenaison.',                                         '/images/cat-recolte.jpg',        4, true, true),
  ('manutention',        'Manutention',                      'Chargeurs, télescopiques et équipements de levage pour l''exploitation.',                              '/images/cat-manutention.jpg',    5, true, true),
  ('pieces-detachees',   'Pièces détachées',                 'Pièces d''usure, filtration, hydraulique et électricité pour l''entretien du parc.',                  '/images/cat-pieces.jpg',         6, true, true),
  ('huiles-lubrifiants', 'Huiles et lubrifiants',            'Huiles moteur, hydrauliques, transmission et graisses pour l''entretien courant.',                     '/images/cat-huiles.jpg',         7, true, true),
  ('accessoires',        'Accessoires et consommables',      'Équipements de cabine, signalisation, outillage et petits consommables.',                              NULL,                              8, true, true),
  ('machines',           'Machines et équipements',          'Équipements spécialisés et machines pour cultures particulières.',                                     '/images/cat-machines.jpg',       9, true, true),
  ('occasion',           'Matériel d''occasion',             'Parc d''occasion révisé, disponible selon arrivages.',                                                 '/images/cat-occasion.jpg',      10, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Produits de démonstration
-- ----------------------------------------------------------------===========
-- Les slugs sont stables ; les prix sont indicatifs ; is_demo = true.
-- `search_vector` est une colonne GÉNÉRÉE (migration 0003) : on ne l'insère jamais.
WITH cat AS (
  SELECT slug, id FROM categories
  WHERE slug IN ('tracteurs','travail-du-sol','semis-plantation','recolte','manutention',
                 'pieces-detachees','huiles-lubrifiants','accessoires','machines','occasion')
)
INSERT INTO products (
  sku, name, slug, model, category_id, condition, availability,
  price_public, price_on_quote, short_description, description,
  specs, popularity, is_featured, is_active, is_demo, published_at
)
SELECT
  p.sku, p.name, p.slug, p.model, c.id, p.condition::product_condition, p.availability::product_availability,
  p.price_public, p.price_on_quote, p.short_description, p.description,
  p.specs::jsonb,
  p.popularity, p.popularity >= 70, true, true, now()
FROM (VALUES
  ('GMX-TRC-090', 'Tracteur agricole 90 ch', 'tracteur-agricole-90-ch', 'Configuration 90 ch',
   'tracteurs', 'neuf', 'a_confirmer', 68500.00, false,
   'Tracteur polyvalent 90 chevaux pour les travaux de polyculture et d''élevage.',
   'Tracteur agricole 90 chevaux conçu pour les exploitations de polyculture-élevage. Transmission adaptée aux travaux de traction comme aux travaux à la prise de force, cabine confortable pour les longues journées et relevage arrière dimensionné pour les outils portés courants. Configuration de série présentée ; les options sont définies avec vous sur le devis.',
   '{"Puissance":"90 ch","Transmission":"À préciser","Relevage arrière":"À préciser","Cabine":"Climatisée","Poids":"À préciser"}'::json, 90),

  ('GMX-TRC-130', 'Tracteur agricole 130 ch', 'tracteur-agricole-130-ch', 'Configuration 130 ch',
   'tracteurs', 'neuf', 'a_confirmer', 112000.00, false,
   'Tracteur 130 chevaux pour grandes cultures et travaux lourds.',
   'Tracteur de 130 chevaux destiné aux exploitations de grandes cultures. Hydraulique à débit élevé pour les outils demandeurs, cabine suspendue et commandes regroupées pour réduire la fatigue lors des gros chantiers. Configuration et équipements à définir selon vos travaux.',
   '{"Puissance":"130 ch","Hydraulique":"Débit élevé","Cabine":"Suspendue, climatisée","Prise de force":"540/1000 tr/min"}'::json, 80),

  ('GMX-TRC-065', 'Tracteur compact utilitaire 65 ch', 'tracteur-compact-65-ch', 'Configuration 65 ch',
   'tracteurs', 'neuf', 'sur_commande', 42900.00, false,
   'Tracteur compact 65 chevaux pour l''élevage et les espaces restreints.',
   'Tracteur compact 65 chevaux pensé pour les bâtiments d''élevage, les cours de ferme et les parcelles étroites. Rayon de braquage réduit, chargeur frontal compatible et entretien accessible.',
   '{"Puissance":"65 ch","Gabarit":"Compact","Chargeur frontal":"Compatible","Utilisation":"Élevage, espaces restreints"}'::json, 65),

  ('GMX-TDS-300', 'Charrue réversible 4 corps', 'charrue-reversible-4-corps', '4 corps',
   'travail-du-sol', 'neuf', 'a_confirmer', NULL, true,
   'Charrue réversible 4 corps pour labour de remise en culture.',
   'Charrue réversible à 4 corps pour le labour des parcelles en remise en culture. Réglage de la largeur de raie, sécurité non-stop et corps adaptés aux terres argileuses comme aux limons. Largeur de travail et type de corps à définir selon votre tracteur.',
   '{"Corps":"4","Type":"Réversible","Sécurité":"Non-stop","Largeur de raie":"Réglable"}'::json, 55),

  ('GMX-TDS-420', 'Déchaumeur à disques 4 m', 'dechaumeur-a-disques-4-m', '4 mètres',
   'travail-du-sol', 'neuf', 'a_confirmer', NULL, true,
   'Déchaumeur à disques indépendants 4 mètres pour la préparation superficielle.',
   'Déchaumeur à disques indépendants de 4 mètres pour la destruction des couverts et la préparation superficielle avant semis. Roulage arrière au choix, réglage de la profondeur depuis la cabine et châssis adapté aux tracteurs de puissance moyenne.',
   '{"Largeur":"4 m","Disques":"Indépendants","Profondeur":"Réglable","Rouleau":"Au choix"}'::json, 60),

  ('GMX-SEM-210', 'Semoir mécanique 3 m', 'semoir-mecanique-3-m', '3 mètres',
   'semis-plantation', 'neuf', 'a_confirmer', 18900.00, false,
   'Semoir mécanique 3 mètres pour céréales et couverts.',
   'Semoir en ligne mécanique de 3 mètres pour céréales, protéagineux et couverts végétaux. Distribution mécanique éprouvée, trémie de grande capacité et profondeur de semis constante sur toute la largeur.',
   '{"Largeur":"3 m","Distribution":"Mécanique","Trémie":"Grande capacité","Usage":"Céréales, couverts"}'::json, 58),

  ('GMX-SEM-340', 'Semoir monograine 6 rangs', 'semoir-monograine-6-rangs', '6 rangs',
   'semis-plantation', 'neuf', 'a_confirmer', NULL, true,
   'Semoir monograine 6 rangs pour maïs, tournesol et betterave.',
   'Semoir monograine 6 rangs pour maïs, tournesol et betterave. Éléments semeurs indépendants, coupure de rangs et inter-rang à préciser selon votre configuration culturale.',
   '{"Rangs":"6","Cultures":"Maïs, tournesol, betterave","Éléments":"Indépendants","Inter-rang":"À préciser"}'::json, 52),

  ('GMX-REC-150', 'Presse à balles rondes', 'presse-a-balles-rondes', 'Chambre variable',
   'recolte', 'neuf', 'a_confirmer', NULL, true,
   'Presse à chambre variable pour foin, enrubannage et paille.',
   'Presse à balles rondes à chambre variable pour foin, enrubannage et paille. Ramasseur large, liage ficelle ou filet et densité réglable depuis la cabine.',
   '{"Chambre":"Variable","Ramasseur":"Large","Liage":"Ficelle ou filet","Densité":"Réglable"}'::json, 48),

  ('GMX-REC-260', 'Faucheuse-conditionneuse 3,20 m', 'faucheuse-conditionneuse-320-m', '3,20 mètres',
   'recolte', 'neuf', 'a_confirmer', NULL, true,
   'Faucheuse-conditionneuse portée 3,20 mètres pour la fenaison.',
   'Faucheuse-conditionneuse portée de 3,20 mètres pour la fenaison. Conditionneur à rouleaux ou à doigts selon le fourrage, réglage de la hauteur de coupe et sécurité de relevage.',
   '{"Largeur":"3,20 m","Conditionneur":"Rouleaux ou doigts","Portée":"Arrière","Sécurité":"Relevage"}'::json, 45),

  ('GMX-MAN-070', 'Chargeur télescopique 7 m', 'chargeur-telescopique-7-m', '7 mètres',
   'manutention', 'neuf', 'a_confirmer', NULL, true,
   'Chargeur télescopique 7 mètres pour la manutention en exploitation.',
   'Chargeur télescopique de 7 mètres de hauteur de levage pour la manutention des balles, des godets et des palettes. Cabine spacieuse, transmission hydrostatique et compatibilité avec un large choix d''outils.',
   '{"Hauteur de levage":"7 m","Transmission":"Hydrostatique","Outils":"Multiples","Cabine":"Spacieuse"}'::json, 62),

  ('GMX-PDC-115', 'Kit de filtration moteur', 'kit-de-filtration-moteur', 'Kit standard',
   'pieces-detachees', 'neuf', 'sur_commande', 189.00, false,
   'Kit complet de filtres pour l''entretien périodique du moteur.',
   'Kit de filtration complet pour l''entretien périodique : filtre à huile, filtre à gasoil, filtre à air et filtre hydraulique selon la configuration. Précisez la référence de votre machine afin de recevoir le kit compatible.',
   '{"Contenu":"Huile, gasoil, air, hydraulique","Usage":"Entretien périodique","Compatibilité":"À confirmer"}'::json, 70),

  ('GMX-PDC-240', 'Jeu de dents de cultivateur', 'jeu-de-dents-de-cultivateur', 'Jeu complet',
   'pieces-detachees', 'neuf', 'sur_commande', 142.00, false,
   'Jeu de dents de rechange pour cultivateur et déchaumeur.',
   'Jeu de dents de rechange pour cultivateur et déchaumeur. Acier traité pour limiter l''usure en terre abrasive. Nombre de dents et fixation à préciser selon votre outil.',
   '{"Type":"Dents de cultivateur","Matière":"Acier traité","Fixation":"À préciser"}'::json, 66),

  ('GMX-HUI-500', 'Huile moteur agricole 15W-40 — 20 L', 'huile-moteur-agricole-15w40-20l', 'Bidon 20 litres',
   'huiles-lubrifiants', 'neuf', 'sur_commande', 96.00, false,
   'Huile moteur 15W-40 en bidon de 20 litres pour moteurs diesel agricoles.',
   'Huile moteur 15W-40 conditionnée en bidon de 20 litres pour moteurs diesel agricoles. Convient aux moteurs atmosphériques et suralimentés travaillant en conditions sévères. Vérifiez la préconisation du constructeur de votre moteur.',
   '{"Viscosité":"15W-40","Conditionnement":"20 L","Usage":"Moteurs diesel agricoles"}'::json, 75),

  ('GMX-HUI-620', 'Huile hydraulique HV 46 — 20 L', 'huile-hydraulique-hv46-20l', 'Bidon 20 litres',
   'huiles-lubrifiants', 'neuf', 'sur_commande', 88.00, false,
   'Huile hydraulique HV 46 en bidon de 20 litres, stabilité en température.',
   'Huile hydraulique HV 46 en bidon de 20 litres pour circuits soumis à de fortes variations de température. Bonne stabilité à l''oxydation et protection contre l''usure des pompes.',
   '{"Grade":"HV 46","Conditionnement":"20 L","Usage":"Circuits hydrauliques"}'::json, 72),

  ('GMX-ACC-030', 'Gyrophare LED homologué', 'gyrophare-led-homologue', 'Fixation aimantée',
   'accessoires', 'neuf', 'sur_commande', 74.00, false,
   'Gyrophare LED à fixation aimantée pour la signalisation des convois.',
   'Gyrophare LED à fixation aimantée pour la signalisation des ensembles agricoles sur route. Câble spiralé et prise allume-cigare. Vérifiez la réglementation applicable à votre convoi.',
   '{"Technologie":"LED","Fixation":"Aimantée","Alimentation":"12/24 V"}'::json, 50),

  ('GMX-OCC-001', 'Tracteur d''occasion 110 ch révisé', 'tracteur-occasion-110-ch-revise', 'Occasion révisée',
   'occasion', 'occasion', 'a_confirmer', NULL, true,
   'Tracteur d''occasion 110 chevaux, révisé avant livraison.',
   'Tracteur d''occasion de 110 chevaux révisé avant livraison. Historique d''entretien, heures de fonctionnement et équipements inclus confirmés au moment du devis. Matériel d''occasion : l''état réel est décrit lors de la visite ou sur le devis.',
   '{"Puissance":"110 ch","État":"Occasion révisée","Heures":"À confirmer","Garantie":"Selon devis"}'::json, 85)
) AS p(sku, name, slug, model, category_slug, condition, availability, price_public, price_on_quote, short_description, description, specs, popularity)
JOIN cat c ON c.slug = p.category_slug
ON CONFLICT (sku) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Image principale de chaque produit de démonstration
-- (réutilise les visuels de catégories déjà présents dans public/images)
-- ---------------------------------------------------------------------------
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT
  prod.id,
  coalesce(cat.image_url, '/images/cat-tracteurs.jpg'),
  'Illustration de la catégorie ' || coalesce(cat.name, 'matériel agricole'),
  0,
  true
FROM products prod
JOIN categories cat ON cat.id = prod.category_id
WHERE prod.is_demo
  AND NOT EXISTS (SELECT 1 FROM product_images img WHERE img.product_id = prod.id);

-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------
-- SELECT c.name, count(p.id) FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.name ORDER BY c.name;
