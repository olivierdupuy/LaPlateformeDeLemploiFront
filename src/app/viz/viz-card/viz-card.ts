import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { nf } from '../chart-presets';

/** Une ligne de la vue tableau : ce que le graphique montre, en toutes lettres. */
export interface VizRow {
  label: string;
  value: number | string;
  /** Seconde colonne facultative — une part, une entreprise, une precision. */
  note?: string;
  /** Pastille de couleur : l'identite de la serie, a cote du texte et jamais dedans. */
  color?: string;
}

/**
 * Carte de graphique.
 *
 * Une carte porte un titre, un graphique, et — c'est le point — sa vue
 * tableau. Deux des huit teintes de series passent sous 3:1 sur la creme ;
 * la regle est alors qu'il existe un autre chemin vers la valeur que la
 * couleur. Ce chemin est ici, derriere un bouton, sur toutes les cartes et
 * pas seulement sur celles qui portent une teinte claire : une bascule qui
 * n'apparait que parfois ne se cherche pas.
 *
 * Le canevas n'est pas atteignable au clavier et n'a pas de contenu pour
 * un lecteur d'ecran. La vue tableau est donc aussi la version accessible,
 * et le lien de forage de l'en-tete double au clavier ce qu'un clic sur un
 * segment fait a la souris.
 */
@Component({
  selector: 'app-viz-card',
  imports: [RouterLink],
  templateUrl: './viz-card.html',
  styleUrl: './viz-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VizCard implements OnDestroy {
  /** Titre de la carte. Il nomme ce qui est trace : une serie unique n'a donc pas de legende. */
  title = input.required<string>();
  sub = input<string>('');
  icon = input<string>('bi-bar-chart');

  /** Configuration Chart.js, sortie des fabriques. `null` tant que la donnee n'est pas la. */
  config = input<ChartConfiguration | null>(null);

  /** La meme donnee, en lignes. Sans elle, la bascule tableau ne s'affiche pas. */
  rows = input<VizRow[]>([]);
  rowsLabel = input<string>('Libellé');
  rowsValue = input<string>('Valeur');
  rowsNote = input<string>('');

  /** Ou mene la carte : le meme chemin qu'un clic sur un segment, mais au clavier. */
  drillLabel = input<string>('');
  drillRoute = input<string | unknown[] | null>(null);
  drillParams = input<Record<string, string | number | boolean> | null>(null);

  /** Hauteur de la zone de trace, marge d'axe comprise. */
  height = input<string>('260px');

  /** La carte tient deux colonnes de la grille. */
  wide = input(false);

  loading = input(false);

  /** Message d'attente quand il n'y a rien a tracer. */
  empty = input<string>('Aucune donnée sur cette période.');

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  mode = signal<'chart' | 'table'>('chart');

  private chart: Chart | null = null;

  hasData = computed(() => {
    const c = this.config();
    if (!c) return false;
    return (c.data.datasets ?? []).some((d) => (d.data as unknown[])?.some((v) => v != null));
  });

  drillTo = computed(() => {
    const r = this.drillRoute();
    if (!r) return null;
    return Array.isArray(r) ? r : [r];
  });

  constructor() {
    // Le canevas entre et sort du DOM avec la bascule : le graphique se
    // reconstruit sur le support courant, et se libere avec lui. Un Chart
    // dont le canevas a disparu garde son contexte et fuit.
    effect(() => {
      const el = this.canvas()?.nativeElement;
      const cfg = this.config();
      this.chart?.destroy();
      this.chart = null;
      if (!el || !cfg) return;
      this.chart = new Chart(el, cfg);
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  toggle() {
    this.mode.update((m) => (m === 'chart' ? 'table' : 'chart'));
  }

  fmt(v: number | string): string {
    return typeof v === 'number' ? nf(v) : v;
  }
}
