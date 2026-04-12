import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';

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

  maxBarValue = computed(() => {
    const d = this.data();
    if (!d || !d.candidaturesParOffre?.length) return 1;
    return Math.max(...d.candidaturesParOffre.map((i: any) => i.value), 1);
  });

  ngOnInit() {
    this.appService.getRecruiterStats().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  barWidth(value: number): string {
    return Math.round((value / this.maxBarValue()) * 100) + '%';
  }

  statusColor(label: string): string {
    return { 'En attente': 'var(--amber)', 'Examinees': 'var(--blue)', 'Acceptees': 'var(--green)', 'Refusees': 'var(--red)' }[label] || 'var(--slate-400)';
  }
}
