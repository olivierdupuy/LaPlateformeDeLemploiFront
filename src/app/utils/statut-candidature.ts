/**
 * Les états d'une candidature, dits une seule fois.
 *
 * Huit composants tenaient chacun sa table de libellés, de classes et
 * d'icônes. Huit endroits à mettre d'accord à la main, et le premier
 * oubli n'aurait rien cassé de visible : le même dossier affiché
 * « Examinée » ici et `Reviewed` là, selon l'écran ouvert. C'est
 * exactement ce qui est arrivé en ajoutant deux états.
 *
 * Les clefs restent en anglais : elles sont en base et voyagent dans
 * l'API publique, que des intégrateurs consomment.
 */
export type StatutCandidature =
  | 'Pending'
  | 'Reviewed'
  | 'Contacted'
  | 'Accepted'
  | 'Hired'
  | 'Rejected';

interface Etat {
  cle: StatutCandidature;
  libelle: string;
  icone: string;
  /** Classe de pastille, telle que la portent déjà les écrans candidat. */
  pastille: string;
  /** Classe de badge, telle que la porte le panneau d'administration. */
  badge: string;
}

/**
 * Dans l'ordre du parcours, le refus mis à part : il peut survenir à
 * n'importe quelle étape et ne suit donc personne.
 *
 * Aucun feu tricolore. « Contactée » et « Acceptée » sont deux bonnes
 * nouvelles d'intensité différente, et c'est le remplissage qui les
 * distingue, pas la teinte. Le crimson est réservé au refus — le seul
 * état dont on ne revient pas du mauvais côté.
 */
export const ETATS_CANDIDATURE: Etat[] = [
  { cle: 'Pending', libelle: 'En attente', icone: 'bi-clock', pastille: 'st-pending', badge: 'badge-yellow' },
  { cle: 'Reviewed', libelle: 'Examinée', icone: 'bi-eye-fill', pastille: 'st-reviewed', badge: 'badge-blue' },
  { cle: 'Contacted', libelle: 'Contactée', icone: 'bi-chat-dots-fill', pastille: 'st-contacted', badge: 'badge-blue' },
  { cle: 'Accepted', libelle: 'Acceptée', icone: 'bi-check-circle-fill', pastille: 'st-accepted', badge: 'badge-green' },
  { cle: 'Hired', libelle: 'Embauchée', icone: 'bi-trophy-fill', pastille: 'st-hired', badge: 'badge-green' },
  { cle: 'Rejected', libelle: 'Refusée', icone: 'bi-x-circle-fill', pastille: 'st-rejected', badge: 'badge-red' },
];

export const STATUTS_CANDIDATURE = ETATS_CANDIDATURE.map((e) => e.cle);

/** L'ordre d'affichage d'une liste triée par avancement. */
export const ORDRE_CANDIDATURE: Record<string, number> = Object.fromEntries(
  ETATS_CANDIDATURE.map((e, i) => [e.cle, i]),
);

const PAR_CLE = new Map(ETATS_CANDIDATURE.map((e) => [e.cle as string, e]));

/**
 * Un état inconnu se rend tel quel plutôt que vide : si le serveur en
 * introduit un que le front ignore encore, mieux vaut afficher `Shortlisted`
 * qu'une case blanche que personne ne saura interpréter.
 */
export const libelleStatut = (s: string): string => PAR_CLE.get(s)?.libelle ?? s;
export const iconeStatut = (s: string): string => PAR_CLE.get(s)?.icone ?? 'bi-circle';
export const pastilleStatut = (s: string): string => PAR_CLE.get(s)?.pastille ?? '';
export const badgeStatut = (s: string): string => PAR_CLE.get(s)?.badge ?? '';

/**
 * Ce qui reste en jeu. Une candidature refusée ou une embauche conclue
 * n'attend plus rien : ni relance, ni compteur de dossiers qui dorment.
 */
export const EN_COURS: string[] = ['Pending', 'Reviewed', 'Contacted'];
export const estEnCours = (s: string): boolean => EN_COURS.includes(s);
