import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';
import Chart from 'chart.js/auto';
import { ConsoleShell } from '../console-shell/console-shell';
import { columns } from '../../viz/chart-presets';
import { APPLICATION_STATUS, STATUS } from '../../viz/palette';

/** Une chose a faire, posee en haut du tableau de bord. */
interface Todo {
  key: string;
  icon: string;
  text: string;
  cta: string;
  link: string;
  /** L'urgence porte le ton : une relance en retard n'est pas une suggestion. */
  tone: 'due' | 'info';
}

@Component({
  selector: 'app-dashboard-candidate',
  imports: [RouterLink, DatePipe, ConsoleShell],
  templateUrl: './dashboard-candidate.html',
  styleUrl: './dashboard-candidate.scss',
})
export class DashboardCandidate implements OnInit {
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateFeaturesService);
  auth = inject(AuthService);
  bookmarks = inject(BookmarkService);

  data = signal<any>(null);
  analytics = signal<any>(null);
  recommendations = signal<any[]>([]);
  alerts = signal<any[]>([]);
  loading = signal(true);

  @ViewChild('monthChart') monthCanvas!: ElementRef<HTMLCanvasElement>;
  // Voir dashboard-recruiter : le tableau ne sert qu'a la liberation,
  // il n'a pas a connaitre le type de chaque graphique.
  private charts: Chart<any>[] = [];

  /**
   * Les etapes reellement franchies, dans l'ordre du parcours.
   *
   * La page disait trois fois la meme chose : un anneau des statuts, une
   * rangee de chiffres par statut, et une barre de progression segmentee
   * par statut. Trois formes pour quatre nombres. Une seule reste, et
   * c'est celle qui correspond a la facon dont un candidat pense sa
   * recherche — un entonnoir : j'ai postule, on m'a lu, on m'a recu, on
   * m'a repondu.
   */
  funnel = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.totalCandidatures || 0;
    const steps = [
      { key: 'sent', label: 'Envoyées', value: total, icon: 'bi-send' },
      { key: 'seen', label: 'Examinées', value: (d.examinees || 0) + (d.acceptees || 0), icon: 'bi-eye' },
      { key: 'itw', label: 'Entretiens', value: d.entretiens || 0, icon: 'bi-calendar-event' },
      { key: 'ok', label: 'Acceptées', value: d.acceptees || 0, icon: 'bi-check-circle' },
    ];
    return steps.map((s) => ({ ...s, pct: total ? Math.round((s.value / total) * 100) : 0 }));
  });

  /**
   * Ce qu'il reste a faire.
   *
   * Un tableau de bord de candidat ne sert pas a contempler ses chiffres :
   * il sert a savoir quoi faire ensuite. La page n'en disait rien — elle
   * empilait huit tuiles de comptage, dont deux repetees, et laissait le
   * lecteur en tirer lui-meme les conclusions.
   */
  todos = computed<Todo[]>(() => {
    const d = this.data();
    if (!d) return [];
    const out: Todo[] = [];

    if (d.entretiens > 0) {
      out.push({
        key: 'itw', icon: 'bi-calendar-event', tone: 'due',
        text: `${d.entretiens} entretien${d.entretiens > 1 ? 's' : ''} à confirmer ou à préparer`,
        cta: 'Voir mes entretiens', link: '/entretiens',
      });
    }

    if (d.messagesNonLus > 0) {
      out.push({
        key: 'msg', icon: 'bi-chat-dots', tone: 'due',
        text: `${d.messagesNonLus} message${d.messagesNonLus > 1 ? 's' : ''} non lu${d.messagesNonLus > 1 ? 's' : ''} d'un recruteur`,
        cta: 'Ouvrir la messagerie', link: '/messagerie',
      });
    }

    const alerts = this.alerts();
    if (alerts.length) {
      const n = alerts.reduce((s: number, a: any) => s + (a.newCount || 0), 0);
      out.push({
        key: 'alert', icon: 'bi-bell', tone: 'info',
        text: `${n} nouvelle${n > 1 ? 's' : ''} offre${n > 1 ? 's' : ''} sur vos recherches enregistrées`,
        cta: 'Les consulter', link: '/recherches-sauvegardees',
      });
    }

    const stale = this.staleCount();
    if (stale > 0) {
      out.push({
        key: 'stale', icon: 'bi-hourglass-split', tone: 'due',
        text: `${stale} candidature${stale > 1 ? 's' : ''} sans réponse depuis plus de deux semaines`,
        cta: 'Les relancer', link: '/suivi',
      });
    }

    if ((d.recherches || 0) === 0) {
      out.push({
        key: 'search', icon: 'bi-bookmark-star', tone: 'info',
        text: 'Aucune recherche enregistrée — recevez les nouvelles offres par email',
        cta: 'Enregistrer une recherche', link: '/offres',
      });
    }

    return out;
  });

  /**
   * Candidatures encore en attente passe quinze jours.
   *
   * Calcule sur les cinq dernieres candidatures, les seules que renvoie
   * le resume : c'est une minoration, jamais une invention.
   */
  private staleCount = computed(() => {
    const d = this.data();
    if (!d?.dernieresCandidatures) return 0;
    const limite = Date.now() - 15 * 24 * 60 * 60 * 1000;
    return d.dernieresCandidatures.filter(
      (a: any) => a.status === 'Pending' && new Date(a.appliedAt).getTime() < limite,
    ).length;
  });

  ngOnInit() {
    this.appService.getCandidateStats().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.candidateService.getRecommendations().subscribe({
      next: (r) => this.recommendations.set(r),
      error: () => {},
    });

    this.candidateService.getAnalytics().subscribe({
      next: (a) => {
        this.analytics.set(a);
        setTimeout(() => this.buildCharts(a), 200);
      },
      error: () => {},
    });

    this.candidateService.checkAlerts().subscribe({
      next: (r) => this.alerts.set(r.alerts || []),
      error: () => {},
    });
  }

  /**
   * Le seul graphique qui reste : le rythme des candidatures.
   *
   * Il partait de couleurs ecrites a la main — `#b57408`, `#12855e`,
   * `#1657c4` — qui n'appartenaient a aucune des palettes du produit :
   * l'anneau des statuts s'affichait en vert et orange au milieu d'un
   * site bleu. Les fabriques de `chart-presets` tiennent les reglages
   * valides ; il n'y a pas de raison que cette page les reecrive.
   */
  private buildCharts(a: any) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // Deux barres ne sont pas une courbe : sous trois mois, le graphique
    // n'apprend rien que les chiffres ne disent deja.
    if (this.monthCanvas && a.appsByMonth?.length >= 3) {
      this.charts.push(new Chart(this.monthCanvas.nativeElement, columns(a.appsByMonth)));
    }
  }

  /** Assez de mois pour que la courbe dise quelque chose. */
  hasMonthly = computed(() => (this.analytics()?.appsByMonth?.length ?? 0) >= 3);

  statusIcon(status: string): string {
    return APPLICATION_STATUS[status]?.icon ?? 'bi-circle';
  }

  statusLabel(status: string): string {
    return APPLICATION_STATUS[status]?.label ?? status;
  }

  statusColor(status: string): string {
    return APPLICATION_STATUS[status]?.color ?? STATUS.neutral;
  }

  statusClass(status: string): string {
    return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[status] || '';
  }
}
