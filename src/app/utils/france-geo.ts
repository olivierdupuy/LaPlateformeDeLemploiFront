/**
 * Coordonnees des communes francaises, et la recherche qui va avec.
 *
 * Cent trente lignes de table et un algorithme de rapprochement vivaient
 * au milieu des dix-sept graphiques de la page de statistiques. Ce n'est
 * ni de l'affichage ni de la statistique : c'est un annuaire, et il se
 * lit tout seul.
 */

/** Metropole, indexe par nom normalise en tirets. */
export const FRENCH_CITIES: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522], 'marseille': [43.2965, 5.3698], 'lyon': [45.764, 4.8357],
  'toulouse': [43.6047, 1.4442], 'nice': [43.7102, 7.262], 'nantes': [47.2184, -1.5536],
  'montpellier': [43.6108, 3.8767], 'strasbourg': [48.5734, 7.7521], 'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573], 'rennes': [48.1173, -1.6778], 'reims': [49.2583, 3.6236],
  'saint-etienne': [45.4397, 4.3872], 'toulon': [43.1242, 5.928], 'le havre': [49.4944, 0.1079],
  'grenoble': [45.1885, 5.7245], 'dijon': [47.322, 5.0415], 'angers': [47.4784, -0.5632],
  'nimes': [43.8367, 4.3601], 'clermont-ferrand': [45.7772, 3.087],
  'le mans': [48.0061, 0.1996], 'aix-en-provence': [43.5297, 5.4474],
  'brest': [48.3904, -4.4861], 'tours': [47.3941, 0.6848], 'amiens': [49.894, 2.2958],
  'limoges': [45.8315, 1.2578], 'perpignan': [42.6887, 2.8948], 'metz': [49.1193, 6.1757],
  'besancon': [47.2378, 6.0241], 'orleans': [47.9029, 1.909], 'rouen': [49.4432, 1.0999],
  'mulhouse': [47.7508, 7.3359], 'caen': [49.1829, -0.3707], 'nancy': [48.6921, 6.1844],
  'argenteuil': [48.9472, 2.2467], 'saint-denis': [48.9362, 2.3574],
  'montreuil': [48.8638, 2.4484], 'roubaix': [50.6942, 3.1746], 'tourcoing': [50.7239, 3.1613],
  'avignon': [43.9493, 4.8055], 'dunkerque': [51.0343, 2.3768], 'valence': [44.9334, 4.8924],
  'pau': [43.2951, -0.3708], 'cannes': [43.5528, 7.0174], 'antibes': [43.5808, 7.1239],
  'calais': [50.9513, 1.8587], 'la rochelle': [46.1603, -1.1511], 'beziers': [43.3442, 3.2151],
  'colmar': [48.0794, 7.3588], 'bourges': [47.0833, 2.3964], 'quimper': [47.9976, -4.0977],
  'troyes': [48.2973, 4.0744], 'poitiers': [46.5802, 0.3404], 'ajaccio': [41.9192, 8.7386],
  'bastia': [42.6977, 9.4509], 'cherbourg': [49.6337, -1.6222], 'lorient': [47.7483, -3.3666],
  'bayonne': [43.4929, -1.4748], 'chambery': [45.5646, 5.9178], 'annecy': [45.8992, 6.1294],
  'saint-nazaire': [47.2736, -2.2137], 'niort': [46.3234, -0.4582], 'villeurbanne': [45.7667, 4.8795],
  'saint-malo': [48.6493, -2.0066], 'laval': [48.0726, -0.7686], 'vannes': [47.6583, -2.7607],
  'saint-brieuc': [48.5141, -2.7603], 'charleville-mezieres': [49.7733, 4.7203],
  'belfort': [47.6397, 6.8654], 'saint-quentin': [49.8467, 3.2875],
  'cholet': [47.0596, -0.8788], 'auxerre': [47.7981, 3.5736], 'gap': [44.5593, 6.0793],
  'boulogne-sur-mer': [50.7264, 1.6134], 'tarbes': [43.2327, 0.0782], 'albi': [43.9277, 2.148],
  'arras': [50.2921, 2.7807], 'compiegne': [49.4186, 2.826], 'chartres': [48.4561, 1.4893],
  'bourg-en-bresse': [46.2058, 5.2254], 'la roche-sur-yon': [46.6706, -1.4268],
  'chalon-sur-saone': [46.7803, 4.8536], 'macon': [46.307, 4.8286], 'angouleme': [45.6487, 0.1562],
  'agen': [44.2033, 0.6166], 'rodez': [44.3497, 2.5754], 'aurillac': [44.9261, 2.4406],
  'moulins': [46.5646, 3.3337], 'digne-les-bains': [44.0929, 6.2356], 'tulle': [45.2669, 1.7689],
  'gueret': [46.1715, 1.8706], 'mont-de-marsan': [43.8936, -0.497], 'cahors': [44.4472, 1.4406],
  'auch': [43.6465, 0.5862], 'foix': [42.9645, 1.6079], 'privas': [44.7356, 4.5987],
  'mende': [44.5177, 3.4985], 'le puy-en-velay': [45.0429, 3.8855],
  'cergy': [49.0363, 2.0761], 'evry': [48.6248, 2.4338], 'versailles': [48.8014, 2.1301],
  'boulogne-billancourt': [48.8397, 2.2399], 'nanterre': [48.8924, 2.2071],
  'creteil': [48.7906, 2.4553], 'bobigny': [48.9097, 2.4256], 'pontoise': [49.0507, 2.1006],
  'melun': [48.5395, 2.6553], 'ile-de-france': [48.8499, 2.6371], 'idf': [48.8499, 2.6371],
  'region parisienne': [48.8566, 2.3522],
};

/**
 * Outre-mer, indexe par code departement.
 *
 * Le nom seul ne suffit pas : Saint-Denis designe une commune de
 * Seine-Saint-Denis et le chef-lieu de La Reunion, Saint-Pierre en
 * designe plusieurs. Les libelles France Travail portent le code du
 * departement — c'est lui qui tranche, on ne le jette donc pas.
 */
export const OUTRE_MER: Record<string, [number, number]> = {
  '971-pointe-a-pitre': [16.2412, -61.5340],
  '971-basse-terre': [15.9958, -61.7292],
  '971-les abymes': [16.2718, -61.5057],
  '972-fort-de-france': [14.6161, -61.0588],
  '972-le lamentin': [14.6097, -60.9994],
  '973-cayenne': [4.9224, -52.3135],
  '973-saint-laurent-du-maroni': [5.5031, -54.0289],
  '973-kourou': [5.1594, -52.6503],
  '974-saint-denis': [-20.8823, 55.4504],
  '974-saint-pierre': [-21.3393, 55.4781],
  '974-le tampon': [-21.2783, 55.5153],
  '974-saint-paul': [-21.0096, 55.2707],
  '976-mamoudzou': [-12.7806, 45.2278],
};

/** Chef-lieu par defaut, quand la commune outre-mer n'est pas listee. */
export const CHEFS_LIEUX_OUTRE_MER: Record<string, [number, number]> = {
  '971': [16.2412, -61.5340],
  '972': [14.6161, -61.0588],
  '973': [4.9224, -52.3135],
  '974': [-20.8823, 55.4504],
  '976': [-12.7806, 45.2278],
};

/**
 * Retrouve les coordonnees d'un lieu.
 *
 * Les offres importees de France Travail portent un libelle de la forme
 * « 87 - LIMOGES » : un code departement, un tiret, la commune. Le code
 * est retire avant toute comparaison, sinon rien ne correspond.
 *
 * La recherche approchante est volontairement stricte. La version
 * precedente acceptait n'importe quelle sous-chaine : « Beaupreau »
 * contient « pau » et atterrissait dans les Pyrenees. On n'accepte
 * desormais qu'un mot entier, et d'au moins quatre lettres.
 */
export function findCity(name: string): [number, number] | null {
  const brut = String(name ?? '');

  // Le code departement en tete sert d'abord a lever les homonymies
  // outre-mer, avant d'etre retire pour la recherche metropolitaine.
  const code = brut.match(/^\s*(\d{3})\s*-\s*/)?.[1];

  const nettoye = brut
    // « 87 - », « 2A - », « 973 - » : le code departement en tete
    .replace(/^\s*\d{2,3}\s*-\s*/, '')
    .replace(/^\s*2[AB]\s*-\s*/i, '')
    // « Paris 15e », « Lyon 3eme » : l'arrondissement ne change pas la ville
    .replace(/\s+\d{1,2}\s*(e|er|eme|ème)\b/i, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const enTirets = nettoye.replace(/[\s']+/g, '-');

  if (code) {
    const precis = OUTRE_MER[`${code}-${enTirets}`] ?? OUTRE_MER[`${code}-${nettoye}`];
    if (precis) return precis;
    // Commune non listee : le chef-lieu situe correctement le territoire,
    // ce qui vaut mieux que de projeter la Guyane sur la metropole.
    const chefLieu = CHEFS_LIEUX_OUTRE_MER[code];
    if (chefLieu) return chefLieu;
  }

  if (FRENCH_CITIES[enTirets]) return FRENCH_CITIES[enTirets];

  // Egalite une fois les tirets ramenes a des espaces : « le-havre »
  // et « le havre » designent la meme ville.
  const enEspaces = enTirets.replace(/-/g, ' ');
  for (const [cle, coords] of Object.entries(FRENCH_CITIES)) {
    if (cle.replace(/-/g, ' ') === enEspaces) return coords;
  }

  // Dernier recours : la ville apparait comme mot entier dans le libelle.
  const mots = new Set(enEspaces.split(' ').filter(Boolean));
  for (const [cle, coords] of Object.entries(FRENCH_CITIES)) {
    const cleEspaces = cle.replace(/-/g, ' ');
    if (cleEspaces.length < 4) continue;
    if (cleEspaces.includes(' ')) {
      if (enEspaces.includes(cleEspaces)) return coords;
    } else if (mots.has(cleEspaces)) {
      return coords;
    }
  }
  return null;
}
