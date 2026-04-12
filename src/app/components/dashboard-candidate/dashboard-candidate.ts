import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';

@Component({
  selector: 'app-dashboard-candidate',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard-candidate.html',
  styleUrl: './dashboard-candidate.scss',
})
export class DashboardCandidate implements OnInit {
  private appService = inject(ApplicationService);
  auth = inject(AuthService);
  bookmarks = inject(BookmarkService);

  data = signal<any>(null);
  loading = signal(true);

  ngOnInit() {
    this.appService.getCandidateStats().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
