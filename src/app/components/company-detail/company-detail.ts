import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { CompanyReviewService, CompanyReviewSummary } from '../../services/company-review.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-company-detail',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.scss',
})
export class CompanyDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobOfferService);
  private reviewSvc = inject(CompanyReviewService);
  private toastr = inject(ToastrService);
  bookmarkService = inject(BookmarkService);
  auth = inject(AuthService);

  companyName = '';
  jobs = signal<JobOffer[]>([]);
  loading = signal(true);

  tab = signal<'jobs' | 'reviews'>('jobs');
  summary = signal<CompanyReviewSummary | null>(null);

  // Formulaire d'avis
  reviewOpen = signal(false);
  submitting = signal(false);
  reviewForm: any = { overallRating: 0, workLifeBalance: 0, payBenefits: 0, jobSecurity: 0, management: 0, culture: 0, title: '', body: '', jobTitle: '', location: '' };

  stars = [1, 2, 3, 4, 5];
  criteriaList = [
    { key: 'workLifeBalance', label: 'Équilibre vie privée / pro' },
    { key: 'payBenefits', label: 'Salaire & avantages' },
    { key: 'jobSecurity', label: 'Sécurité & évolution' },
    { key: 'management', label: 'Direction' },
    { key: 'culture', label: 'Culture d\'entreprise' },
  ];

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    this.companyName = decodeURIComponent(this.route.snapshot.paramMap.get('name') || '');
    this.jobService.getByCompany(this.companyName).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.loading.set(false);
    });
    this.loadReviews();
  }

  loadReviews() {
    this.reviewSvc.getReviews(this.companyName).subscribe((s) => this.summary.set(s));
  }

  setTab(t: 'jobs' | 'reviews') { this.tab.set(t); }

  criteriaValue(key: string): number {
    const c = this.summary()?.criteria as any;
    return c ? c[key] || 0 : 0;
  }

  /** Type d'étoile à l'index i (1..5) pour une note donnée : plein / demi / vide. */
  starType(value: number, i: number): 'full' | 'half' | 'empty' {
    if (value >= i) return 'full';
    if (value >= i - 0.5) return 'half';
    return 'empty';
  }
  distributionPct(star: number): number {
    const s = this.summary();
    if (!s || !s.count) return 0;
    return Math.round(((s.distribution?.[star] || 0) / s.count) * 100);
  }

  // ── Formulaire ──
  openReview() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour laisser un avis'); return; }
    this.reviewForm = { overallRating: 0, workLifeBalance: 0, payBenefits: 0, jobSecurity: 0, management: 0, culture: 0, title: '', body: '', jobTitle: '', location: '' };
    this.reviewOpen.set(true);
  }
  closeReview() { this.reviewOpen.set(false); }
  setStar(field: string, value: number) { this.reviewForm[field] = value; }

  submitReview() {
    if (!this.reviewForm.overallRating || !this.reviewForm.title.trim()) {
      this.toastr.warning('Une note globale et un titre sont requis');
      return;
    }
    this.submitting.set(true);
    this.reviewSvc.createReview(this.companyName, this.reviewForm).subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.reviewOpen.set(false);
        this.toastr.success(r.message, 'Avis publié');
        this.loadReviews();
        this.tab.set('reviews');
      },
      error: (err) => { this.submitting.set(false); this.toastr.error(err.error?.message || 'Erreur'); },
    });
  }
}
