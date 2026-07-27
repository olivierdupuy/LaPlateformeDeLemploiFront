import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';
import Chart from 'chart.js/auto';
import { ConsoleShell } from '../console-shell/console-shell';

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

  @ViewChild('statusChart') statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthChart') monthCanvas!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

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

  private buildCharts(a: any) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (this.statusCanvas && a.statusBreakdown?.length) {
      const labels: Record<string, string> = { Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée' };
      const colors: Record<string, string> = { Pending: '#b57408', Reviewed: '#93bcf4', Accepted: '#12855e', Rejected: '#e42b2f' };
      this.charts.push(new Chart(this.statusCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: a.statusBreakdown.map((s: any) => labels[s.label] || s.label),
          datasets: [{ data: a.statusBreakdown.map((s: any) => s.value), backgroundColor: a.statusBreakdown.map((s: any) => colors[s.label] || '#5a6b85'), borderWidth: 2, borderColor: '#fff' }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } } } },
      }));
    }

    if (this.monthCanvas && a.appsByMonth?.length) {
      this.charts.push(new Chart(this.monthCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: a.appsByMonth.map((m: any) => m.label),
          datasets: [{ data: a.appsByMonth.map((m: any) => m.value), backgroundColor: '#1657c4', borderRadius: 4, barPercentage: 0.6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#dde5f1' } },
          },
        },
      }));
    }
  }

  statusColor(label: string): string {
    return { 'En attente': 'var(--amber)', 'Examinées': 'var(--blue)', 'Acceptées': 'var(--green)', 'Refusées': 'var(--red)' }[label] || 'var(--slate-400)';
  }

  statusIcon(status: string): string {
    return { Pending: 'bi-clock', Reviewed: 'bi-eye', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[status] || 'bi-circle';
  }

  statusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée' }[status] || status;
  }

  statusClass(status: string): string {
    return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[status] || '';
  }
}
