/**
 * Les grands secteurs proposés au choix.
 *
 * Une seule liste, parce qu'elle est montrée à deux endroits — la
 * dernière étape de l'inscription et la page de la lettre
 * d'information — et souvent à la même personne, à quelques minutes
 * d'intervalle. Deux listes qui divergeraient donneraient l'impression
 * que l'un des deux écrans est resté en arrière.
 *
 * L'ordre suit le poids des secteurs dans les offres publiées, pas
 * l'alphabet : ce qu'on cherche le plus souvent se lit en premier.
 */
export const CATEGORIES = [
  'Tech', 'Santé', 'Commerce', 'Bâtiment', 'Industrie', 'Transport',
  'Hôtellerie-restauration', 'Éducation', 'Finance', 'Design',
] as const;
