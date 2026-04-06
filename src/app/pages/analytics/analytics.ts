import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface AdvancedStats {
  applicationsPerDay: { date: string; count: number }[];
  applicationsByStatus: Record<string, number>;
  applicationsByContract: Record<string, number>;
  topOffers: { title: string; applicationCount: number }[];
  applicationsByLocation: Record<string, number>;
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class Analytics implements OnInit, AfterViewInit {
  stats: AdvancedStats | null = null;
  loading = true;

  @ViewChild('lineChart') lineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChart') doughnutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('locationChart') locationCanvas!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  constructor(public auth: AuthService, private http: HttpClient, private seo: SeoService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.seo.setPage('Statistiques', 'Analysez les performances de vos candidatures et offres avec des graphiques detailles.');
    this.http.get<AdvancedStats>('/api/profile/analytics').subscribe({
      next: s => { this.stats = s; this.loading = false; this.cdr.detectChanges(); setTimeout(() => this.buildCharts(), 100); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  ngAfterViewInit(): void {}

  private buildCharts(): void {
    if (!this.stats) return;
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // Line chart — candidatures par jour
    if (this.lineCanvas && this.stats.applicationsPerDay.length > 0) {
      this.charts.push(new Chart(this.lineCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: this.stats.applicationsPerDay.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          }),
          datasets: [{
            label: 'Candidatures',
            data: this.stats.applicationsPerDay.map(d => d.count),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#059669'
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      }));
    }

    // Doughnut — par statut
    if (this.doughnutCanvas && Object.keys(this.stats.applicationsByStatus).length > 0) {
      const statusColors: Record<string, string> = { Pending: '#fb923c', Reviewed: '#3b82f6', Accepted: '#059669', Rejected: '#f43f5e' };
      const statusLabels: Record<string, string> = { Pending: 'En attente', Reviewed: 'Consultee', Accepted: 'Acceptee', Rejected: 'Refusee' };
      const keys = Object.keys(this.stats.applicationsByStatus);
      this.charts.push(new Chart(this.doughnutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: keys.map(k => statusLabels[k] || k),
          datasets: [{
            data: keys.map(k => this.stats!.applicationsByStatus[k]),
            backgroundColor: keys.map(k => statusColors[k] || '#a8a29e'),
            borderWidth: 2, borderColor: '#fff'
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } } } }
      }));
    }

    // Bar — par type de contrat
    if (this.barCanvas && Object.keys(this.stats.applicationsByContract).length > 0) {
      const contractColors: Record<string, string> = { CDI: '#059669', CDD: '#3b82f6', Stage: '#a855f7', Alternance: '#fb923c', Freelance: '#06b6d4' };
      const keys = Object.keys(this.stats.applicationsByContract);
      this.charts.push(new Chart(this.barCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: keys,
          datasets: [{
            label: 'Candidatures',
            data: keys.map(k => this.stats!.applicationsByContract[k]),
            backgroundColor: keys.map(k => contractColors[k] || '#a8a29e'),
            borderRadius: 6
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      }));
    }

    // Horizontal bar — par localisation
    if (this.locationCanvas && Object.keys(this.stats.applicationsByLocation).length > 0) {
      const entries = Object.entries(this.stats.applicationsByLocation).sort((a, b) => b[1] - a[1]).slice(0, 8);
      this.charts.push(new Chart(this.locationCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{
            label: 'Candidatures',
            data: entries.map(e => e[1]),
            backgroundColor: '#065f46',
            borderRadius: 6
          }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      }));
    }
  }

  exportCsv(): void {
    if (!this.stats) return;

    let csv = 'Statistiques - La Plateforme de l\'Emploi\n\n';

    csv += 'Candidatures par jour\nDate,Nombre\n';
    this.stats.applicationsPerDay.forEach(d => {
      csv += `${new Date(d.date).toLocaleDateString('fr-FR')},${d.count}\n`;
    });

    csv += '\nCandidatures par statut\nStatut,Nombre\n';
    const statusLabels: Record<string, string> = { Pending: 'En attente', Reviewed: 'Consultee', Accepted: 'Acceptee', Rejected: 'Refusee' };
    Object.entries(this.stats.applicationsByStatus).forEach(([k, v]) => {
      csv += `${statusLabels[k] || k},${v}\n`;
    });

    csv += '\nCandidatures par type de contrat\nContrat,Nombre\n';
    Object.entries(this.stats.applicationsByContract).forEach(([k, v]) => {
      csv += `${k},${v}\n`;
    });

    csv += '\nCandidatures par localisation\nVille,Nombre\n';
    Object.entries(this.stats.applicationsByLocation).forEach(([k, v]) => {
      csv += `${k},${v}\n`;
    });

    csv += '\nTop offres\nOffre,Candidatures\n';
    this.stats.topOffers.forEach(o => {
      csv += `"${o.title}",${o.applicationCount}\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `statistiques_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  get totalApplications(): number {
    if (!this.stats) return 0;
    return Object.values(this.stats.applicationsByStatus).reduce((s, v) => s + v, 0);
  }
}
