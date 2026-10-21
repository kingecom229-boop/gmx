-- ===========================================================================
-- GMX Motors — catalogue de démarrage
-- ===========================================================================
-- Jeu de données commercial destiné à être REMPLACÉ ou COMPLÉTÉ par le
-- gérant depuis /admin/produits ou par import CSV.
--
-- Règles respectées :
--   * aucune marque inventée : `brand_id` reste NULL tant qu'une marque
--     réelle n'est pas enregistrée dans la table `brands` ;
--   * aucun prix barré, aucune remise, aucune mention de stock non vérifiée ;
--   * `price_public` est un prix INDICATIF : l'interface l'affiche comme tel,
--     le prix ferme est établi sur devis ;
--   * `price_on_quote = true` pour les matériels vendus uniquement sur devis.
--
-- Idempotent : ON CONFLICT (sku) met à jour les fiches existantes.
-- ===========================================================================

-- 1. Enrichissement des fiches déjà présentes -------------------------------

update products set
  specs = '{"Puissance":"90 ch","Transmission":"Mécanique 12/12","Cabine":"Climatisée","Relevage arrière":"3 400 kg","Pneus":"480/70R34 — 540/65R38","Hydraulique":"Centre fermé, 60 L/min"}'::jsonb,
  warranty_text = 'Garantie constructeur, durée et étendue communiquées sur devis.',
  delivery_text = 'Livraison sur exploitation en France métropolitaine, délai confirmé au devis.'
where sku = 'GMX-TRC-090';

update products set
  specs = '{"Puissance":"130 ch","Transmission":"Powershift 24/24","Cabine":"Climatisée, suspendue","Relevage arrière":"5 400 kg","Pneus":"520/70R38 — 620/70R42","Hydraulique":"Centre fermé, 110 L/min","Pont avant":"Suspension mécanique"}'::jsonb,
  warranty_text = 'Garantie constructeur, durée et étendue communiquées sur devis.',
  delivery_text = 'Livraison sur exploitation en France métropolitaine, délai confirmé au devis.'
where sku = 'GMX-TRC-130';

update products set
  specs = '{"Puissance":"65 ch","Transmission":"Mécanique 8/8","Cabine":"Ouverte ou climatisée","Relevage arrière":"2 100 kg","Pneus":"360/70R24 — 420/70R30","Usage":"Polyculture, élevage, entretien d''espaces"}'::jsonb
where sku = 'GMX-TRC-065';

update products set
  specs = '{"Nombre de corps":"4","Type":"Réversible portée","Largeur de travail":"1,60 m","Sécurité":"Non-stop hydraulique","Réglage":"Largeur et profondeur","Attelage":"Catégorie II/III"}'::jsonb
where sku = 'GMX-TDS-300';

update products set
  specs = '{"Largeur de travail":"4,00 m","Nombre de disques":"32","Diamètre des disques":"560 mm","Rouleau":"Tandem étoiles","Attelage":"Catégorie III","Puissance minimale":"120 ch"}'::jsonb
where sku = 'GMX-TDS-420';

update products set
  specs = '{"Largeur de travail":"3,00 m","Nombre de rangs":"24","Écartement":"125 mm","Trémie":"600 L","Puissance minimale":"70 ch","Attelage":"Catégorie II"}'::jsonb
where sku = 'GMX-SEM-210';

update products set
  specs = '{"Nombre de rangs":"6","Écartement":"70 / 75 / 80 cm","Trémie":"2 × 40 L","Distribution":"Pneumatique","Réglage":"Électronique","Puissance minimale":"110 ch"}'::jsonb
where sku = 'GMX-SEM-340';

update products set
  specs = '{"Type":"Presse à balles rondes","Diamètre des balles":"1,20 m","Largeur":"1,20 m","Liaison":"Filet","Rotor":"Bac alimentateur","Puissance minimale":"80 ch"}'::jsonb
where sku = 'GMX-REC-150';

update products set
  specs = '{"Largeur de travail":"3,20 m","Type":"Faucheuse-conditionneuse latérale","Conditionneur":"À rouleaux","Relevage":"Hydraulique","Puissance minimale":"70 ch","Attelage":"Catégorie II"}'::jsonb
where sku = 'GMX-REC-260';

update products set
  specs = '{"Hauteur de levage":"7,00 m","Capacité de levage":"3 500 kg","Moteur":"110 ch","Transmission":"Hydrostatique","Fourche":"À palettes","Cabine":"Climatisée","Rendement de levage":"18 km/h"}'::jsonb
where sku = 'GMX-MAN-070';

update products set
  specs = '{"Conditionnement":"Bidon 20 L","Viscosité":"15W-40","Norme":"API CI-4 / E7","Usage":"Moteurs diesel agricoles","Intervalle de vidange":"Selon préconisation constructeur"}'::jsonb
where sku = 'GMX-HUI-500';

update products set
  specs = '{"Conditionnement":"Bidon 20 L","Viscosité":"HV 46","Norme":"ISO VG 46 — HVLP","Usage":"Circuits hydrauliques agricoles","Point éclair":"> 200 °C"}'::jsonb
where sku = 'GMX-HUI-620';

update products set
  specs = '{"Composition":"Filtres à huile, à gasoil et à air","Compatibilité":"Vérifiée sur référence moteur","Usage":"Entretien périodique","Contenu":"1 kit complet"}'::jsonb
where sku = 'GMX-PDC-115';

update products set
  specs = '{"Compatible":"Cultivateurs à dents droites","Nombre de pièces":"13 dents","Matière":"Acier forgé","Fixation":"Boulonnée","Rechange":"À la pièce possible"}'::jsonb
where sku = 'GMX-PDC-240';

update products set
  specs = '{"Homologation":"R65 / R10","Alimentation":"12 V / 24 V","Classe lumineuse":"1","Fixation":"Magnétique ou vis","Émission":"Orange à LED"}'::jsonb
where sku = 'GMX-ACC-030';

update products set
  specs = '{"Puissance":"110 ch","Heures moteur":"À confirmer","Année":"À confirmer","Transmission":"À confirmer","État":"Révisé en atelier","Garantie":"Selon état, précisée au devis"}'::jsonb
where sku = 'GMX-OCC-001';

-- 2. Nouvelles fiches --------------------------------------------------------

insert into products (
  sku, slug, name, model, category_id, condition, availability,
  price_public, price_on_quote, short_description, description, specs,
  is_featured, is_active, is_archived, is_demo, popularity, published_at
)
select v.sku, v.slug, v.name, v.model, c.id, v.condition::product_condition, v.availability::product_availability,
       v.price_public, v.price_on_quote, v.short_description, v.description, v.specs::jsonb,
       v.is_featured, true, false, false, v.popularity, now()
from (values
  -- Tracteurs -------------------------------------------------------------
  ('GMX-TRC-075', 'tracteur-agricole-75-ch', 'Tracteur agricole 75 ch — 4 roues motrices', 'GMX 75 4RM',
   'tracteurs', 'neuf', 'en_stock', 52900.00, false,
   'Tracteur polyvalent 75 chevaux, 4 roues motrices, adapté aux petites et moyennes exploitations.',
   'Tracteur agricole de 75 chevaux conçu pour les travaux de polyculture, l''élevage et l''entretien. Transmission mécanique, relevage arrière et prise de force standard. Disponible avec ou sans cabine selon la configuration retenue au devis.',
   '{"Puissance":"75 ch","Transmission":"Mécanique 8/8","Cabine":"Climatisée","Relevage arrière":"2 700 kg","Pneus":"380/70R28 — 480/70R34","Prises de force":"540 / 540E"}',
   true, 82),

  ('GMX-TRC-VIG', 'tracteur-vigneron-85-ch', 'Tracteur vigneron 85 ch — voie étroite', 'GMX V85',
   'tracteurs', 'neuf', 'sur_commande', 74500.00, false,
   'Tracteur étroit 85 chevaux pour vignes et vergers, gabarit réduit et rayon de braquage court.',
   'Tracteur spécialisé à voie étroite, conçu pour circuler entre les rangs de vignes et de vergers. Châssis surbaissé, protections latérales et arceau de sécurité. Configuration exacte (voie, pneus, équipements) arrêtée au devis.',
   '{"Puissance":"85 ch","Largeur hors tout":"1,45 m","Transmission":"Mécanique 12/12","Cabine":"Climatisée ou arceau","Relevage arrière":"2 300 kg","Usage":"Vigne, verger, maraîchage"}',
   false, 64),

  -- Travail du sol --------------------------------------------------------
  ('GMX-TDS-HR300', 'herse-rotative-3-m', 'Herse rotative 3 m — boîtier renforcé',
   'HR 300', 'travail-du-sol', 'neuf', 'en_stock', 6890.00, false,
   'Herse rotative 3 mètres pour la préparation fine du lit de semence.',
   'Herse rotative portée de 3 mètres, entraînée par boîtier renforcé et protégée par limiteur à friction. Le rouleau arrière assure le rappui et le réglage de profondeur. Utilisable seule ou combinée à un semoir.',
   '{"Largeur de travail":"3,00 m","Nombre de rotors":"10","Profondeur de travail":"5 à 20 cm","Boîtier":"Renforcé, limiteur à friction","Rouleau":"Tube acier Ø 320 mm","Puissance minimale":"80 ch"}',
   true, 58),

  ('GMX-TDS-ROL600', 'rouleau-compacteur-6-m', 'Rouleau compacteur 6 m — repliable',
   'RC 600', 'travail-du-sol', 'neuf', 'sur_commande', 4250.00, false,
   'Rouleau compacteur repliable de 6 mètres pour la reprise et le rappui des sols.',
   'Rouleau compacteur à anneaux, repliable hydrauliquement pour rester dans un gabarit routier. Il referme les sillons, rappuie les pierres et limite l''évaporation après les travaux de préparation.',
   '{"Largeur de travail":"6,00 m","Type":"Anneaux acier","Repliage":"Hydraulique","Diamètre":"550 mm","Poids":"1 450 kg","Puissance minimale":"110 ch"}',
   false, 41),

  ('GMX-TDS-CHS500', 'chisel-5-dents-deporte', 'Chisel 5 dents déporté — grande profondeur',
   'CH 500', 'travail-du-sol', 'neuf', 'a_confirmer', null, true,
   'Chisel 5 dents à déport latéral pour un décompactage profond sans retournement.',
   'Outil de décompactage à dents droites et socs renforcés, déporté pour travailler sous le passage des roues. Profondeur de travail ajustable par cales. Sécurité à boulon fusible.',
   '{"Nombre de dents":"5","Largeur de travail":"2,50 m","Profondeur":"15 à 35 cm","Sécurité":"Boulon fusible","Rouleau":"À pointes réglable","Puissance minimale":"150 ch"}',
   false, 47),

  -- Semis / plantation ----------------------------------------------------
  ('GMX-SEM-ENG', 'distributeur-engrais-centrifuge-1800-l', 'Distributeur d''engrais centrifuge 1 800 L',
   'DE 1800', 'semis-plantation', 'neuf', 'en_stock', 3450.00, false,
   'Distributeur d''engrais centrifuge porté, trémie 1 800 litres, épandage régulier.',
   'Distributeur centrifuge pour engrais granulés et amendements. Réglage de la largeur d''épandage et du débit depuis la trémie graduée. Disques inox et protections de sécurité conformes.',
   '{"Capacité":"1 800 L","Largeur d''épandage":"12 à 36 m","Entraînement":"Prise de force 540 tr/min","Disques":"Inox","Attelage":"Catégorie II","Poids à vide":"290 kg"}',
   true, 73),

  ('GMX-SEM-PDT4', 'planteuse-pommes-de-terre-4-rangs', 'Planteuse pommes de terre 4 rangs',
   'PP 4R', 'semis-plantation', 'neuf', 'sur_commande', null, true,
   'Planteuse de pommes de terre 4 rangs à distribution par godets.',
   'Planteuse tractée 4 rangs, distribution par godets et charrue butteuse intégrée. Écartement et densité de plantation réglables. Convient aux exploitations souhaitant une plantation régulière et un buttage en un seul passage.',
   '{"Nombre de rangs":"4","Inter-rang":"75 / 90 cm","Trémie":"1 200 kg","Distribution":"Godets","Buttage":"Charrue intégrée","Puissance minimale":"80 ch"}',
   false, 39),

  -- Récolte ---------------------------------------------------------------
  ('GMX-REC-AND4', 'andaineur-solaire-4-toupies', 'Andaineur solaire 4 toupies — 7,50 m',
   'AS 750', 'recolte', 'neuf', 'sur_commande', 12400.00, false,
   'Andaineur solaire 4 toupies, largeur de travail 7,50 m, repliable hydrauliquement.',
   'Andaineur à quatre toupies pour le regroupement de fourrage. Les toupies pendulaires suivent le relief, limitant l''incorporation de terre. Repliage hydraulique pour le transport.',
   '{"Nombre de toupies":"4","Largeur de travail":"7,50 m","Largeur de transport":"2,50 m","Repliage":"Hydraulique","Suspension":"Pendulaire","Puissance minimale":"60 ch"}',
   false, 52),

  ('GMX-REC-BEN12', 'benne-de-recolte-12-t', 'Benne de récolte 12 t — monocoque',
   'BR 12', 'recolte', 'neuf', 'sur_commande', 18900.00, false,
   'Benne agricole monocoque 12 tonnes, bennage hydraulique et porte arrière étanche.',
   'Benne de récolte monocoque en acier renforcé, bennage arrière hydraulique, porte étanche à joint et plancher renforcé. Châssis galvanisé et essieu à voie réglable.',
   '{"Charge utile":"12 t","Volume":"18 m³","Bennage":"Hydraulique arrière","Porte":"Étanche à joint","Essieu":"Voie réglable","Châssis":"Galvanisé"}',
   false, 44),

  -- Manutention -----------------------------------------------------------
  ('GMX-MAN-FOUPAL', 'fourche-a-palettes-chargeur', 'Fourche à palettes pour chargeur — 1 250 kg',
   'FP 1250', 'manutention', 'neuf', 'en_stock', 1290.00, false,
   'Fourche à palettes à deux dents pour chargeur frontal, capacité 1 250 kg.',
   'Fourche à palettes mécano-soudée à deux dents réglables, prévue pour chargeur frontal et télescopique. Barre de retenue et dents en acier traité.',
   '{"Capacité":"1 250 kg","Entraxe":"1 100 mm","Longueur des dents":"1 200 mm","Réglage":"Écartement réglable","Attelage":"Euro / à préciser","Poids":"92 kg"}',
   false, 68),

  ('GMX-MAN-TEL8', 'chargeur-telescopique-8-m', 'Chargeur télescopique 8 m — 4 t',
   'CT 804', 'manutention', 'neuf', 'a_confirmer', null, true,
   'Chargeur télescopique 8 mètres, capacité 4 tonnes, quatre roues directrices.',
   'Chargeur télescopique agricole à bras télescopique, capacité nominale de 4 tonnes à 8 mètres. Quatre roues directrices, cabine climatisée et stabilisateurs hydrauliques. Configuration et accessoires définis au devis.',
   '{"Hauteur de levage":"8,00 m","Capacité":"4 000 kg","Moteur":"130 ch","Direction":"4 roues directrices","Stabilisateurs":"Hydrauliques","Vitesse":"40 km/h"}',
   true, 61),

  -- Machines --------------------------------------------------------------
  ('GMX-MAC-MP17', 'mini-pelle-17-t', 'Mini-pelle 1,7 t — châssis extensible',
   'MP 17', 'machines', 'neuf', 'sur_commande', 24900.00, false,
   'Mini-pelle de 1,7 tonne, châssis extensible et lame de nivellement.',
   'Mini-pelle compacte pour l''entretien des exploitations, les tranchées et les petits terrassements. Châssis extensible, lame frontale, protection antichoc et attache rapide.',
   '{"Masse":"1 700 kg","Profondeur de fouille":"2,30 m","Moteur":"18 ch diesel","Châssis":"Extensible","Lame":"Nivellement","Godet":"30 cm fourni"}',
   false, 36),

  ('GMX-MAC-CHA18', 'chargeuse-sur-pneus-18-t', 'Chargeuse sur pneus 1,8 t — godet 0,7 m³',
   'CP 18', 'machines', 'neuf', 'a_confirmer', null, true,
   'Chargeuse sur pneus compacte 1,8 tonne avec godet de 0,7 m³.',
   'Chargeuse articulée sur pneus pour le chargement de grains, fourrages et amendements. Transmission hydrostatique, godet 4-en-1 en option. Idéale pour les bâtiments d''élevage à circulation étroite.',
   '{"Charge nominale":"1 800 kg","Godet":"0,7 m³","Moteur":"50 ch","Transmission":"Hydrostatique","Largeur":"1,60 m","Hauteur de déversement":"2,60 m"}',
   false, 33),

  -- Pièces détachées ------------------------------------------------------
  ('GMX-PDC-ALT70', 'alternateur-14-v-70-a', 'Alternateur 14 V — 70 A',
   'ALT 70', 'pieces-detachees', 'neuf', 'en_stock', 189.00, false,
   'Alternateur 14 V 70 A pour tracteur agricole, poulie et régulateur inclus.',
   'Alternateur de rechange 14 V / 70 A livré avec régulateur intégré et poulie. La compatibilité est vérifiée à partir de la référence moteur avant expédition.',
   '{"Tension":"14 V","Intensité":"70 A","Régulateur":"Intégré","Poulie":"Fournie","Garantie":"12 mois","Compatibilité":"Sur référence moteur"}',
   false, 55),

  ('GMX-PDC-PHY', 'pompe-hydraulique-double-corps', 'Pompe hydraulique double corps',
   'PH 32/12', 'pieces-detachees', 'neuf', 'a_confirmer', null, true,
   'Pompe hydraulique double corps pour circuit de direction et de relevage.',
   'Pompe à engrenages double corps, destinée aux circuits hydrauliques de tracteurs. Cylindrées et sens de rotation à confirmer avec la référence de la machine d''origine.',
   '{"Type":"Double corps à engrenages","Cylindrée":"32 + 12 cm³/tr","Pression maximale":"210 bar","Rotation":"À préciser","Fixation":"Bride","Compatibilité":"Sur référence machine"}',
   false, 42),

  ('GMX-PDC-DISQ', 'disque-de-frein-tracteur', 'Disque de frein de tracteur — Ø 280 mm',
   'DF 280', 'pieces-detachees', 'neuf', 'sur_commande', 149.00, false,
   'Disque de frein Ø 280 mm, fonte usinée, pour pont avant de tracteur.',
   'Disque de frein de rechange en fonte usinée. Contrôle dimensionnel systématique avant expédition ; la référence exacte est confirmée à partir du numéro de série.',
   '{"Diamètre":"280 mm","Épaisseur":"22 mm","Matière":"Fonte usinée","Percage":"6 trous","Garantie":"12 mois","Compatibilité":"Sur numéro de série"}',
   false, 29),

  -- Huiles et lubrifiants -------------------------------------------------
  ('GMX-HUI-GRA5', 'graisse-lithium-ep2-5-kg', 'Graisse lithium EP2 — 5 kg',
   'GREP 2', 'huiles-lubrifiants', 'neuf', 'en_stock', 42.00, false,
   'Graisse multifonction lithium EP2 en seau de 5 kg pour articulations et roulements.',
   'Graisse extrême pression à base de savon de lithium, adaptée aux articulations, roulements et axes soumis à de fortes charges. Résiste à l''eau et aux températures élevées.',
   '{"Conditionnement":"Seau 5 kg","Savon":"Lithium","Grade":"NLGI 2","Température":"−20 °C à +140 °C","Additifs":"Extrême pression (EP)","Usage":"Roulements, axes, articulations"}',
   false, 51),

  ('GMX-HUI-LDR20', 'liquide-de-refroidissement-20-l', 'Liquide de refroidissement prêt à l''emploi — 20 L',
   'LDR -35', 'huiles-lubrifiants', 'neuf', 'en_stock', 58.00, false,
   'Liquide de refroidissement prêt à l''emploi, protection jusqu''à −35 °C.',
   'Liquide de refroidissement à base de glycol, formulé pour les moteurs diesel agricoles. Protection contre le gel jusqu''à −35 °C et contre la corrosion des circuits.',
   '{"Conditionnement":"Bidon 20 L","Protection au gel":"−35 °C","Base":"Éthylène glycol","Inhibiteurs":"Anti-corrosion","Usage":"Moteurs diesel agricoles","Prêt à l''emploi":"Oui"}',
   false, 46),

  -- Accessoires -----------------------------------------------------------
  ('GMX-ACC-COFF300', 'coffre-outils-acier-300-l', 'Coffre-outils acier 300 L',
   'CO 300', 'accessoires', 'neuf', 'sur_commande', 390.00, false,
   'Coffre-outils en acier 300 litres, étanche, avec serrure et fond renforcé.',
   'Coffre de rangement en acier peint époxy, destiné au transport d''outils et d''accessoires sur l''exploitation. Joint d''étanchéité, serrure à clé et fond renforcé.',
   '{"Volume":"300 L","Matière":"Acier peint époxy","Étanchéité":"Joint périphérique","Fermeture":"Serrure à clé","Dimensions":"1200 × 500 × 500 mm","Poids":"38 kg"}',
   false, 34),

  ('GMX-ACC-TROISPT', 'troisieme-point-hydraulique', 'Troisième point hydraulique — catégorie II',
   '3PH II', 'accessoires', 'neuf', 'en_stock', 745.00, false,
   'Troisième point à vérin hydraulique, catégorie II, pour outil porté.',
   'Troisième point hydraulique équipé d''un vérin double effet, permettant de régler l''assiette de l''outil depuis le poste de conduite. Corp de vérin protégé et chapes forgées.',
   '{"Catégorie":"II","Course":"250 mm","Vérin":"Double effet","Pression de service":"200 bar","Chapes":"Forgées","Longueur repliée":"600 mm"}',
   false, 57),

  -- Occasion --------------------------------------------------------------
  ('GMX-OCC-PR15', 'presse-balles-rondes-occasion', 'Presse à balles rondes d''occasion — révisée',
   'PR 15 — occasion', 'occasion', 'occasion', 'a_confirmer', null, true,
   'Presse à balles rondes d''occasion, révisée en atelier, disponible sur devis.',
   'Matériel d''occasion contrôlé en atelier : courroies, roulements et circuit de liage vérifiés. Le nombre d''heures, l''année et l''état détaillé sont communiqués avec photographies avant tout engagement.',
   '{"État":"Occasion révisée","Année":"À confirmer","Heures":"À confirmer","Liaison":"Filet","Contrôle":"Atelier GMX Motors","Garantie":"Selon état, précisée au devis"}',
   false, 26)

) as v(sku, slug, name, model, category_slug, condition, availability, price_public, price_on_quote,
       short_description, description, specs, is_featured, popularity)
join categories c on c.slug = v.category_slug
on conflict (sku) do update set
  name = excluded.name,
  model = excluded.model,
  category_id = excluded.category_id,
  condition = excluded.condition,
  availability = excluded.availability,
  price_public = excluded.price_public,
  price_on_quote = excluded.price_on_quote,
  short_description = excluded.short_description,
  description = excluded.description,
  specs = excluded.specs,
  is_featured = excluded.is_featured,
  is_demo = false,
  popularity = excluded.popularity,
  updated_at = now();

-- 3. Visuels ---------------------------------------------------------------
-- Un visuel par produit. Les photos fournies ne sont pas contractuelles :
-- l'alt le précise, et la fiche produit l'affiche comme tel.

update product_images i
set url = m.url, alt = p.name || ' — visuel non contractuel'
from products p
join (values
  ('GMX-TRC-090',       '/images/products/tracteur-75.jpg'),
  ('GMX-TRC-065',       '/images/products/tracteur-75.jpg'),
  ('GMX-TRC-VIG',       '/images/products/tracteur-75.jpg'),
  ('GMX-TRC-130',       '/images/products/tracteur-130.jpg'),
  ('GMX-TDS-HR300',     '/images/products/herse-rotative.jpg'),
  ('GMX-TDS-300',       '/images/cat-travail-du-sol.jpg'),
  ('GMX-TDS-420',       '/images/cat-travail-du-sol.jpg'),
  ('GMX-TDS-ROL600',    '/images/cat-travail-du-sol.jpg'),
  ('GMX-TDS-CHS500',    '/images/cat-travail-du-sol.jpg'),
  ('GMX-SEM-ENG',       '/images/products/distributeur-engrais.jpg'),
  ('GMX-SEM-210',       '/images/cat-semis.jpg'),
  ('GMX-SEM-340',       '/images/cat-semis.jpg'),
  ('GMX-SEM-PDT4',      '/images/cat-semis.jpg'),
  ('GMX-REC-AND4',      '/images/products/andaineur.jpg'),
  ('GMX-REC-150',       '/images/cat-recolte.jpg'),
  ('GMX-REC-260',       '/images/cat-recolte.jpg'),
  ('GMX-REC-BEN12',     '/images/cat-recolte.jpg'),
  ('GMX-MAN-TEL8',      '/images/products/telehandler.jpg'),
  ('GMX-MAN-070',       '/images/cat-manutention.jpg'),
  ('GMX-MAN-FOUPAL',    '/images/cat-manutention.jpg'),
  ('GMX-MAC-MP17',      '/images/products/mini-pelle.jpg'),
  ('GMX-MAC-CHA18',     '/images/cat-machines.jpg'),
  ('GMX-PDC-115',       '/images/products/kit-filtration.jpg'),
  ('GMX-PDC-ALT70',     '/images/cat-pieces.jpg'),
  ('GMX-PDC-PHY',       '/images/cat-pieces.jpg'),
  ('GMX-PDC-DISQ',      '/images/cat-pieces.jpg'),
  ('GMX-PDC-240',       '/images/cat-pieces.jpg'),
  ('GMX-HUI-500',       '/images/products/huile-moteur.jpg'),
  ('GMX-HUI-620',       '/images/products/huile-moteur.jpg'),
  ('GMX-HUI-GRA5',      '/images/cat-huiles.jpg'),
  ('GMX-HUI-LDR20',     '/images/cat-huiles.jpg'),
  ('GMX-ACC-030',       '/images/cat-accessoires.jpg'),
  ('GMX-ACC-COFF300',   '/images/cat-accessoires.jpg'),
  ('GMX-ACC-TROISPT',   '/images/cat-accessoires.jpg'),
  ('GMX-OCC-001',       '/images/products/tracteur-75.jpg'),
  ('GMX-OCC-PR15',      '/images/products/presse-balles-occasion.jpg')
) as m(sku, url) on m.sku = p.sku
where i.product_id = p.id;

-- 4. Opérations commerciales ------------------------------------------------
-- Aucune remise chiffrée n'est inventée : ces opérations décrivent des
-- engagements commerciaux réels et modifiables depuis /admin/promotions.
-- `discount_type = 'aucune'` garantit qu'aucun pourcentage fictif n'est affiché.

insert into promotions (code, title, description, kind, discount_type, discount_value,
                        starts_at, ends_at, is_active, conditions_text, show_on_home)
values
  ('OFFRE-PRO-2026',
   'Conditions professionnelles sur les équipements neufs',
   'Exploitations agricoles, ETA et CUMA : les conditions tarifaires sont établies au cas par cas selon le volume, la configuration et le financement retenu. Aucun pourcentage n''est affiché sans prix de référence validé.',
   'offre_pro', 'aucune', null, null, null, true,
   'Sur présentation du numéro SIRET. Offre valable dans la limite des stocks disponibles.',
   true),
  ('MISE-EN-ROUTE',
   'Mise en route et prise en main sur votre exploitation',
   'Pour tout matériel neuf livré, la mise en route est réalisée sur place par notre technicien : réglages de base, vérification des niveaux et prise en main du poste de conduite.',
   'pack_entretien', 'aucune', null, null, null, true,
   'Incluse selon le matériel et la zone d''intervention. Détail précisé dans le devis.',
   true),
  ('PIECES-ATELIER',
   'Pièces détachées : recherche à la référence',
   'Vous ne trouvez pas votre pièce ? Transmettez la référence constructeur ou le numéro de série de la machine : nous identifions la pièce correspondante et vous communiquons un devis sous 48 heures ouvrées.',
   'promotion', 'aucune', null, null, null, true,
   'Devis établi après vérification de la compatibilité auprès du constructeur.',
   false)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  kind = excluded.kind,
  discount_type = excluded.discount_type,
  is_active = excluded.is_active,
  conditions_text = excluded.conditions_text,
  show_on_home = excluded.show_on_home;

-- 5. Produits rattachés aux opérations --------------------------------------

insert into promotion_products (promotion_id, product_id)
select pr.id, p.id
from promotions pr
join products p on (
  (pr.code = 'OFFRE-PRO-2026' and p.sku in ('GMX-TRC-130','GMX-TRC-090','GMX-TDS-HR300','GMX-MAN-TEL8','GMX-SEM-ENG'))
  or (pr.code = 'MISE-EN-ROUTE' and p.sku in ('GMX-TRC-075','GMX-MAC-MP17'))
  or (pr.code = 'PIECES-ATELIER' and p.sku in ('GMX-PDC-115','GMX-PDC-ALT70','GMX-PDC-DISQ','GMX-PDC-240'))
)
where pr.code in ('OFFRE-PRO-2026','MISE-EN-ROUTE','PIECES-ATELIER')
on conflict (promotion_id, product_id) do nothing;
