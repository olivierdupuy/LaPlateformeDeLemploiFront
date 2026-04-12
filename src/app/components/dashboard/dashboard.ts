import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { JobOfferService } from '../../services/job-offer';
import { JobStats, DetailedStats } from '../../models/job-offer.model';
import Chart from 'chart.js/auto';

// App palette
const TEAL     = '#0d9488';
const TEAL_400 = '#2dd4bf';
const TEAL_50  = 'rgba(13, 148, 136, 0.10)';
const NAVY_800 = '#1e293b';
const NAVY_700 = '#334155';
const AMBER    = '#d97706';
const GREEN    = '#16a34a';
const RED      = '#dc2626';
const BLUE     = '#2563eb';
const SLATE400 = '#94a3b8';
const ORANGE   = '#f97316';

const STATUS_COLORS: Record<string, string> = { Pending: AMBER, Reviewed: BLUE, Accepted: GREEN, Rejected: RED };
const STATUS_LABELS: Record<string, string> = { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' };

const CATEGORY_PALETTE = [TEAL, NAVY_800, AMBER, BLUE, GREEN, ORANGE, TEAL_400, NAVY_700, RED, SLATE400];

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private jobService = inject(JobOfferService);

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
    return { family: "'Satoshi', sans-serif", size: 12, weight: 500 as const };
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
          borderColor: '#ffffff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
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
          c.font = "800 1.6rem 'Satoshi', sans-serif";
          c.fillStyle = NAVY_800;
          c.fillText(String(total), cx, cy - 8);
          c.font = "500 0.72rem 'Satoshi', sans-serif";
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

    const chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length).map(c => c + '33'),
          borderColor: colors.slice(0, data.length),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14,
              font: { ...this.baseFont(), weight: 500 as const },
              color: NAVY_800,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels!.map((label, i) => ({
                  text: `${label}  (${(ds.data as number[])[i]})`,
                  fillStyle: (ds.borderColor as string[])[i],
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
                const pct = total ? Math.round((ctx.parsed.r / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed.r} (${pct}%)`;
              }
            }
          }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: 'rgba(0,0,0,0.04)' },
          }
        },
        animation: { duration: 900, easing: 'easeOutQuart' },
      }
    });
    this.charts.push(chart);
  }
}
