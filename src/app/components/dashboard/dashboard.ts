import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { JobOfferService } from '../../services/job-offer';
import { JobStats, DetailedStats } from '../../models/job-offer.model';
import { Router, RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';
import { ConsoleShell } from '../console-shell/console-shell';
import { drilldown, to } from '../../utils/chart-drilldown';

// Palette : creme, terracotta, ardoise.
// Une rampe d'ardoise porte l'ordre des series ; le terracotta reste
// reserve au negatif, sinon il perdrait sa valeur de signal.
const ARDOISE     = '#3d405b';
const ARDOISE_900 = '#2c2e44';
const ARDOISE_600 = '#4a4e6d';
const ARDOISE_500 = '#5d6285';
const ARDOISE_400 = '#8085a3';
const ARDOISE_300 = '#a8abc1';
const ARDOISE_200 = '#cbcdd9';
const ARDOISE_50  = 'rgba(61, 64, 91, 0.08)';
const TERRE       = '#e07a5f';
const TERRE_700   = '#a44e30';
const CREME       = '#f4f1de';
const GRIS        = '#6f7391';

// Alias conserves pour ne pas reecrire chaque graphique
const TEAL = ARDOISE, TEAL_400 = ARDOISE_400, TEAL_50 = ARDOISE_50;
const NAVY_800 = ARDOISE, NAVY_700 = ARDOISE_500;
const AMBER = TERRE_700, GREEN = ARDOISE, RED = TERRE, BLUE = ARDOISE_400;
const SLATE400 = GRIS, ORANGE = TERRE_700;

const STATUS_COLORS: Record<string, string> = { Pending: ARDOISE_200, Reviewed: ARDOISE_400, Accepted: ARDOISE, Rejected: TERRE };
const STATUS_LABELS: Record<string, string> = { Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée' };

const CATEGORY_PALETTE = [ARDOISE, ARDOISE_900, ARDOISE_500, ARDOISE_400, ARDOISE_300, TERRE, TERRE_700, ARDOISE_200, GRIS, ARDOISE_600];

@Component({
  selector: 'app-dashboard',
  imports: [ConsoleShell, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private jobService = inject(JobOfferService);
  private router = inject(Router);

  stats = signal<JobStats>({ totalOffers: 0, totalApplications: 0, totalCompanies: 0, remoteOffers: 0 });
  detailed = signal<DetailedStats | null>(null);
  loading = signal(true);

  @ViewChild('categoryChart') categoryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('companyChart') companyCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractChart') contractCanvas!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private viewReady = false;
  private dataReady = false;

  ngOnInit() {
    this.jobService.getStats().subscribe((s) => this.stats.set(s));
    this.jobService.getDetailedStats().subscribe((d) => {
      this.detailed.set(d);
      this.loading.set(false);
      this.dataReady = true;
      if (this.viewReady) this.buildCharts(d);
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    const d = this.detailed();
    if (d && this.dataReady) {
      // Small delay to let @if render the canvases
      setTimeout(() => this.buildCharts(d));
    }
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  private buildCharts(d: DetailedStats) {
    // Wait for canvases to exist in DOM
    if (!this.categoryCanvas) {
      setTimeout(() => this.buildCharts(d), 50);
      return;
    }

    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.buildCategoryChart(d);
    this.buildStatusChart(d);
    this.buildCompanyChart(d);
    this.buildContractChart(d);
  }

  private baseFont() {
    return { family: "'DM Mono', ui-monospace, monospace", size: 12, weight: 500 as const };
  }

  private buildCategoryChart(d: DetailedStats) {
    const ctx = this.categoryCanvas.nativeElement.getContext('2d')!;
    const labels = d.offersByCategory.map(i => i.label);
    const data = d.offersByCategory.map(i => i.value);
    const colors = data.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.65,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        // Le libelle affiche est deja la valeur attendue par le filtre,
        // mais on passe par la donnee source : elle ne depend pas de la
        // mise en forme du graphique.
        ...drilldown(this.router, (i) =>
          to(['/admin/offres'], { categorie: d.offersByCategory[i].label })),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: NAVY_800,
            titleFont: this.baseFont(),
            bodyFont: this.baseFont(),
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.parsed.x ?? 0} offre${(ctx.parsed.x ?? 0) > 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: this.baseFont(), color: SLATE400, stepSize: 1 },
          },
          y: {
            grid: { display: false },
            ticks: { font: { ...this.baseFont(), weight: 600 as const }, color: NAVY_800 },
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      }
    });
    this.charts.push(chart);
  }

  private buildStatusChart(d: DetailedStats) {
    const ctx = this.statusCanvas.nativeElement.getContext('2d')!;
    const labels = d.appsByStatus.map(i => STATUS_LABELS[i.label] || i.label);
    const data = d.appsByStatus.map(i => i.value);
    const colors = d.appsByStatus.map(i => STATUS_COLORS[i.label] || SLATE400);
    const total = data.reduce((s, v) => s + v, 0);

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: CREME,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        // Le libelle est traduit pour l'affichage ; le filtre attend le
        // statut brut, qu'on relit dans la donnee source.
        ...drilldown(this.router, (i) =>
          to(['/admin/candidatures'], { statut: d.appsByStatus[i].label })),
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { ...this.baseFont(), weight: 500 as const },
              color: NAVY_800,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels!.map((label, i) => ({
                  text: `${label}  (${(ds.data as number[])[i]})`,
                  fillStyle: (ds.backgroundColor as string[])[i],
                  strokeStyle: 'transparent',
                  pointStyle: 'circle' as const,
                  index: i,
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: NAVY_800,
            titleFont: this.baseFont(),
            bodyFont: this.baseFont(),
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        },
        animation: { duration: 900, easing: 'easeOutQuart' },
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx: c, chartArea } = chart;
          const cx = (chartArea.left + chartArea.right) / 2;
          const cy = (chartArea.top + chartArea.bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = "700 1.6rem 'Bricolage Grotesque', sans-serif";
          c.fillStyle = ARDOISE;
          c.fillText(String(total), cx, cy - 8);
          c.font = "500 0.72rem 'DM Mono', monospace";
          c.fillStyle = SLATE400;
          c.fillText('Total', cx, cy + 14);
          c.restore();
        }
      }]
    });
    this.charts.push(chart);
  }

  private buildCompanyChart(d: DetailedStats) {
    const ctx = this.companyCanvas.nativeElement.getContext('2d')!;
    const labels = d.topCompanies.map(i => i.label);
    const data = d.topCompanies.map(i => i.value);

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, NAVY_800);
    gradient.addColorStop(1, TEAL);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: gradient,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.65,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        ...drilldown(this.router, (i) =>
          to(['/admin/offres'], { entreprise: d.topCompanies[i].label })),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: NAVY_800,
            titleFont: this.baseFont(),
            bodyFont: this.baseFont(),
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.parsed.x ?? 0} offre${(ctx.parsed.x ?? 0) > 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: this.baseFont(), color: SLATE400, stepSize: 1 },
          },
          y: {
            grid: { display: false },
            ticks: { font: { ...this.baseFont(), weight: 600 as const }, color: NAVY_800 },
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      }
    });
    this.charts.push(chart);
  }

  private buildContractChart(d: DetailedStats) {
    const ctx = this.contractCanvas.nativeElement.getContext('2d')!;
    const labels = d.offersByContract.map(i => i.label);
    const data = d.offersByContract.map(i => i.value);
    const colors = [TEAL, TEAL_400, NAVY_800, AMBER, BLUE, GREEN, ORANGE];
    const total = data.reduce((s, v) => s + v, 0);

    // Une aire polaire etait illisible ici : le CDI ecrase tout (133
    // contre 1 a 6), la surface des autres types devenait invisible.
    // Une barre horizontale supporte cet ecart d'echelle.
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length),
          borderRadius: 5,
          maxBarThickness: 26,
        }],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        ...drilldown(this.router, (i) =>
          to(['/admin/offres'], { contrat: d.offersByContract[i].label })),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: NAVY_800,
            titleFont: this.baseFont(),
            bodyFont: this.baseFont(),
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const v = (ctx.parsed.x ?? 0) as number;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return ` ${v} offre${v > 1 ? 's' : ''} (${pct}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: this.baseFont(), color: SLATE400, precision: 0 },
            grid: { color: 'rgba(0,0,0,0.04)' },
          },
          y: {
            ticks: { font: { ...this.baseFont(), weight: 500 as const }, color: NAVY_800 },
            grid: { display: false },
          },
        },
        animation: { duration: 900, easing: 'easeOutQuart' },
      }
    });
    this.charts.push(chart);
  }
}
