import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-recruiter',
  imports: [RouterLink],
  templateUrl: './dashboard-recruiter.html',
  styleUrl: './dashboard-recruiter.scss',
})
export class DashboardRecruiter implements OnInit {
  private appService = inject(ApplicationService);
  auth = inject(AuthService);

  data = signal<any>(null);
  loading = signal(true);
  private charts: Chart[] = [];

  @ViewChild('offersChart') offersCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusCanvas!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    this.appService.getRecruiterStats().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.buildCharts(d), 200);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildCharts(d: any) {
    if (!this.offersCanvas) { setTimeout(() => this.buildCharts(d), 100); return; }
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (d.candidaturesParOffre?.length) {
      this.charts.push(new Chart(this.offersCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: d.candidaturesParOffre.map((i: any) => i.label),
          datasets: [{ data: d.candidaturesParOffre.map((i: any) => i.value), backgroundColor: '#0e5c43', borderRadius: 5, borderSkipped: false, barPercentage: 0.65 }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#14150f', cornerRadius: 8 } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#e7e7df' }, ticks: { stepSize: 1 } },
            y: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 as const } } },
          },
          animation: { duration: 800, easing: 'easeOutQuart' },
        },
      }));
    }

    if (d.candidaturesParStatut?.length) {
      const colors: Record<string, string> = { 'En attente': '#b4690e', 'Examinees': '#2563a8', 'Acceptees': '#0e9f6e', 'Refusees': '#c6362f' };
      const total = d.candidaturesParStatut.reduce((s: number, i: any) => s + i.value, 0);
      this.charts.push(new Chart(this.statusCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: d.candidaturesParStatut.map((i: any) => i.label),
          datasets: [{ data: d.candidaturesParStatut.map((i: any) => i.value), backgroundColor: d.candidaturesParStatut.map((i: any) => colors[i.label] || '#6c6e63'), borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } } },
          animation: { duration: 900, easing: 'easeOutQuart' },
        },
        plugins: [{
          id: 'centerText',
          afterDraw: (chart: any) => {
            const { ctx: c, chartArea } = chart;
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = "700 1.4rem 'Space Grotesk', sans-serif"; c.fillStyle = '#14150f';
            c.fillText(String(total), cx, cy - 7);
            c.font = "500 0.7rem 'Space Grotesk', sans-serif"; c.fillStyle = '#6c6e63';
            c.fillText('Total', cx, cy + 13);
            c.restore();
          }
        }],
      }));
    }
  }

  statusColor(label: string): string {
    return { 'En attente': 'var(--amber)', 'Examinees': 'var(--blue)', 'Acceptees': 'var(--green)', 'Refusees': 'var(--red)' }[label] || 'var(--slate-400)';
  }
}
