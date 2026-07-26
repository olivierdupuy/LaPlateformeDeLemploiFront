import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { JobOfferService } from '../../services/job-offer';
import { JobReport } from '../../models/job-offer.model';
import { CompanyReviewService } from '../../services/company-review.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-moderation',
  imports: [DatePipe, SlicePipe, FormsModule, RouterLink],
  templateUrl: './admin-moderation.html',
  styleUrl: './admin-moderation.scss',
})
export class AdminModeration implements OnInit {
  private admin = inject(AdminService);
  private jobService = inject(JobOfferService);
  private reviewSvc = inject(CompanyReviewService);
  private toastr = inject(ToastrService);

  offers = signal<any[]>([]);
  reports = signal<JobReport[]>([]);
  companyReviews = signal<any[]>([]);
  loading = signal(true);
  activeTab = signal<string>('Pending');
  rejectNote = '';
  rejectingId = signal<number | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    if (this.activeTab() === 'Reviews') {
      this.reviewSvc.getAllReviewsAdmin().subscribe(r => { this.companyReviews.set(r); this.loading.set(false); });
    } else if (this.activeTab() === 'Reports') {
      this.jobService.getReports().subscribe(r => { this.reports.set(r); this.loading.set(false); });
    } else {
      this.admin.getModerationQueue(this.activeTab()).subscribe(o => {
        this.offers.set(o);
        this.loading.set(false);
      });
    }
  }

  switchTab(tab: string) { this.activeTab.set(tab); this.load(); }

  // ── Signalements ──
  resolveReport(id: number, status: string) {
    this.jobService.updateReport(id, status).subscribe(() => {
      this.toastr.success(status === 'Reviewed' ? 'Signalement traité' : 'Signalement rejeté');
      this.load();
    });
  }
  reportStatusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Traité', Dismissed: 'Rejeté' }[status] || status;
  }

  // ── Modération des avis entreprise ──
  moderateReview(id: number, status: string) {
    this.reviewSvc.setReviewStatus(id, status).subscribe(() => {
      this.toastr.success(status === 'Approved' ? 'Avis approuvé' : 'Avis masqué');
      this.load();
    });
  }
  reviewStars(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  approve(id: number) {
    this.admin.approveOffer(id).subscribe(() => {
      this.toastr.success('Offre approuvee');
      this.load();
    });
  }

  startReject(id: number) { this.rejectingId.set(id); this.rejectNote = ''; }
  cancelReject() { this.rejectingId.set(null); }

  confirmReject(id: number) {
    this.admin.rejectOffer(id, this.rejectNote).subscribe(() => {
      this.toastr.success('Offre rejetee');
      this.rejectingId.set(null);
      this.load();
    });
  }

  moderationLabel(status: string): string {
    return { Pending: 'En attente', Approved: 'Approuvee', Rejected: 'Rejetee' }[status] || status;
  }

  toggleFeature(id: number) {
    this.admin.toggleFeature(id).subscribe((res) => {
      this.toastr.success(res.isFeatured ? 'Mise en avant' : 'Retiree de la une');
      this.load();
    });
  }
}
