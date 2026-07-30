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
 * l'intensité : sept degrés du même bleu, de clair à plein, suffisent à
 * distinguer deux cartes voisines sans jamais sortir de la gamme.
 *
 * Les fonds descendent régulièrement en clarté (écart OKLab ≥ 0,045
 * entre voisins) et aucun ne se confond avec le sol #ebf2fa ; chaque
 * paire dépasse 4,6:1, la plus faible étant l'aplat d'accent.
 */
const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#dde9f6', fg: '#064789' }, // bleu très pâle   7.51:1
  { bg: '#c7dcec', fg: '#043b74' }, // bleu pâle        7.90:1
  { bg: '#b0cee3', fg: '#033260' }, // bleu clair       7.85:1
  { bg: '#9dbfd8', fg: '#01121f' }, // bleu doux        9.82:1
  { bg: '#82aecd', fg: '#01121f' }, // bleu moyen clair 8.02:1
  { bg: '#427aa1', fg: '#ffffff' }, // aplat d'accent   4.64:1
  { bg: '#064789', fg: '#ebf2fa' }, // aplat de marque  8.20:1
];

export function companyColor(name: string): { bg: string; fg: string } {
  const label = name?.trim() || '?';
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
