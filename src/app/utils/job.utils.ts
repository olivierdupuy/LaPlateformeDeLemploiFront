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
 * Avec trois couleurs seulement, la variété vient de l'intensité plutôt
 * que de la teinte : six degrés d'ardoise et deux de terracotta suffisent
 * à distinguer deux cartes voisines sans jamais sortir de la gamme.
 */
const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#e7e8ee', fg: '#3d405b' }, // ardoise claire
  { bg: '#cbcdd9', fg: '#2c2e44' }, // ardoise moyenne
  { bg: '#f9e5de', fg: '#a44e30' }, // terracotta clair
  { bg: '#ebe7d2', fg: '#55587a' }, // crème sombre
  { bg: '#d8dae4', fg: '#343750' }, // ardoise pâle
  { bg: '#f2d9cf', fg: '#c8623f' }, // terracotta pâle
  { bg: '#dedbc8', fg: '#4a4e6d' }, // crème grisée
];

export function companyColor(name: string): { bg: string; fg: string } {
  const label = name?.trim() || '?';
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
