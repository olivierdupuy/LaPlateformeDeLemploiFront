/**
 * Passage des libellés de graphique aux filtres de liste.
 *
 * Les courbes du panneau portent des libellés « jj/MM » sur trente jours.
 * Le filtrage se faisant désormais sur le serveur, l'URL transporte une
 * date complète : « jj/MM » est ambigu d'une année sur l'autre, et le
 * serveur ne peut pas deviner celle qui était affichée.
 */

/**
 * « 12/07 » devient « 2026-07-12 » : l'occurrence la plus récente, celle
 * que le graphique montrait. Une date de la fenêtre affichée ne peut pas
 * être dans le futur, donc en cas de dépassement on recule d'un an.
 */
export function toIsoDay(ddMM: string, now = new Date()): string {
  const [dd, mm] = ddMM.split('/').map(Number);
  if (!dd || !mm) return '';

  let year = now.getFullYear();
  const candidate = new Date(year, mm - 1, dd);

  // Une tolérance d'un jour absorbe le décalage entre l'heure locale et
  // les dates stockées en UTC.
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (candidate > tomorrow) year -= 1;

  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** « 2026-07-12 » devient « 12 juillet 2026 », pour le jeton de filtre. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
