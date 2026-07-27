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
 * L'ancienne version balayait les 360° de la roue chromatique : on
 * obtenait des pastilles vertes ou roses en pleine identité bleue.
 * On tire désormais dans une palette fermée, dérivée de la mascotte —
 * assez de variété pour distinguer deux cartes voisines, sans sortir
 * de la charte.
 */
const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#e4eefd', fg: '#13489f' }, // bleu roi
  { bg: '#e7eef8', fg: '#33445f' }, // ardoise
  { bg: '#fdf1d9', fg: '#8a5804' }, // ambre
  { bg: '#dff1fa', fg: '#12688c' }, // cyan
  { bg: '#fde8e8', fg: '#a91a1e' }, // rouge
  { bg: '#e3f5ed', fg: '#0b6b4a' }, // vert
  { bg: '#e9e6f9', fg: '#4b3fa8' }, // indigo
];

export function companyColor(name: string): { bg: string; fg: string } {
  const label = name?.trim() || '?';
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
