import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../services/company.service';
import { JobOfferService } from '../../services/job-offer.service';
import { AuthService } from '../../services/auth.service';
import { Company } from '../../models/company.model';
import { JobOffer } from '../../models/job-offer.model';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

interface ReviewResponse {
  id: number;
  rating: number;
  comment: string | null;
  interviewPosition: string | null;
  createdAt: string;
  userFullName: string;
  userInitials: string;
}

interface CompanyRating {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

@Component({
  selector: 'app-company-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.css'
})
export class CompanyDetail implements OnInit {
  company: Company | null = null;
  jobs: JobOffer[] = [];
  loading = true;
  hasSpontaneous = false;
  showSpontaneousForm = false;
  spontaneousCover = '';
  sendingSpontaneous = false;

  Math = Math;

  // Reviews
  reviews: ReviewResponse[] = [];
  companyRating: CompanyRating | null = null;
  showReviewForm = false;
  reviewRating = 5;
  reviewComment = '';
  reviewPosition = '';
  submittingReview = false;
  hasReviewed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService,
    private jobService: JobOfferService,
    public auth: AuthService,
    private http: HttpClient,
    private seo: SeoService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.companyService.getById(id).subscribe({
        next: company => {
          this.company = company;
          this.loading = false;
          this.seo.setCompany(company.name, company.description || undefined);
          this.checkSpontaneous(id);
          this.cdr.detectChanges();
          this.loadReviews(id);
          this.jobService.getAll({ pageSize: 50 }).subscribe(result => {
            this.jobs = result.items.filter(j => j.companyId === id);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.toastr.error('Entreprise introuvable');
          this.router.navigate(['/entreprises']);
        }
      });
    });
  }

  private checkSpontaneous(companyId: number): void {
    if (this.auth.isJobSeeker) {
      this.http.get<{ applied: boolean }>(`/api/spontaneous/check/${companyId}`).subscribe({
        next: res => { this.hasSpontaneous = res.applied; this.cdr.detectChanges(); },
        error: () => {}
      });
    }
  }

  sendSpontaneous(): void {
    if (!this.company) return;
    this.sendingSpontaneous = true;
    this.http.post('/api/spontaneous', { companyId: this.company.id, coverLetter: this.spontaneousCover || null }).subscribe({
      next: () => {
        this.toastr.success('Candidature spontanee envoyee !');
        this.hasSpontaneous = true;
        this.showSpontaneousForm = false;
        this.sendingSpontaneous = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || 'Erreur');
        this.sendingSpontaneous = false;
      }
    });
  }

  getContractBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage',
      'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance'
    };
    return map[type] || 'bg-secondary';
  }

  // ===================== REVIEWS =====================
  loadReviews(companyId: number): void {
    this.http.get<ReviewResponse[]>(`/api/company-reviews/${companyId}`).subscribe({
      next: reviews => {
        this.reviews = reviews;
        if (this.auth.isJobSeeker && this.auth.currentUser) {
          const fullName = `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`;
          this.hasReviewed = reviews.some(r => r.userFullName === fullName);
        }
        this.cdr.detectChanges();
      }
    });
    this.http.get<CompanyRating>(`/api/company-reviews/${companyId}/rating`).subscribe({
      next: rating => { this.companyRating = rating; this.cdr.detectChanges(); }
    });
  }

  submitReview(): void {
    if (!this.company || this.reviewRating < 1) return;
    this.submittingReview = true;
    this.http.post('/api/company-reviews', {
      companyId: this.company.id,
      rating: this.reviewRating,
      comment: this.reviewComment || null,
      interviewPosition: this.reviewPosition || null
    }).subscribe({
      next: () => {
        this.toastr.success('Avis publie !');
        this.showReviewForm = false;
        this.submittingReview = false;
        this.reviewComment = '';
        this.reviewPosition = '';
        this.reviewRating = 5;
        this.loadReviews(this.company!.id);
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || 'Erreur');
        this.submittingReview = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteReview(reviewId: number): void {
    this.http.delete(`/api/company-reviews/${reviewId}`).subscribe({
      next: () => {
        this.toastr.success('Avis supprime');
        this.hasReviewed = false;
        this.loadReviews(this.company!.id);
      }
    });
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }

  getDistPercent(star: number): number {
    if (!this.companyRating || this.companyRating.totalReviews === 0) return 0;
    return ((this.companyRating.distribution[star] || 0) / this.companyRating.totalReviews) * 100;
  }

  formatReviewDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
