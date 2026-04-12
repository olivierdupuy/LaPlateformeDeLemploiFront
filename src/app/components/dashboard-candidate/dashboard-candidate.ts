import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-candidate',
  imports: [RouterLink, DatePipe],
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
      const labels: Record<string, string> = { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' };
      const colors: Record<string, string> = { Pending: '#d97706', Reviewed: '#2563eb', Accepted: '#16a34a', Rejected: '#dc2626' };
      this.charts.push(new Chart(this.statusCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: a.statusBreakdown.map((s: any) => labels[s.label] || s.label),
          datasets: [{ data: a.statusBreakdown.map((s: any) => s.value), backgroundColor: a.statusBreakdown.map((s: any) => colors[s.label] || '#94a3b8'), borderWidth: 2, borderColor: '#fff' }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } } } },
      }));
    }

    if (this.monthCanvas && a.appsByMonth?.length) {
      this.charts.push(new Chart(this.monthCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: a.appsByMonth.map((m: any) => m.label),
          datasets: [{ data: a.appsByMonth.map((m: any) => m.value), backgroundColor: '#0d9488', borderRadius: 4, barPercentage: 0.6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#e2e8f0' } },
          },
        },
      }));
    }
  }

  statusColor(label: string): string {
    return { 'En attente': 'var(--amber)', 'Examinees': 'var(--blue)', 'Acceptees': 'var(--green)', 'Refusees': 'var(--red)' }[label] || 'var(--slate-400)';
  }

  statusIcon(status: string): string {
    return { Pending: 'bi-clock', Reviewed: 'bi-eye', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[status] || 'bi-circle';
  }

  statusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' }[status] || status;
  }

  statusClass(status: string): string {
    return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[status] || '';
  }
}
