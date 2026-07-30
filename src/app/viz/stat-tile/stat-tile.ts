import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';
import { compact, nf, sparkline } from '../chart-presets';
import { CHROME, SERIES, STATUS } from '../palette';

/**
 * Tuile de chiffre.
 *
 * Une valeur unique n'est pas un graphique : un histogramme a une barre ne
 * dit rien de plus que le nombre lui-meme, et prend dix fois la place.
 * Elle prend donc cette forme : un libelle, la valeur, l'ecart sur une
 * periode nommee, et une etincelle qui donne l'allure sans pretendre
 * donner des valeurs.
 *
 * L'ecart porte une couleur d'etat, jamais une teinte de serie, et le sens
 * de lecture se declare : pour des inscriptions, monter est bon ; pour des
 * offres expirees, non. D'ou `goodWhenUp`, qu'il vaut mieux poser que
 * laisser deviner.
 */
@Component({
  selector: 'app-stat-tile',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './stat-tile.html',
  styleUrl: './stat-tile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatTile implements OnDestroy {
  label = input.required<string>();
  value = input.required<number>();
  icon = input<string>('bi-dot');

  /** Precision sous la valeur : « dont 12 urgentes », « sur 30 jours »… */
  note = input<string>('');

  /** Ecart brut sur la periode. `null` quand il n'y a rien a comparer. */
  delta = input<number | null>(null);
  deltaPeriod = input<string>('30 j');
  goodWhenUp = input(true);

  /** Douze points suffisent a une allure ; trente en font une chenille. */
  trend = input<number[]>([]);

  /** Teinte de la tuile — identite de la rubrique, pas jugement sur la valeur. */
  accent = input<string>(SERIES[0]);

  route = input<string | unknown[] | null>(null);
  params = input<Record<string, string | number | boolean> | null>(null);

  loading = input(false);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('spark');
  // `Chart` sans parametre se fige sur l'union de tous les types de
  // graphiques ; une configuration `'line'` precise ne s'y range pas.
  private chart: Chart<'line'> | null = null;

  to = computed(() => {
    const r = this.route();
    if (!r) return null;
    return Array.isArray(r) ? r : [r];
  });

  /** Les grands nombres s'abregent ; en dessous de mille on les ecrit en entier. */
  display = computed(() => (this.value() >= 10_000 ? compact(this.value()) : nf(this.value())));

  deltaState = computed(() => {
    const d = this.delta();
    if (d == null || d === 0) return null;
    const up = d > 0;
    const good = up === this.goodWhenUp();
    return {
      up,
      good,
      text: `${up ? '+' : '−'}${nf(Math.abs(d))}`,
      color: good ? STATUS.good : STATUS.critical,
      icon: up ? 'bi-arrow-up-right' : 'bi-arrow-down-right',
    };
  });

  constructor() {
    effect(() => {
      const el = this.canvas()?.nativeElement;
      const pts = this.trend();
      this.chart?.destroy();
      this.chart = null;
      if (!el || pts.length < 2) return;
      this.chart = new Chart(el, sparkline(pts, this.accent()));
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  protected readonly mute = CHROME.mute;
}
