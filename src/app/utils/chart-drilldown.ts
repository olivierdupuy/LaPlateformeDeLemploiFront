import { Router } from '@angular/router';

/**
 * Forage des graphiques : un clic sur un segment ouvre la liste qu'il résume.
 *
 * Un graphique répond à « combien » ; la question suivante est toujours
 * « lesquels ». Plutôt que de recopier un gestionnaire de clic dans chacun
 * des vingt et un graphiques du panneau, chaque page décrit où mène un
 * segment et cet adaptateur s'occupe du reste : navigation, curseur au
 * survol, et curseur neutre quand le segment ne mène nulle part.
 *
 * Le canevas n'est pas atteignable au clavier. Toute destination ouverte
 * par un clic doit donc l'être aussi par un lien visible dans l'en-tête de
 * la carte — le forage accélère, il n'est jamais le seul chemin.
 */

export interface DrillTarget {
  /** Fragments d'URL passés à Router.navigate. */
  route: unknown[];
  queryParams?: Record<string, string | number | boolean>;
}

/**
 * Reçoit l'index du segment cliqué, son libellé affiché et, pour un
 * graphique à plusieurs séries, l'index de la série. L'index est la clé
 * fiable : les libellés sont souvent traduits pour l'affichage
 * (« Pending » devient « En attente ») et ne correspondent plus aux valeurs
 * attendues par l'API. Renvoyer null rend le segment inerte.
 */
export type DrillResolver = (
  index: number,
  label: string,
  datasetIndex: number,
) => DrillTarget | null;

/**
 * Fragment d'options à fusionner dans une configuration Chart.js.
 *
 * Les paramètres sont volontairement non typés : Chart.js spécialise
 * `onClick` par type de graphique (`Chart<'bar'>`, `Chart<'doughnut'>`…) et
 * un gestionnaire commun à tous ne satisfait aucune de ces signatures.
 */
export interface DrillOptions {
  /**
   * À activer sur un graphique dont l'infobulle compare plusieurs séries
   * (`interaction.mode: 'index'`). Dans ce mode Chart.js remet toutes les
   * séries du point, et la première l'emporterait toujours ; on redemande
   * alors la courbe réellement visée, sans toucher à l'infobulle.
   */
  nearest?: boolean;
}

export function drilldown(router: Router, resolve: DrillResolver, opts: DrillOptions = {}) {
  const targetAt = (event: any, elements: any[], chart: any): DrillTarget | null => {
    const hits = opts.nearest
      ? chart.getElementsAtEventForMode(event.native ?? event, 'nearest', { intersect: true }, true)
      : elements;
    if (!hits?.length) return null;
    const { index, datasetIndex } = hits[0];
    return resolve(index, String(chart.data.labels?.[index] ?? ''), datasetIndex ?? 0);
  };

  return {
    onHover: (event: any, elements: any[], chart: any) => {
      chart.canvas.style.cursor = targetAt(event, elements, chart) ? 'pointer' : 'default';
    },
    onClick: (event: any, elements: any[], chart: any) => {
      const target = targetAt(event, elements, chart);
      if (target) router.navigate(target.route, { queryParams: target.queryParams });
    },
  };
}

/** Raccourci : la destination la plus fréquente est une liste filtrée. */
export function to(route: unknown[], queryParams?: DrillTarget['queryParams']): DrillTarget {
  return { route, queryParams };
}
