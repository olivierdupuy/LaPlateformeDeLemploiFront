import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { JobStats, DetailedStats, ChartItem } from '../../models/job-offer.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private jobService = inject(JobOfferService);

  stats = signal<JobStats>({ totalOffers: 0, totalApplications: 0, totalCompanies: 0, remoteOffers: 0 });
  detailed = signal<DetailedStats | null>(null);
  loading = signal(true);

  maxCategoryValue = computed(() => {
    const d = this.detailed();
    return d ? Math.max(...d.offersByCategory.map((i) => i.value), 1) : 1;
  });

  maxCompanyValue = computed(() => {
    const d = this.detailed();
    return d ? Math.max(...d.topCompanies.map((i) => i.value), 1) : 1;
  });

  ngOnInit() {
    this.jobService.getStats().subscribe((s) => this.stats.set(s));
    this.jobService.getDetailedStats().subscribe((d) => {
      this.detailed.set(d);
      this.loading.set(false);
    });
  }

  barWidth(value: number, max: number): string {
    return Math.round((value / max) * 100) + '%';
  }

  statusColor(label: string): string {
    return { Pending: 'var(--amber)', Reviewed: 'var(--blue, #2563eb)', Accepted: 'var(--green)', Rejected: 'var(--red)' }[label] || 'var(--slate-400)';
  }

  statusLabel(label: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' }[label] || label;
  }

  totalApps(): number {
    const d = this.detailed();
    return d ? d.appsByStatus.reduce((sum, i) => sum + i.value, 0) : 0;
  }

  donutOffset(index: number): number {
    const d = this.detailed();
    if (!d) return 25;
    const total = this.totalApps() || 1;
    let offset = 25;
    for (let i = 0; i < index; i++) {
      offset -= (d.appsByStatus[i].value / total) * 100;
    }
    return offset;
  }

  donutDash(value: number): string {
    const pct = (value / (this.totalApps() || 1)) * 100;
    return `${pct} ${100 - pct}`;
  }
}
