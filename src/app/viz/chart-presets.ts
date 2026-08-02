/**
 * ═══════════════════════════════════════════════════════════
 *  FABRIQUES DE GRAPHIQUES
 * ═══════════════════════════════════════════════════════════
 *
 * Vingt et un graphiques vivaient dans deux fichiers, chacun avec sa
 * propre copie des memes quatre-vingts lignes d'options Chart.js. Une
 * grille eclaircie ici ne l'etait pas la, une infobulle avait garde le
 * fond noir par defaut, deux d'entre eux affichaient encore leur legende
 * a droite. Ce fichier tient les reglages une fois : une carte demande une
 * forme, pas une configuration.
 *
 * Les specifications de trait sont fixes et ne se negocient pas par
 * graphique — c'est ce qui fait qu'ils se lisent comme une seule famille :
 *
 *   Barre     24 px d'epaisseur au plus, bout arrondi a 4 px du cote de
 *             la donnee, carre sur la ligne de base
 *   Courbe    2 px, jointures rondes
 *   Point     8 px au moins, cercle de 2 px couleur du fond pour rester
 *             lisible la ou deux courbes se croisent
 *   Aire      la teinte de la serie a 10 % — un lavis, jamais un aplat
 *   Grille    filet plein d'un cran sur le fond, jamais pointille
 *
 * Deux regles de fond, qui ont coute des reprises ailleurs :
 *
 * — Jamais deux echelles verticales sur un meme graphique. Le calage des
 *   deux axes est arbitraire, et le lecteur y lit une correlation que la
 *   donnee ne contient pas. Deux mesures d'ordre different font deux
 *   graphiques.
 * — La couleur suit l'entite, jamais son rang. Filtrer une serie ne
 *   repeint pas les survivantes : qui a appris que « Sante » est sarcelle
 *   doit la retrouver sarcelle la fois suivante.
 */

import Chart, {
  ChartConfiguration,
  ChartDataset,
  ChartOptions,
  TooltipItem,
} from 'chart.js/auto';
import { CHROME, ORDINAL, SERIES, SURFACE, seriesColors, wash } from './palette';

// ── Fontes ──
// IBM Plex Mono chiffre les axes : les graduations s'alignent verticalement.
// Inter porte les legendes et les infobulles, qui sont du texte.
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace";
const SANS = "'Inter', -apple-system, 'Segoe UI', sans-serif";

/** Abrege les grands nombres sans les rendre faux : 1 284 · 12,9 k · 3,1 M. */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace('.', ',') + ' M';
  if (a >= 10_000) return Math.round(n / 1000) + ' k';
  if (a >= 1_000) return (n / 1000).toFixed(1).replace('.', ',') + ' k';
  return n.toLocaleString('fr-FR');
}

/** Nombre entier, separateurs francais. */
export const nf = (n: number) => n.toLocaleString('fr-FR');

/**
 * Reglages globaux, poses une fois au demarrage.
 *
 * Les mettre ici plutot que dans chaque configuration evite qu'un
 * graphique ajoute plus tard reparte des defauts de Chart.js — fond noir,
 * legende a droite, animations d'une seconde.
 */
export function applyChartDefaults() {
  Chart.defaults.font.family = SANS;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = CHROME.muted;
  Chart.defaults.animation = { duration: 420, easing: 'easeOutQuart' };
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.responsive = true;

  // Une animation d'entree qui ne demande rien a personne reste une
  // animation : le systeme peut la refuser.
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Chart.defaults.animation = false;
  }
}

/**
 * Poses au chargement de ce module, et non depuis la configuration de
 * l'application.
 *
 * L'appel vivait dans `app.config.ts`, ce qui tirait Chart.js — deux
 * cent quarante kilo-octets — dans le paquet initial de tout le monde,
 * y compris de qui vient lire une offre et ne verra jamais un
 * graphique. Ici, les reglages arrivent avec le premier ecran qui en
 * demande un, puisque tout ce qui dessine passe forcement par ce
 * fichier.
 *
 * Idempotent, et c'est necessaire : deux ecrans a graphiques charges a
 * la suite reexecuteraient ces affectations sans consequence, mais
 * autant ne pas les compter deux fois.
 */
let reglagesPoses = false;
if (!reglagesPoses) {
  reglagesPoses = true;
  applyChartDefaults();
}

/**
 * Infobulle commune.
 *
 * Elle enrichit, elle ne conditionne pas : chaque valeur reste atteignable
 * par la vue tableau de la carte. Un survol n'existe pas au clavier, et un
 * canevas ne se parcourt pas a la tabulation.
 */
function tooltip(format?: (item: TooltipItem<any>) => string): ChartOptions['plugins'] {
  return {
    tooltip: {
      backgroundColor: '#002830',
      titleColor: '#ffffff',
      bodyColor: '#c1dfe5',
      titleFont: { family: SANS, size: 12.5, weight: 700 },
      bodyFont: { family: MONO, size: 12 },
      padding: { x: 11, y: 9 },
      cornerRadius: 8,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 5,
      usePointStyle: true,
      callbacks: format ? { label: format } : undefined,
    },
  };
}

/** Legende horizontale, pastilles rondes. Absente sur une serie unique : le titre la nomme. */
function legend(show: boolean): NonNullable<ChartOptions['plugins']>['legend'] {
  return {
    display: show,
    position: 'top',
    align: 'end',
    labels: {
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 8,
      boxHeight: 8,
      padding: 14,
      color: CHROME.inkSoft,
      font: { family: SANS, size: 12, weight: 600 },
    },
  };
}

/** Axe des valeurs : filet plein, graduations arrondies, zero visible. */
function valueAxis(opts: { horizontal?: boolean; stacked?: boolean; percent?: boolean } = {}) {
  return {
    beginAtZero: true,
    stacked: opts.stacked ?? false,
    border: { display: false },
    grid: {
      color: CHROME.grid,
      lineWidth: 1,
      drawTicks: false,
      // La grille du bas ne sert a rien quand l'axe categoriel la double.
      drawOnChartArea: true,
    },
    ticks: {
      color: CHROME.muted,
      font: { family: MONO, size: 11 },
      padding: 8,
      maxTicksLimit: 6,
      callback: (v: any) => (opts.percent ? `${v} %` : compact(Number(v))),
    },
  };
}

/** Axe des categories : pas de grille — elle ne porterait aucune valeur. */
function categoryAxis(opts: { stacked?: boolean; maxLabel?: number } = {}) {
  return {
    stacked: opts.stacked ?? false,
    border: { display: false },
    grid: { display: false, drawTicks: false },
    ticks: {
      color: CHROME.muted,
      font: { family: SANS, size: 11.5, weight: 600 },
      padding: 6,
      autoSkip: true,
      maxRotation: 0,
      callback(this: any, value: any) {
        const raw = String(this.getLabelForValue(value));
        const max = opts.maxLabel ?? 14;
        return raw.length > max ? raw.slice(0, max - 1) + '…' : raw;
      },
    },
  };
}

/** Marge interieure : le trait a besoin d'air, et l'etiquette de bout d'une place. */
const LAYOUT = { padding: { top: 6, right: 10, bottom: 0, left: 0 } };

export interface Point {
  label: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════
//  Colonnes — une categorie nominale, une seule teinte
// ═══════════════════════════════════════════════════════════

/**
 * Colonnes verticales pour une serie unique.
 *
 * Toutes les barres prennent la pente 1. Les peindre d'une rampe
 * « plus c'est grand, plus c'est fonce » depenserait le canal de
 * l'identite a redire ce que la longueur montre deja.
 */
export function columns(
  points: Point[],
  opts: { color?: string; unit?: string; drill?: any } = {},
): ChartConfiguration<'bar'> {
  return {
    type: 'bar',
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.value),
          backgroundColor: opts.color ?? SERIES[0],
          hoverBackgroundColor: opts.color ?? SERIES[0],
          maxBarThickness: 24,
          borderRadius: 4,
          borderSkipped: 'start',
          categoryPercentage: 0.78,
          barPercentage: 0.82,
        },
      ],
    },
    options: {
      layout: LAYOUT,
      scales: { x: categoryAxis(), y: valueAxis() },
      plugins: {
        ...tooltip((i) => ` ${nf(Number(i.raw))}${opts.unit ? ' ' + opts.unit : ''}`),
        legend: legend(false),
      },
      ...(opts.drill ?? {}),
    },
  };
}

/**
 * Barres horizontales — la forme des categories a nom long.
 *
 * Verticalement, « Ingenierie et developpement logiciel » se couche a
 * quarante-cinq degres ou se fait tronquer ; couche, il se lit.
 */
export function barsH(
  points: Point[],
  opts: { color?: string; unit?: string; ordinal?: boolean; drill?: any } = {},
): ChartConfiguration<'bar'> {
  // Les paliers ordonnes (anciennete, tranches) portent la rampe : l'ordre
  // se lit alors dans la couleur. Les categories nominales, non.
  const colors = opts.ordinal
    ? points.map((_, i) => ORDINAL[Math.min(i, ORDINAL.length - 1)])
    : (opts.color ?? SERIES[0]);

  return {
    type: 'bar',
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.value),
          backgroundColor: colors,
          hoverBackgroundColor: colors,
          maxBarThickness: 22,
          borderRadius: 4,
          borderSkipped: 'start',
          categoryPercentage: 0.8,
          barPercentage: 0.86,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      layout: { padding: { top: 2, right: 16, bottom: 0, left: 0 } },
      scales: {
        x: valueAxis({ horizontal: true }),
        y: {
          ...categoryAxis({ maxLabel: 26 }),
          ticks: { ...categoryAxis({ maxLabel: 26 }).ticks, font: { family: SANS, size: 11.5, weight: 600 } },
        },
      },
      plugins: {
        ...tooltip((i) => ` ${nf(Number(i.raw))}${opts.unit ? ' ' + opts.unit : ''}`),
        legend: legend(false),
      },
      ...(opts.drill ?? {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  Courbes — l'evolution dans le temps
// ═══════════════════════════════════════════════════════════

export interface Series {
  label: string;
  values: number[];
  color?: string;
  /** Une seule serie remplie : au-dela, les lavis se recouvrent et brouillent. */
  fill?: boolean;
}

/**
 * Courbes. Une serie prend un lavis sous elle ; plusieurs n'en prennent
 * pas, sinon les aires se superposent et personne ne lit plus rien.
 *
 * Les points restent invisibles au repos — trente points par serie font
 * une chenille — et n'apparaissent qu'au survol, avec leur cercle de fond.
 */
export function lines(
  labels: string[],
  series: Series[],
  opts: { unit?: string; drill?: any } = {},
): ChartConfiguration<'line'> {
  const solo = series.length === 1;
  const palette = seriesColors(series.length);

  const datasets: ChartDataset<'line'>[] = series.map((s, i) => {
    const color = s.color ?? palette[i];
    return {
      label: s.label,
      data: s.values,
      borderColor: color,
      borderWidth: 2,
      borderCapStyle: 'round',
      borderJoinStyle: 'round',
      tension: 0.32,
      fill: (s.fill ?? solo) ? 'origin' : false,
      backgroundColor: wash(color, 0.1),
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      // Le cercle de fond fait partie de la cible : un point de 5 px
      // sans halo se rate au survol.
      pointHoverBorderColor: SURFACE,
      pointHoverBorderWidth: 2,
      pointHitRadius: 14,
    };
  });

  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      layout: LAYOUT,
      // Le reticule compare les series a une meme date : c'est la question
      // que pose une courbe a plusieurs series.
      interaction: { mode: 'index', intersect: false },
      scales: { x: categoryAxis({ maxLabel: 6 }), y: valueAxis() },
      plugins: {
        ...tooltip((i) => ` ${i.dataset.label}: ${nf(Number(i.raw))}${opts.unit ? ' ' + opts.unit : ''}`),
        legend: legend(!solo),
      },
      ...(opts.drill ?? {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  Anneau — la part d'un tout, six segments au plus
// ═══════════════════════════════════════════════════════════

/**
 * Anneau. A comparer des valeurs proches il ne vaut rien : il ne sert
 * qu'a montrer une repartition d'un coup d'oeil, et seulement jusqu'a six
 * parts. Au-dela, la liste est plus honnete.
 *
 * L'ecart de 2 px entre les parts est du fond, pas un contour : un trait
 * ajouterait de l'encre qui ne dit rien.
 */
export function donut(
  points: Point[],
  opts: { colors?: string[]; unit?: string; drill?: any } = {},
): ChartConfiguration<'doughnut'> {
  const colors = opts.colors ?? seriesColors(points.length);
  const total = points.reduce((s, p) => s + p.value, 0);

  return {
    type: 'doughnut',
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.value),
          backgroundColor: colors,
          borderColor: SURFACE,
          borderWidth: 2,
          hoverOffset: 6,
          hoverBorderColor: SURFACE,
        },
      ],
    },
    options: {
      cutout: '64%',
      layout: { padding: 4 },
      plugins: {
        ...tooltip((i) => {
          const v = Number(i.raw);
          const pct = total ? Math.round((v / total) * 100) : 0;
          return ` ${nf(v)}${opts.unit ? ' ' + opts.unit : ''} · ${pct} %`;
        }),
        legend: legend(true),
      },
      ...(opts.drill ?? {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  Barres empilees — la composition d'un total
// ═══════════════════════════════════════════════════════════

export function stacked(
  labels: string[],
  series: Series[],
  opts: { horizontal?: boolean; unit?: string; drill?: any } = {},
): ChartConfiguration<'bar'> {
  const palette = seriesColors(series.length);

  return {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s.label,
        data: s.values,
        backgroundColor: s.color ?? palette[i],
        maxBarThickness: 24,
        borderRadius: 3,
        borderSkipped: false,
        // L'ecart de 2 px entre segments est peint dans la couleur du
        // fond : c'est du vide, pas un trait.
        borderColor: SURFACE,
        borderWidth: opts.horizontal ? { left: 0, right: 2, top: 0, bottom: 0 } : { top: 2, bottom: 0, left: 0, right: 0 },
        categoryPercentage: 0.76,
        barPercentage: 0.84,
      })),
    },
    options: {
      indexAxis: opts.horizontal ? 'y' : 'x',
      layout: LAYOUT,
      interaction: { mode: 'index', intersect: false },
      scales: opts.horizontal
        ? { x: valueAxis({ stacked: true }), y: categoryAxis({ stacked: true, maxLabel: 24 }) }
        : { x: categoryAxis({ stacked: true }), y: valueAxis({ stacked: true }) },
      plugins: {
        ...tooltip((i) => ` ${i.dataset.label}: ${nf(Number(i.raw))}${opts.unit ? ' ' + opts.unit : ''}`),
        legend: legend(series.length > 1),
      },
      ...(opts.drill ?? {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  Entonnoir — des etapes ordonnees, donc une rampe
// ═══════════════════════════════════════════════════════════

/**
 * Entonnoir de conversion. Les etapes ont un ordre — echanger deux d'entre
 * elles changerait le sens — c'est donc la rampe ordinale, pas les huit
 * teintes d'identite : la progression se lit dans la couleur.
 */
export function funnel(points: Point[], opts: { drill?: any } = {}): ChartConfiguration<'bar'> {
  const colors = points.map((_, i) => ORDINAL[Math.min(i, ORDINAL.length - 1)]);
  const first = points[0]?.value || 0;

  return {
    type: 'bar',
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.value),
          backgroundColor: colors,
          hoverBackgroundColor: colors,
          maxBarThickness: 26,
          borderRadius: 4,
          borderSkipped: 'start',
          categoryPercentage: 0.82,
          barPercentage: 0.88,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      layout: { padding: { top: 2, right: 20, bottom: 0, left: 0 } },
      scales: {
        x: valueAxis(),
        y: categoryAxis({ maxLabel: 22 }),
      },
      plugins: {
        ...tooltip((i) => {
          const v = Number(i.raw);
          const pct = first ? Math.round((v / first) * 100) : 0;
          return ` ${nf(v)} · ${pct} % de l'étape 1`;
        }),
        legend: legend(false),
      },
      ...(opts.drill ?? {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  Etincelle — la courbe minuscule d'une tuile de chiffre
// ═══════════════════════════════════════════════════════════

/**
 * Sparkline : pas d'axe, pas de grille, pas d'infobulle. Elle ne donne
 * pas de valeur, elle donne une allure — la valeur est le chiffre pose
 * juste a cote.
 */
export function sparkline(values: number[], color: string = SERIES[0]): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels: values.map((_, i) => String(i)),
      datasets: [
        {
          data: values,
          borderColor: color,
          borderWidth: 2,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
          tension: 0.38,
          fill: 'origin',
          backgroundColor: wash(color, 0.13),
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    },
    options: {
      animation: false,
      events: [],
      layout: { padding: 1 },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  };
}
