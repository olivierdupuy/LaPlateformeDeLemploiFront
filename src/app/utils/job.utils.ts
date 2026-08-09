export function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

export function getTags(tags?: string): string[] {
  return tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
}

/**
 * Libellé de rémunération.
 *
 * Deux versions divergentes vivaient dans la liste d'offres et dans le
 * tunnel de candidature, et toutes deux tenaient `minSalary` pour un
 * montant annuel. C'est vrai des offres importées — l'import normalise
 * tout en brut annuel — mais faux des offres saisies par un recruteur :
 * celles-là gardent le montant tel qu'il a été tapé et rangent l'unité
 * dans `salaryPeriod`. Un salaire déclaré à 2 500 €/mois s'affichait donc
 * « 2.5k € / an », soit douze fois moins que la réalité.
 *
 * La période mène désormais la mise en forme, et son absence vaut
 * « an » puisque c'est ce que produit l'import.
 */
const PERIODE_SUFFIXE: Record<string, string> = { an: '/an', mois: '/mois', heure: '/h' };

/**
 * Un salaire annuel se lit en milliers ; un salaire mensuel ou horaire
 * se lit à l'euro près. « 2 k€/mois » perdrait la précision qui compte.
 *
 * Le nombre et son unité reviennent séparés : sur une fourchette dont
 * les deux bornes partagent la même unité, « 50 k€ – 65 k€ » répète ce
 * que « 50 – 65 k€ » dit une fois.
 */
function montantSalaire(valeur: number, periode: string): { nombre: string; unite: string } {
  if (periode !== 'an' || valeur < 1000) {
    return { nombre: valeur.toLocaleString('fr-FR'), unite: '€' };
  }
  // Arrondir avant de décider du séparateur décimal : 159 960 € vaut
  // « 160 k€ », pas « 160,0 k€ » — un zéro décimal promet une précision
  // que l'arrondi vient justement de retirer.
  const milliers = Math.round((valeur / 1000) * 10) / 10;
  const nombre = Number.isInteger(milliers) ? `${milliers}` : String(milliers).replace('.', ',');
  return { nombre, unite: 'k€' };
}

/**
 * Libellés bruts produits par l'import France Travail : « Annuel de
 * 1800.0 Euros », « Horaire de 12.31 Euros à 1895.88 Euros sur 12 mois ».
 *
 * Ce sont des chaînes de machine, destinées à l'analyseur, pas au
 * candidat. Quand l'analyse échoue — un montant hors des bornes du
 * marché, un format inédit — la mention libre servait de repli et
 * s'affichait telle quelle sur le site public. Mieux vaut ne rien dire
 * que d'afficher « Annuel de 1800.0 Euros » sur une fiche d'offre.
 */
const LIBELLE_MACHINE = /^\s*(annuel|mensuel|horaire|bi[- ]?mensuel)\s+de\s+[\d.,]/i;

export interface SalaireLisible {
  minSalary?: number | null;
  maxSalary?: number | null;
  salary?: string | null;
  salaryPeriod?: string | null;
}

export function salaryLabel(job: SalaireLisible): string | null {
  const min = job.minSalary ?? null;
  const max = job.maxSalary ?? null;

  // Sans montant structuré, il reste la mention libre de l'annonce —
  // à condition qu'elle ait été écrite pour être lue.
  if (min === null && max === null) {
    const libre = job.salary?.trim();
    return libre && !LIBELLE_MACHINE.test(libre) ? libre : null;
  }

  const periode = job.salaryPeriod || 'an';
  const suffixe = PERIODE_SUFFIXE[periode] ?? `/${periode}`;
  const m = (v: number) => montantSalaire(v, periode);

  if (min !== null && max !== null) {
    const bas = m(min);
    const haut = m(max);
    if (min === max) return `${bas.nombre} ${bas.unite} ${suffixe}`;
    // Deux unités différentes (900 € et 45 k€ sur la même annonce) : chaque
    // borne garde la sienne, sans quoi la première serait lue en milliers.
    return bas.unite === haut.unite
      ? `${bas.nombre} – ${haut.nombre} ${haut.unite} ${suffixe}`
      : `${bas.nombre} ${bas.unite} – ${haut.nombre} ${haut.unite} ${suffixe}`;
  }

  // Une borne seule doit se dire comme telle : afficher « 45 k€ » quand
  // seul un plafond est connu ferait passer un maximum pour une offre.
  const seule = m((min ?? max)!);
  const montant = `${seule.nombre} ${seule.unite} ${suffixe}`;
  return min !== null ? `À partir de ${montant}` : `Jusqu'à ${montant}`;
}

export function getContractBadgeClass(type: string): string {
  const map: Record<string, string> = {
    CDI: 'badge-green',
    CDD: 'badge-yellow',
    Stage: 'badge-indigo',
    Alternance: 'badge-coral',
    Freelance: 'badge-red',
  };
  return map[type] || 'badge-indigo';
}

/**
 * Pastilles d'initiales (entreprises, candidats).
 *
 * Une première version balayait les 360° de la roue chromatique et
 * produisait des pastilles vertes ou roses au milieu de la charte. On
 * tire désormais dans une palette fermée.
 *
 * Avec une palette monochrome, la variété vient entièrement de
 * l'intensité : sept degrés du même bleu — celui de l'anneau du logo —
 * suffisent à distinguer deux cartes voisines sans sortir de la gamme.
 *
 * Les fonds descendent régulièrement en clarté (écart OKLab ≥ 0,053
 * entre voisins). Ils ne se confondent pas avec le sol #F5F7FB : le sol
 * est presque blanc et à peine teinté, la pastille la plus pâle est
 * déjà six crans plus dense. Chaque paire dépasse 4,5:1, la plus faible
 * étant l'aplat d'accent.
 */
const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#DBE9FF', fg: '#384B68' }, // bleu très pâle    7.21:1
  { bg: '#C0D8FF', fg: '#253D61' }, // bleu pâle         7.56:1
  { bg: '#A6C6F7', fg: '#162F54' }, // bleu clair        7.68:1
  { bg: '#8FB4ED', fg: '#0D2241' }, // bleu doux         7.50:1
  { bg: '#769FE0', fg: '#05142D' }, // bleu moyen clair  6.82:1
  { bg: '#4373C0', fg: '#ffffff' }, // aplat d'accent    4.72:1
  { bg: '#25549D', fg: '#EBF0F8' }, // aplat de marque   6.48:1
];

export function companyColor(name: string): { bg: string; fg: string } {
  const label = name?.trim() || '?';
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
