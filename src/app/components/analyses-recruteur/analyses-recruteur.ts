import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { ConsoleShell } from '../console-shell/console-shell';
import { Explication } from '../explication/explication';

/**
 * Analyses — « qu'est-ce qui marche ».
 *
 * Le tableau de bord et les analyses répondaient à deux questions
 * différentes sur le même écran. « Où j'en suis aujourd'hui » appelle une
 * liste de choses à traiter et trois chiffres ; « qu'est-ce qui marche »
 * appelle des taux, un entonnoir et des comparaisons entre offres.
 *
 * Les mêmes yeux ne cherchent pas les deux en même temps, et les mélanger
 * faisait que le second n'était jamais lu : on ouvrait le tableau de bord
 * pour traiter, on repartait après avoir traité.
 *
 * Le partage n'est pas qu'une mise en page. Ce qui est ici se regarde une
 * fois par semaine, avec du recul ; ce qui reste là-bas se regarde tous
 * les matins.
 */
@Component({
  selector: 'app-analyses-recruteur',
  imports: [RouterLink, DecimalPipe, ConsoleShell, Explication],
  templateUrl: './analyses-recruteur.html',
  styleUrl: './analyses-recruteur.scss',
})
export class AnalysesRecruteur implements OnInit {
  private appService = inject(ApplicationService);

  data = signal<Record<string, number | { label: string; value: number }[]> | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.appService.getRecruiterStats().subscribe({
      next: (d) => {
        this.data.set(d as Record<string, number>);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private n(cle: string): number {
    const v = this.data()?.[cle];
    return typeof v === 'number' ? v : 0;
  }

  /**
   * L'entonnoir.
   *
   * Les pourcentages se rapportent tous au total reçu, et non à l'étape
   * précédente : « 40 % d'entretiens » veut dire quarante pour cent des
   * candidatures, ce qui est la lecture qu'on en fait naturellement.
   */
  funnel = computed(() => {
    if (!this.data()) return [];
    const total = this.n('totalCandidatures');
    const steps = [
      { key: 'in', label: 'Reçues', value: total, icon: 'bi-inbox' },
      {
        key: 'seen',
        label: 'Examinées',
        value: this.n('examinees') + this.n('acceptees') + this.n('refusees'),
        icon: 'bi-eye',
      },
      { key: 'itw', label: 'Entretiens', value: this.n('entretiensPlanifies'), icon: 'bi-calendar-event' },
      { key: 'ok', label: 'Acceptées', value: this.n('acceptees'), icon: 'bi-check-circle' },
    ];
    return steps.map((s) => ({ ...s, pct: total ? Math.round((s.value / total) * 100) : 0 }));
  });

  offerRows = computed(() => {
    const brut = this.data()?.['candidaturesParOffre'];
    const rows = Array.isArray(brut) ? brut : [];
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  });

  /** Les offres qui n'ont rien reçu : ce sont elles qu'on vient chercher. */
  offresMuettes = computed(() => this.offerRows().filter((o) => o.value === 0));

  total = computed(() => this.n('totalCandidatures'));
  refusees = computed(() => this.n('refusees'));

  /**
   * Part des candidatures examinées.
   *
   * Le seul taux qui parle du recruteur et non du marché : recevoir peu
   * de dossiers dépend de l'annonce, n'en lire aucun ne dépend que de
   * l'organisation.
   */
  tauxExamen = computed(() => {
    const total = this.total();
    if (!total) return null;
    const vues = this.n('examinees') + this.n('acceptees') + this.n('refusees');
    return Math.round((vues / total) * 100);
  });

  /** Part des candidatures qui aboutissent. */
  tauxAcceptation = computed(() => {
    const total = this.total();
    return total ? Math.round((this.n('acceptees') / total) * 100) : null;
  });
}
