import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Application } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-track-applications',
  imports: [RouterLink, DatePipe],
  templateUrl: './track-applications.html',
  styleUrl: './track-applications.scss',
})
export class TrackApplications implements OnInit {
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateFeaturesService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);
  companyColor = companyColor;

  applications = signal<Application[]>([]);
  loading = signal(true);
  remindingId = signal<number | null>(null);
  remindedIds = signal<Set<number>>(new Set());

  counts = computed(() => {
    const apps = this.applications();
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      reviewed: apps.filter(a => a.status === 'Reviewed').length,
      accepted: apps.filter(a => a.status === 'Accepted').length,
      rejected: apps.filter(a => a.status === 'Rejected').length,
    };
  });

  ngOnInit() {
    this.appService.trackMy().subscribe({
      next: (apps) => { this.applications.set(apps); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  getStatusClass(status: string): string {
    return { Pending: 'st-pending', Reviewed: 'st-reviewed', Accepted: 'st-accepted', Rejected: 'st-rejected' }[status] || '';
  }

  getStatusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' }[status] || status;
  }

  getStatusIcon(status: string): string {
    return { Pending: 'bi-clock', Reviewed: 'bi-eye-fill', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[status] || 'bi-circle';
  }

  daysSince(date: string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }
  canRemind(app: Application): boolean {
    return app.status === 'Pending' && this.daysSince(app.appliedAt) >= 3 && !this.remindedIds().has(app.id);
  }
  remind(app: Application) {
    this.remindingId.set(app.id);
    this.appService.remind(app.id).subscribe({
      next: (r) => { this.remindingId.set(null); this.remindedIds.update((s) => new Set(s).add(app.id)); this.toastr.success(r.message, 'Relance'); },
      error: (err) => { this.remindingId.set(null); this.toastr.error(err.error?.message || 'Erreur'); },
    });
  }

  withdraw(app: Application) {
    if (!confirm(`Retirer votre candidature pour "${app.jobOffer?.title}" ? Cette action est irreversible.`)) return;
    this.candidateService.withdrawApplication(app.id).subscribe({
      next: () => { this.toastr.success('Candidature retiree'); this.ngOnInit(); },
      error: (err) => this.toastr.error(err.error?.message || err.error || 'Erreur'),
    });
  }
}
