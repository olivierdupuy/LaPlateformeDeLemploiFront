/**
 * ═══════════════════════════════════════════════════════════
 *  PALETTE DES GRAPHIQUES — bleu du logo, et huit pentes a part
 * ═══════════════════════════════════════════════════════════
 *
 * Les couleurs d'un graphique ne sont pas choisies a l'oeil : chacune fait
 * un travail, et un seul. Ce fichier fixe les quatre familles — identite,
 * ordre, grandeur, etat — et rien d'autre n'a le droit d'inventer une
 * teinte de serie ailleurs dans le panneau.
 *
 * Pourquoi ne pas reprendre la rampe de marque du site ? Parce qu'elle
 * encode la grandeur, pas l'identite. Les dix-sept graphiques du panneau
 * peignaient « Informatique », « Sante » et « Commerce » en trois teintes
 * voisines : la couleur ne disait plus laquelle est laquelle, elle
 * ne faisait que repeter la longueur de la barre. L'axe bleu du logo
 * reste donc la rampe de grandeur, et les series recoivent huit teintes
 * distinctes — les seules couleurs du produit a sortir de la palette de
 * marque, et c'est deliberé : identifier n'est pas signer.
 *
 * Le passage au bleu-orange du logo ne touche pas les huit pentes : elles
 * ne sont pas des teintes de marque, et les revalider couterait une
 * nouvelle enumeration pour aucun gain. Seules les rampes tirees de l'axe
 * de la marque — ordre, grandeur, chrome — ont ete rebaties, sur la teinte
 * 259° relevee dans le logo.
 *
 * ── Verification, pas intuition ──
 * L'ordre des huit pentes est le mecanisme de securite : il est mesure,
 * jamais ajuste au jugé. Cet ordre est sorti d'une enumeration des
 * 5 040 permutations, notee par le validateur de la methode. Le passage
 * a la palette bleue a change la surface des cartes (#fffdf7 → #ffffff)
 * et donc les seuls contrastes au fond ; ni le petrole ni le bleu du logo
 * ne l'ont retouchee. Les ecarts entre pentes ne dependent pas du fond et restent
 * ceux qui ont ete valides :
 *
 *   Bande de clarte      OK   les huit dans L 0.43–0.77
 *   Plancher de chroma   OK   les huit >= 0.10 (en deca, une teinte
 *                             se lit grise et cesse d'identifier)
 *   Separation daltonien OK   pire paire voisine ΔE 13.5 (deuteranopie),
 *                             pour une cible de 8
 *   Vision normale       OK   pire paire voisine ΔE 22.6, plancher 15
 *   Contraste au fond    ~    recalcule sur blanc : #e0a419 (2.21:1) et
 *                             #e58a63 (2.58:1) passent sous 3:1 : ces
 *                             deux pentes exigent un relief — etiquettes
 *                             visibles ou vue tableau. Les cartes de
 *                             graphique du panneau portent les deux,
 *                             c'est la contrepartie.
 *
 * Les trois premieres pentes tiennent en outre le test « toutes paires »
 * (ΔE 15.2 daltonien, 23.5 vision normale) : ce sont elles que porte la
 * courbe a trois series du tableau de bord, ou n'importe quelles deux
 * lignes peuvent se croiser.
 *
 * Le rouge et l'orange sont volontairement repousses en quatrieme et
 * sixieme position. Ce sont les teintes de signal du produit — un refus,
 * une alerte. Une serie neutre qui s'habillerait en rouge des la troisieme
 * position ferait mentir tout le reste du panneau.
 */

/** Surface reelle des cartes de graphique — celle sur laquelle tout a ete valide. */
export const SURFACE = '#ffffff';

/**
 * Identite : quelle serie. Huit pentes, ordre fixe, attribuees dans
 * l'ordre et jamais recyclees. Au-dela de huit series, on replie la queue
 * dans « Autres » — une neuvieme teinte generee serait indiscernable des
 * huit premieres sous daltonisme.
 */
export const SERIES = [
  '#35509c', // 1 · bleu      — la teinte de tete, cousine de l'ardoise
  '#2a9d8f', // 2 · sarcelle
  '#e0a419', // 3 · ambre     (relief requis : 2.17:1)
  '#c0392b', // 4 · rouge
  '#6a4fa3', // 5 · violet
  '#e58a63', // 6 · terracotta (relief requis : 2.53:1)
  '#a63f6a', // 7 · magenta
  '#679733', // 8 · vert
] as const;

/** Les pentes qui passent sous 3:1 : elles obligent la carte a montrer ses valeurs. */
export const SERIES_RELIEF = new Set<string>(['#e0a419', '#e58a63']);

/**
 * Ordre : la position dans une suite — etapes d'un entonnoir, paliers,
 * tranches. Une seule teinte, clarte decroissante, pour que l'oeil lise la
 * progression dans la couleur elle-meme. Rebatie sur l'axe bleu du logo et
 * revalidee : clarte monotone, ecart voisin minimal 0.074 (cible 0.06),
 * extremite claire a 2.43:1 du fond (cible 2.35).
 */
export const ORDINAL = ['#8AA8D6', '#6E91C7', '#5279B6', '#3560A3', '#1A4587'] as const;

/**
 * Grandeur : combien. Rampe continue pour la carte et les grilles de
 * chaleur, ou la marche la plus claire signifie « presque rien » et a le
 * droit de se fondre dans le fond — c'est ce qui la distingue de la rampe
 * ordinale ci-dessus.
 */
export const SEQUENTIAL = [
  '#E6F0FE', '#C7DAF8', '#A8C4EE', '#86A8DC', '#648AC6', '#3E69AD', '#1C498E',
] as const;

/**
 * Etat : bon → critique. Echelle reservee, jamais utilisee comme « serie
 * numero quatre », et toujours accompagnee d'une icone et d'un libelle —
 * `warning` passe sous 3:1 sur le blanc, et c'est ce couplage qui le
 * rattrape.
 *
 * L'echelle reste chaude de bout en bout (vert → ambre → orange → rouge).
 * Elle l'etait deja quand la structure du produit etait petrole ; c'est
 * moins confortable maintenant que l'accent de marque est lui-meme orange,
 * mais l'alternative — une echelle froide — se confondrait avec la
 * structure, ce qui est pire : un jugement doit se lire comme un jugement.
 * L'ambre et l'orange restent nettement plus rabattus que le #FD7A02 du
 * logo, et le couplage icone + libelle, deja obligatoire, porte le reste.
 *
 * `info` prend le bleu de la marque : c'est le seul etat qui ne juge rien,
 * il peut donc signer.
 */
export const STATUS = {
  good: '#2f7d4f',     // 5.04:1
  warning: '#d99a00',  // 2.45:1 — icone + libelle obligatoires
  serious: '#d1603b',  // 3.86:1
  critical: '#b3271f', // 6.51:1
  neutral: '#8893A4',  // 3.11:1 — gris de la gamme, pas un bleu
  info: '#01489C',     // 8.72:1 — la teinte de l'anneau du logo
} as const;

/** Chrome du graphique : encres, grille, ligne de base. Jamais une teinte de serie. */
export const CHROME = {
  surface: SURFACE,
  ink: '#1B283C',      // 14.84:1
  inkSoft: '#4C596E',  //  7.09:1
  muted: '#657183',    //  4.95:1 — etiquettes d'axe
  faint: '#909BAA',    //  2.82:1
  grid: '#DDE9FB',     // filet, volontairement en retrait
  axis: '#C8D9F3',
  /** Gris de mise en retrait : la forme « emphase », une serie en couleur et le reste ici. */
  mute: '#B4C8E8',
} as const;

/** Fond translucide d'une aire ou d'une pastille, tire de la teinte de la serie. */
export function wash(hex: string, alpha = 0.12): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Attribue les teintes d'identite dans l'ordre, sans jamais boucler.
 *
 * Le plafond compte : passe huit, on ne genere pas une neuvieme teinte, on
 * replie. Les appelants qui depassent doivent avoir regroupe leur queue en
 * amont — cette fonction ne fait que refuser de mentir sur le reste.
 */
export function seriesColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => SERIES[Math.min(i, SERIES.length - 1)]);
}

/** Marches d'une rampe, echantillonnees pour n valeurs ordonnees. */
export function rampColors(count: number, ramp: readonly string[] = SEQUENTIAL): string[] {
  if (count <= 1) return [ramp[ramp.length - 1]];
  return Array.from({ length: count }, (_, i) =>
    ramp[Math.round((i / (count - 1)) * (ramp.length - 1))],
  );
}

/**
 * Statuts de candidature.
 *
 * Ces quatre-la ne sont pas des series : ce sont des etats, et deux
 * d'entre eux portent un jugement. « Acceptee » prend donc le vert d'etat
 * et « Refusee » le rouge critique, plutot que les pentes 1 a 4 — sinon
 * le meme rouge dirait « refus » ici et « quatrieme categorie » deux
 * cartes plus loin.
 */
export const APPLICATION_STATUS: Record<string, { color: string; label: string; icon: string }> = {
  Pending: { color: STATUS.neutral, label: 'En attente', icon: 'bi-hourglass-split' },
  Reviewed: { color: STATUS.info, label: 'Examinée', icon: 'bi-eye' },
  Accepted: { color: STATUS.good, label: 'Acceptée', icon: 'bi-check-circle' },
  Rejected: { color: STATUS.critical, label: 'Refusée', icon: 'bi-x-circle' },
};

/** Statuts de moderation d'une offre. */
export const MODERATION_STATUS: Record<string, { color: string; label: string; icon: string }> = {
  Pending: { color: STATUS.warning, label: 'En attente', icon: 'bi-hourglass-split' },
  Approved: { color: STATUS.good, label: 'Approuvée', icon: 'bi-check-circle' },
  Rejected: { color: STATUS.critical, label: 'Rejetée', icon: 'bi-x-circle' },
};
